import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { createHash } from "crypto";
import { Kontogruppe, KontogruppeType, Transaction } from "./types";

const DB_PATH = path.join(process.cwd(), "data", "finanzen.db");

let dbInstance: Database.Database | null = null;

function ensureColumn(
  db: Database.Database,
  table: string,
  column: string,
  definition: string
): void {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

interface Migration {
  version: number;
  description: string;
  up: (db: Database.Database) => void;
}

const migrations: Migration[] = [
  {
    version: 1,
    description: "ensureColumn-Setup (kontogruppe_id, umbuchung_override, icon, bank)",
    up: (db) => {
      ensureColumn(db, "transactions", "kontogruppe_id", "INTEGER REFERENCES kontogruppen(id)");
      ensureColumn(db, "transactions", "umbuchung_override", "INTEGER");
      ensureColumn(db, "kontogruppen", "icon", "TEXT DEFAULT 'user'");
      ensureColumn(db, "kontogruppen", "bank", "TEXT");
    },
  },
  {
    version: 2,
    description: "ai_classified column (trennt AI- von manuellen Kategorisierungen)",
    up: (db) => {
      ensureColumn(db, "transactions", "ai_classified", "INTEGER DEFAULT 0");
    },
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

function getDb(): Database.Database {
  if (dbInstance) return dbInstance;

  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      konto_bezeichnung TEXT,
      iban_konto TEXT,
      buchungstag TEXT,
      valutadatum TEXT,
      name_zahlungsbeteiligter TEXT,
      iban_zahlungsbeteiligter TEXT,
      buchungstext TEXT,
      verwendungszweck TEXT,
      betrag REAL,
      waehrung TEXT,
      saldo_nach_buchung REAL,
      kategorie TEXT,
      is_manual_override INTEGER DEFAULT 0,
      imported_at TEXT
    );

    CREATE TABLE IF NOT EXISTS kontogruppen (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL,
      color TEXT NOT NULL,
      created_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_buchungstag ON transactions(buchungstag);
    CREATE INDEX IF NOT EXISTS idx_kategorie ON transactions(kategorie);

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  runMigrations(db);

  dbInstance = db;
  return db;
}

export function computeTransactionHash(tx: Omit<Transaction, "id" | "kategorie">): string {
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
  kategorie: string;
  is_manual_override: number;
  imported_at: string;
  kontogruppe_id: number | null;
  umbuchung_override: number | null;
}

const CREDIT_CARD_NAME_PATTERNS = [
  "american express",
  "amex",
  "visa europe",
  "visa card",
  "mastercard",
  "master card",
  "diners club",
  "diners international",
];

function detectCreditCardSettlement(row: DbRow): boolean {
  if (row.betrag >= 0) return false;
  const name = (row.name_zahlungsbeteiligter || "").toLowerCase();
  return CREDIT_CARD_NAME_PATTERNS.some((p) => name.includes(p));
}

function rowToTransaction(
  row: DbRow,
  ownIbans: Set<string>,
  hasKreditkarteGroup: boolean
): Transaction {
  let isUmbuchung: boolean;
  if (row.umbuchung_override === 1) {
    isUmbuchung = true;
  } else if (row.umbuchung_override === 0) {
    isUmbuchung = false;
  } else {
    const counterIban = (row.iban_zahlungsbeteiligter || "").trim();
    const ibanMatch = counterIban.length > 0 && ownIbans.has(counterIban);
    const cardSettlement = hasKreditkarteGroup && detectCreditCardSettlement(row);
    isUmbuchung = ibanMatch || cardSettlement;
  }
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
    kategorie: row.kategorie,
    kontogruppeId: row.kontogruppe_id,
    isUmbuchung,
  };
}

function getOwnIbans(db: Database.Database): Set<string> {
  const rows = db
    .prepare("SELECT DISTINCT iban_konto FROM transactions WHERE iban_konto != ''")
    .all() as { iban_konto: string }[];
  return new Set(rows.map((r) => r.iban_konto.trim()).filter(Boolean));
}

function hasKreditkarteKontogruppe(db: Database.Database): boolean {
  const row = db
    .prepare("SELECT COUNT(*) as c FROM kontogruppen WHERE type = 'kreditkarte'")
    .get() as { c: number };
  return row.c > 0;
}

export function getAllTransactions(): Transaction[] {
  const db = getDb();
  const ownIbans = getOwnIbans(db);
  const hasKK = hasKreditkarteKontogruppe(db);
  const rows = db
    .prepare("SELECT * FROM transactions ORDER BY buchungstag DESC")
    .all() as DbRow[];
  return rows.map((r) => rowToTransaction(r, ownIbans, hasKK));
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

  const insert = db.prepare(`
    INSERT OR IGNORE INTO transactions (
      id, konto_bezeichnung, iban_konto, buchungstag, valutadatum,
      name_zahlungsbeteiligter, iban_zahlungsbeteiligter, buchungstext,
      verwendungszweck, betrag, waehrung, saldo_nach_buchung,
      kategorie, is_manual_override, imported_at, kontogruppe_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
  `);

  const now = new Date().toISOString();
  let inserted = 0;
  let skipped = 0;

  const updateGroup = db.prepare(
    "UPDATE transactions SET kontogruppe_id = ? WHERE id = ? AND kontogruppe_id IS NULL"
  );

  const tx = db.transaction((items: Transaction[]) => {
    for (const t of items) {
      const hashId = computeTransactionHash(t);

      if (checkExisting.get(hashId)) {
        if (kontogruppeId !== null) updateGroup.run(kontogruppeId, hashId);
        skipped++;
        continue;
      }

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
        t.kategorie,
        now,
        kontogruppeId
      );

      if (result.changes > 0) inserted++;
      else skipped++;
    }
  });

  tx(transactions);

  return { inserted, skipped, total: transactions.length };
}

export function updateCategory(id: string, kategorie: string): boolean {
  const db = getDb();
  const result = db
    .prepare(
      "UPDATE transactions SET kategorie = ?, is_manual_override = 1 WHERE id = ?"
    )
    .run(kategorie, id);
  return result.changes > 0;
}

export function updateCategoryByAi(id: string, kategorie: string): boolean {
  const db = getDb();
  const result = db
    .prepare(
      "UPDATE transactions SET kategorie = ?, ai_classified = 1 WHERE id = ? AND is_manual_override = 0"
    )
    .run(kategorie, id);
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
  const ownIbans = getOwnIbans(db);
  const hasKK = hasKreditkarteKontogruppe(db);
  const placeholders = ids.map(() => "?").join(",");
  const rows = db
    .prepare(`SELECT * FROM transactions WHERE id IN (${placeholders})`)
    .all(...ids) as DbRow[];
  return rows.map((r) => rowToTransaction(r, ownIbans, hasKK));
}

export function getUncategorizedIds(): string[] {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT id FROM transactions WHERE kategorie IN ('Sonstiges', 'Sonstige Einnahmen') AND is_manual_override = 0 ORDER BY buchungstag DESC"
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
  return rowToKontogruppe(row);
}

export function deleteKontogruppe(id: number): boolean {
  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare("UPDATE transactions SET kontogruppe_id = NULL WHERE kontogruppe_id = ?").run(id);
    const result = db.prepare("DELETE FROM kontogruppen WHERE id = ?").run(id);
    return result.changes > 0;
  });
  return tx() as boolean;
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
  return result.changes > 0;
}
