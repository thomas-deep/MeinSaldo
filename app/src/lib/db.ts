import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { createHash } from "crypto";
import { Kontogruppe, KontogruppeType, Transaction } from "./types";
import { categoryRules } from "./categories";
import { detectUmbuchungen, UmbuchungInput } from "./umbuchung-detection";

const DB_PATH = path.join(process.cwd(), "data", "finanzen.db");

let dbInstance: Database.Database | null = null;

interface Migration {
  version: number;
  description: string;
  up: (db: Database.Database) => void;
}

const SCHEMA_V1 = `
  CREATE TABLE kontogruppen (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL,
    color TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT 'user',
    bank TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE kategorien (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );

  CREATE TABLE transactions (
    id TEXT PRIMARY KEY,
    konto_bezeichnung TEXT NOT NULL DEFAULT '',
    iban_konto TEXT NOT NULL DEFAULT '',
    buchungstag TEXT NOT NULL,
    valutadatum TEXT NOT NULL DEFAULT '',
    name_zahlungsbeteiligter TEXT NOT NULL DEFAULT '',
    iban_zahlungsbeteiligter TEXT NOT NULL DEFAULT '',
    buchungstext TEXT NOT NULL DEFAULT '',
    verwendungszweck TEXT NOT NULL DEFAULT '',
    betrag REAL NOT NULL,
    waehrung TEXT NOT NULL DEFAULT 'EUR',
    saldo_nach_buchung REAL NOT NULL DEFAULT 0,
    kategorie_id INTEGER REFERENCES kategorien(id),
    kontogruppe_id INTEGER REFERENCES kontogruppen(id),
    is_manual_override INTEGER NOT NULL DEFAULT 0,
    ai_classified INTEGER NOT NULL DEFAULT 0,
    is_umbuchung INTEGER NOT NULL DEFAULT 0,
    umbuchung_override INTEGER,
    imported_at TEXT NOT NULL
  );

  CREATE INDEX idx_transactions_buchungstag ON transactions(buchungstag);
  CREATE INDEX idx_transactions_kategorie ON transactions(kategorie_id);
  CREATE INDEX idx_transactions_kontogruppe ON transactions(kontogruppe_id);
  CREATE INDEX idx_transactions_betrag ON transactions(betrag);

  CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`;

const migrations: Migration[] = [
  {
    version: 1,
    description: "Initial schema (kategorien-FK, is_umbuchung materialisiert)",
    up: (db) => db.exec(SCHEMA_V1),
  },
];

function runMigrations(db: Database.Database): void {
  db.exec(
    "CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)"
  );
  const applied = new Set(
    (
      db
        .prepare("SELECT version FROM schema_migrations")
        .all() as { version: number }[]
    ).map((r) => r.version)
  );
  const record = db.prepare(
    "INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)"
  );
  for (const m of migrations) {
    if (applied.has(m.version)) continue;
    const tx = db.transaction(() => {
      m.up(db);
      record.run(m.version, new Date().toISOString());
    });
    tx();
  }
}

function syncKategorien(db: Database.Database): void {
  const insert = db.prepare(
    "INSERT OR IGNORE INTO kategorien (name) VALUES (?)"
  );
  const tx = db.transaction(() => {
    for (const rule of categoryRules) insert.run(rule.kategorie);
    insert.run("Sonstige Einnahmen");
    insert.run("Sonstiges");
  });
  tx();
}

function getDb(): Database.Database {
  if (dbInstance) return dbInstance;

  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  runMigrations(db);
  syncKategorien(db);

  dbInstance = db;
  return db;
}

export function computeTransactionHash(
  tx: Omit<Transaction, "id" | "kategorie">
): string {
  const key = [
    tx.buchungstag,
    tx.valutadatum,
    tx.betrag.toFixed(2),
    tx.ibanZahlungsbeteiligter,
    tx.nameZahlungsbeteiligter,
    tx.verwendungszweck,
    tx.ibanKonto,
    tx.saldoNachBuchung.toFixed(2),
  ].join("|");
  return createHash("sha256").update(key).digest("hex").substring(0, 16);
}

interface DbRow {
  id: string;
  konto_bezeichnung: string;
  iban_konto: string;
  buchungstag: string;
  valutadatum: string;
  name_zahlungsbeteiligter: string;
  iban_zahlungsbeteiligter: string;
  buchungstext: string;
  verwendungszweck: string;
  betrag: number;
  waehrung: string;
  saldo_nach_buchung: number;
  kategorie: string | null;
  kontogruppe_id: number | null;
  is_umbuchung: number;
  umbuchung_override: number | null;
}

const SELECT_COLS = `
  t.id, t.konto_bezeichnung, t.iban_konto, t.buchungstag, t.valutadatum,
  t.name_zahlungsbeteiligter, t.iban_zahlungsbeteiligter, t.buchungstext,
  t.verwendungszweck, t.betrag, t.waehrung, t.saldo_nach_buchung,
  k.name AS kategorie,
  t.kontogruppe_id, t.is_umbuchung, t.umbuchung_override
`;

function rowToTransaction(row: DbRow): Transaction {
  const isUmbuchung =
    row.umbuchung_override === null
      ? row.is_umbuchung === 1
      : row.umbuchung_override === 1;
  return {
    id: row.id,
    kontoBezeichnung: row.konto_bezeichnung,
    ibanKonto: row.iban_konto,
    buchungstag: row.buchungstag,
    valutadatum: row.valutadatum,
    nameZahlungsbeteiligter: row.name_zahlungsbeteiligter,
    ibanZahlungsbeteiligter: row.iban_zahlungsbeteiligter,
    buchungstext: row.buchungstext,
    verwendungszweck: row.verwendungszweck,
    betrag: row.betrag,
    waehrung: row.waehrung,
    saldoNachBuchung: row.saldo_nach_buchung,
    kategorie: row.kategorie ?? "Sonstiges",
    kontogruppeId: row.kontogruppe_id,
    isUmbuchung,
  };
}

function getKategorieId(db: Database.Database, name: string): number {
  const row = db
    .prepare("SELECT id FROM kategorien WHERE name = ?")
    .get(name) as { id: number } | undefined;
  if (row) return row.id;
  const result = db
    .prepare("INSERT INTO kategorien (name) VALUES (?)")
    .run(name);
  return result.lastInsertRowid as number;
}

export function getAllKategorien(): { id: number; name: string }[] {
  const db = getDb();
  return db
    .prepare("SELECT id, name FROM kategorien ORDER BY name")
    .all() as { id: number; name: string }[];
}

interface UmbuchungRow {
  id: string;
  buchungstag: string;
  betrag: number;
  iban_konto: string;
  iban_zahlungsbeteiligter: string;
  name_zahlungsbeteiligter: string;
  kontogruppe_id: number | null;
}

function recomputeUmbuchungen(db: Database.Database): void {
  const rows = db
    .prepare(
      `SELECT id, buchungstag, betrag, iban_konto, iban_zahlungsbeteiligter,
              name_zahlungsbeteiligter, kontogruppe_id
       FROM transactions`
    )
    .all() as UmbuchungRow[];

  const inputs: UmbuchungInput[] = rows.map((r) => ({
    id: r.id,
    buchungstag: r.buchungstag,
    betrag: r.betrag,
    ibanKonto: r.iban_konto,
    ibanZahlungsbeteiligter: r.iban_zahlungsbeteiligter,
    nameZahlungsbeteiligter: r.name_zahlungsbeteiligter,
    kontogruppeId: r.kontogruppe_id,
  }));

  const hasKreditkarte =
    (
      db
        .prepare(
          "SELECT COUNT(*) AS c FROM kontogruppen WHERE type = 'kreditkarte'"
        )
        .get() as { c: number }
    ).c > 0;

  const matched = detectUmbuchungen(inputs, {
    hasKreditkarteGroup: hasKreditkarte,
  });

  const reset = db.prepare("UPDATE transactions SET is_umbuchung = 0");
  const mark = db.prepare(
    "UPDATE transactions SET is_umbuchung = 1 WHERE id = ?"
  );
  const tx = db.transaction(() => {
    reset.run();
    for (const id of matched) mark.run(id);
  });
  tx();
}

export function getAllTransactions(): Transaction[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT ${SELECT_COLS} FROM transactions t
       LEFT JOIN kategorien k ON k.id = t.kategorie_id
       ORDER BY t.buchungstag DESC, t.id DESC`
    )
    .all() as DbRow[];
  return rows.map(rowToTransaction);
}

export function setUmbuchungOverride(
  id: string,
  override: boolean | null
): boolean {
  const db = getDb();
  const value = override === null ? null : override ? 1 : 0;
  const result = db
    .prepare("UPDATE transactions SET umbuchung_override = ? WHERE id = ?")
    .run(value, id);
  return result.changes > 0;
}

export interface InsertResult {
  inserted: number;
  skipped: number;
  total: number;
}

export function insertTransactions(
  transactions: Transaction[],
  kontogruppeId: number | null
): InsertResult {
  const db = getDb();

  const checkExisting = db.prepare("SELECT id FROM transactions WHERE id = ?");
  const updateGroup = db.prepare(
    "UPDATE transactions SET kontogruppe_id = ? WHERE id = ? AND kontogruppe_id IS NULL"
  );
  const insert = db.prepare(`
    INSERT OR IGNORE INTO transactions (
      id, konto_bezeichnung, iban_konto, buchungstag, valutadatum,
      name_zahlungsbeteiligter, iban_zahlungsbeteiligter, buchungstext,
      verwendungszweck, betrag, waehrung, saldo_nach_buchung,
      kategorie_id, kontogruppe_id, imported_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const kategorieCache = new Map<string, number>();
  function resolveKategorie(name: string): number {
    const cached = kategorieCache.get(name);
    if (cached !== undefined) return cached;
    const id = getKategorieId(db, name);
    kategorieCache.set(name, id);
    return id;
  }

  const now = new Date().toISOString();
  let inserted = 0;
  let skipped = 0;

  const tx = db.transaction((items: Transaction[]) => {
    for (const t of items) {
      const hashId = computeTransactionHash(t);

      if (checkExisting.get(hashId)) {
        if (kontogruppeId !== null) updateGroup.run(kontogruppeId, hashId);
        skipped++;
        continue;
      }

      const kategorieId = resolveKategorie(t.kategorie || "Sonstiges");
      const result = insert.run(
        hashId,
        t.kontoBezeichnung,
        t.ibanKonto,
        t.buchungstag,
        t.valutadatum,
        t.nameZahlungsbeteiligter,
        t.ibanZahlungsbeteiligter,
        t.buchungstext,
        t.verwendungszweck,
        t.betrag,
        t.waehrung,
        t.saldoNachBuchung,
        kategorieId,
        kontogruppeId,
        now
      );

      if (result.changes > 0) inserted++;
      else skipped++;
    }
  });

  tx(transactions);
  recomputeUmbuchungen(db);

  return { inserted, skipped, total: transactions.length };
}

export function updateCategory(id: string, kategorie: string): boolean {
  const db = getDb();
  const kategorieId = getKategorieId(db, kategorie);
  const result = db
    .prepare(
      "UPDATE transactions SET kategorie_id = ?, is_manual_override = 1 WHERE id = ?"
    )
    .run(kategorieId, id);
  return result.changes > 0;
}

export function updateCategoryByAi(id: string, kategorie: string): boolean {
  const db = getDb();
  const kategorieId = getKategorieId(db, kategorie);
  const result = db
    .prepare(
      "UPDATE transactions SET kategorie_id = ?, ai_classified = 1 WHERE id = ? AND is_manual_override = 0"
    )
    .run(kategorieId, id);
  return result.changes > 0;
}

export function clearAll(): number {
  const db = getDb();
  const result = db.prepare("DELETE FROM transactions").run();
  return result.changes;
}

export function getSetting(key: string): string | null {
  const db = getDb();
  const row = db
    .prepare("SELECT value FROM settings WHERE key = ?")
    .get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setSetting(key: string, value: string | null): void {
  const db = getDb();
  if (value === null) {
    db.prepare("DELETE FROM settings WHERE key = ?").run(key);
  } else {
    db.prepare(
      "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    ).run(key, value);
  }
}

export function getAllSettings(): Record<string, string> {
  const db = getDb();
  const rows = db.prepare("SELECT key, value FROM settings").all() as {
    key: string;
    value: string;
  }[];
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export function getTransactionsByIds(ids: string[]): Transaction[] {
  if (ids.length === 0) return [];
  const db = getDb();
  const placeholders = ids.map(() => "?").join(",");
  const rows = db
    .prepare(
      `SELECT ${SELECT_COLS} FROM transactions t
       LEFT JOIN kategorien k ON k.id = t.kategorie_id
       WHERE t.id IN (${placeholders})`
    )
    .all(...ids) as DbRow[];
  return rows.map(rowToTransaction);
}

export function getUncategorizedIds(): string[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT t.id FROM transactions t
       LEFT JOIN kategorien k ON k.id = t.kategorie_id
       WHERE (k.name IN ('Sonstiges', 'Sonstige Einnahmen') OR k.name IS NULL)
         AND t.is_manual_override = 0
       ORDER BY t.buchungstag DESC`
    )
    .all() as { id: string }[];
  return rows.map((r) => r.id);
}

export function getStats(): {
  count: number;
  earliest: string | null;
  latest: string | null;
} {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT COUNT(*) as count, MIN(buchungstag) as earliest, MAX(buchungstag) as latest FROM transactions`
    )
    .get() as { count: number; earliest: string | null; latest: string | null };
  return row;
}

interface KontogruppeRow {
  id: number;
  name: string;
  type: KontogruppeType;
  color: string;
  icon: string | null;
  bank: string | null;
  created_at: string;
}

function rowToKontogruppe(row: KontogruppeRow): Kontogruppe {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    color: row.color,
    icon: row.icon || "user",
    bank: row.bank ?? undefined,
    createdAt: row.created_at,
  };
}

export function getAllKontogruppen(): Kontogruppe[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM kontogruppen ORDER BY id ASC")
    .all() as KontogruppeRow[];
  return rows.map(rowToKontogruppe);
}

export function createKontogruppe(
  name: string,
  type: KontogruppeType,
  color: string,
  icon: string,
  bank: string | null
): Kontogruppe {
  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO kontogruppen (name, type, color, icon, bank, created_at) VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(name, type, color, icon, bank, new Date().toISOString());
  const row = db
    .prepare("SELECT * FROM kontogruppen WHERE id = ?")
    .get(result.lastInsertRowid) as KontogruppeRow;
  recomputeUmbuchungen(db);
  return rowToKontogruppe(row);
}

export function deleteKontogruppe(id: number): boolean {
  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare(
      "UPDATE transactions SET kontogruppe_id = NULL WHERE kontogruppe_id = ?"
    ).run(id);
    const result = db.prepare("DELETE FROM kontogruppen WHERE id = ?").run(id);
    return result.changes > 0;
  });
  const ok = tx() as boolean;
  if (ok) recomputeUmbuchungen(db);
  return ok;
}

export function updateKontogruppe(
  id: number,
  name: string,
  type: KontogruppeType,
  color: string,
  icon: string,
  bank: string | null
): boolean {
  const db = getDb();
  const result = db
    .prepare(
      "UPDATE kontogruppen SET name = ?, type = ?, color = ?, icon = ?, bank = ? WHERE id = ?"
    )
    .run(name, type, color, icon, bank, id);
  if (result.changes > 0) recomputeUmbuchungen(db);
  return result.changes > 0;
}
