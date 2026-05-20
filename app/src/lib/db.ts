import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { createHash } from "crypto";
import {
  Inhaber,
  InhaberType,
  Kontogruppe,
  KontogruppeArt,
  Tag,
  Transaction,
} from "./types";
import { categoryRules } from "./categories";
import { detectUmbuchungen, UmbuchungInput } from "./umbuchung-detection";

function resolveDbPath(): string {
  return (
    process.env.FINANZEN_DB_PATH ||
    path.join(process.cwd(), "data", "finanzen.db")
  );
}

let dbInstance: Database.Database | null = null;

/** Test-Hilfe: schließt die DB und vergisst das Singleton, damit der nächste
 * `getDb()`-Aufruf eine frische Instanz öffnet. Nur in Tests verwenden. */
export function __resetDbForTests(): void {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {
      // ignore
    }
    dbInstance = null;
  }
}

interface Migration {
  version: number;
  description: string;
  up: (db: Database.Database) => void;
}

/**
 * Konsolidiertes Initial-Schema. Alle vorherigen Migrationen (v1-v4) sind
 * in dieses Schema eingeflossen; in einer Greenfield-DB läuft nur noch v1.
 * Neue Schema-Änderungen kommen als zusätzliche Migrationen ans Ende.
 */
const SCHEMA_V1 = `
  CREATE TABLE inhaber (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL,
    color TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 999,
    created_at TEXT NOT NULL
  );

  CREATE TABLE kontogruppen (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    inhaber_id INTEGER NOT NULL REFERENCES inhaber(id) ON DELETE RESTRICT,
    art TEXT NOT NULL DEFAULT 'girokonto',
    color TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT 'user',
    bank TEXT,
    sort_order INTEGER NOT NULL DEFAULT 999,
    created_at TEXT NOT NULL,
    UNIQUE(inhaber_id, name)
  );
  CREATE INDEX idx_kontogruppen_inhaber ON kontogruppen(inhaber_id);

  CREATE TABLE kategorien (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    rule_order INTEGER NOT NULL DEFAULT 999,
    keywords TEXT NOT NULL DEFAULT '[]',
    name_patterns TEXT NOT NULL DEFAULT '[]',
    direction TEXT NOT NULL DEFAULT 'beide'
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
    source_file TEXT,
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

  CREATE TABLE logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    level TEXT NOT NULL,
    event TEXT NOT NULL,
    message TEXT NOT NULL,
    details TEXT
  );
  CREATE INDEX idx_logs_created ON logs(created_at);
  CREATE INDEX idx_logs_event ON logs(event);
`;

const migrations: Migration[] = [
  {
    version: 1,
    description:
      "Initial schema (Kategorien-FK, materialisiertes is_umbuchung, Logs, Kontogruppen mit type+art)",
    up: (db) => db.exec(SCHEMA_V1),
  },
  {
    version: 2,
    description: "Kategorien: direction-Spalte (einnahme/ausgabe/beide)",
    up: (db) => {
      ensureColumn(db, "kategorien", "direction", "TEXT NOT NULL DEFAULT 'beide'");
      const update = db.prepare(
        "UPDATE kategorien SET direction = ? WHERE name = ?"
      );
      for (const rule of categoryRules) {
        update.run(rule.direction, rule.kategorie);
      }
      update.run("einnahme", "Sonstige Einnahmen");
      update.run("ausgabe", "Sonstiges");
    },
  },
  {
    version: 3,
    description: "Inhaber + Kontogruppen: sort_order-Spalten für DnD",
    up: (db) => {
      ensureColumn(db, "inhaber", "sort_order", "INTEGER NOT NULL DEFAULT 999");
      ensureColumn(db, "kontogruppen", "sort_order", "INTEGER NOT NULL DEFAULT 999");
      db.exec(
        "UPDATE inhaber SET sort_order = id WHERE sort_order = 999"
      );
      db.exec(
        "UPDATE kontogruppen SET sort_order = id WHERE sort_order = 999"
      );
    },
  },
  {
    version: 4,
    description: "transactions: source_file (CSV-Dateiname pro Import)",
    up: (db) => {
      ensureColumn(db, "transactions", "source_file", "TEXT");
    },
  },
  {
    version: 5,
    description:
      "FTS5-Volltextindex über verwendungszweck/name/buchungstext + Sync-Trigger",
    up: (db) => {
      db.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS transactions_fts USING fts5(
          verwendungszweck,
          name_zahlungsbeteiligter,
          buchungstext,
          content='transactions',
          content_rowid='rowid',
          tokenize='unicode61 remove_diacritics 2'
        );

        CREATE TRIGGER IF NOT EXISTS transactions_ai_fts AFTER INSERT ON transactions BEGIN
          INSERT INTO transactions_fts(rowid, verwendungszweck, name_zahlungsbeteiligter, buchungstext)
          VALUES (new.rowid, new.verwendungszweck, new.name_zahlungsbeteiligter, new.buchungstext);
        END;

        CREATE TRIGGER IF NOT EXISTS transactions_ad_fts AFTER DELETE ON transactions BEGIN
          INSERT INTO transactions_fts(transactions_fts, rowid, verwendungszweck, name_zahlungsbeteiligter, buchungstext)
          VALUES ('delete', old.rowid, old.verwendungszweck, old.name_zahlungsbeteiligter, old.buchungstext);
        END;

        CREATE TRIGGER IF NOT EXISTS transactions_au_fts AFTER UPDATE ON transactions BEGIN
          INSERT INTO transactions_fts(transactions_fts, rowid, verwendungszweck, name_zahlungsbeteiligter, buchungstext)
          VALUES ('delete', old.rowid, old.verwendungszweck, old.name_zahlungsbeteiligter, old.buchungstext);
          INSERT INTO transactions_fts(rowid, verwendungszweck, name_zahlungsbeteiligter, buchungstext)
          VALUES (new.rowid, new.verwendungszweck, new.name_zahlungsbeteiligter, new.buchungstext);
        END;

        INSERT INTO transactions_fts(rowid, verwendungszweck, name_zahlungsbeteiligter, buchungstext)
        SELECT rowid, verwendungszweck, name_zahlungsbeteiligter, buchungstext
        FROM transactions
        WHERE rowid NOT IN (SELECT rowid FROM transactions_fts);
      `);
    },
  },
  {
    version: 6,
    description: "Tags + transaction_tags (many-to-many)",
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS tags (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          color TEXT NOT NULL DEFAULT '#6b7280',
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS transaction_tags (
          transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
          tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
          PRIMARY KEY (transaction_id, tag_id)
        );

        CREATE INDEX IF NOT EXISTS idx_transaction_tags_tag
          ON transaction_tags(tag_id);
      `);
    },
  },
];

const MAX_LOG_ENTRIES = 5000;

export type LogLevel = "info" | "warn" | "error";

export interface LogEntry {
  id: number;
  createdAt: string;
  level: LogLevel;
  event: string;
  message: string;
  details: string | null;
}

export function logEvent(
  level: LogLevel,
  event: string,
  message: string,
  details?: unknown
): void {
  const db = getDb();
  const detailsJson =
    details === undefined ? null : JSON.stringify(details);
  db.prepare(
    "INSERT INTO logs (created_at, level, event, message, details) VALUES (?, ?, ?, ?, ?)"
  ).run(new Date().toISOString(), level, event, message, detailsJson);
}

export function getLogs(limit = 200, offset = 0): LogEntry[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, created_at, level, event, message, details
       FROM logs ORDER BY id DESC LIMIT ? OFFSET ?`
    )
    .all(limit, offset) as {
    id: number;
    created_at: string;
    level: LogLevel;
    event: string;
    message: string;
    details: string | null;
  }[];
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    level: r.level,
    event: r.event,
    message: r.message,
    details: r.details,
  }));
}

export function countLogs(): number {
  const db = getDb();
  const row = db.prepare("SELECT COUNT(*) AS c FROM logs").get() as {
    c: number;
  };
  return row.c;
}

export function clearLogs(): number {
  const db = getDb();
  const result = db.prepare("DELETE FROM logs").run();
  return result.changes;
}

export function trimLogs(maxEntries = MAX_LOG_ENTRIES): void {
  const db = getDb();
  const row = db.prepare("SELECT COUNT(*) AS c FROM logs").get() as {
    c: number;
  };
  if (row.c <= maxEntries) return;
  db.prepare(
    `DELETE FROM logs WHERE id IN (
       SELECT id FROM logs ORDER BY id ASC LIMIT ?
     )`
  ).run(row.c - maxEntries);
}

function columnExists(
  db: Database.Database,
  table: string,
  column: string
): boolean {
  const rows = db
    .prepare(`PRAGMA table_info(${table})`)
    .all() as { name: string }[];
  return rows.some((r) => r.name === column);
}

function ensureColumn(
  db: Database.Database,
  table: string,
  column: string,
  definition: string
): void {
  if (!columnExists(db, table, column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

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
    "INSERT OR IGNORE INTO kategorien (name, rule_order, keywords, name_patterns, direction) VALUES (?, ?, ?, ?, ?)"
  );
  const tx = db.transaction(() => {
    categoryRules.forEach((rule, idx) => {
      insert.run(
        rule.kategorie,
        idx,
        JSON.stringify(rule.keywords),
        JSON.stringify(rule.namePatterns),
        rule.direction
      );
    });
    // Fallback-Kategorien — keine Rules, hohe Ordnung (immer am Ende)
    insert.run("Sonstige Einnahmen", 9000, "[]", "[]", "einnahme");
    insert.run("Sonstiges", 9001, "[]", "[]", "ausgabe");
  });
  tx();
}

function getDb(): Database.Database {
  if (dbInstance) return dbInstance;

  const dbPath = resolveDbPath();
  if (dbPath !== ":memory:") {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(dbPath);
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
    .prepare(
      "SELECT id, name FROM kategorien ORDER BY rule_order ASC, name ASC"
    )
    .all() as { id: number; name: string }[];
}

export type KategorieDirection = "einnahme" | "ausgabe" | "beide";

export interface KategorieRule {
  id: number;
  name: string;
  ruleOrder: number;
  keywords: string[];
  namePatterns: string[];
  direction: KategorieDirection;
  isFallback: boolean;
}

function parseDirection(v: string | null): KategorieDirection {
  return v === "einnahme" || v === "ausgabe" || v === "beide" ? v : "beide";
}

function parseJsonArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter((v): v is string => typeof v === "string");
    }
  } catch {
    // ignore
  }
  return [];
}

const FALLBACK_NAMES = new Set(["Sonstiges", "Sonstige Einnahmen"]);

export function getKategorieRules(): KategorieRule[] {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT id, name, rule_order, keywords, name_patterns, direction FROM kategorien ORDER BY rule_order ASC, id ASC"
    )
    .all() as {
    id: number;
    name: string;
    rule_order: number;
    keywords: string | null;
    name_patterns: string | null;
    direction: string | null;
  }[];
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    ruleOrder: r.rule_order,
    keywords: parseJsonArray(r.keywords),
    namePatterns: parseJsonArray(r.name_patterns),
    direction: parseDirection(r.direction),
    isFallback: FALLBACK_NAMES.has(r.name),
  }));
}

export function updateKategorieRule(
  id: number,
  patch: {
    name?: string;
    keywords?: string[];
    namePatterns?: string[];
    ruleOrder?: number;
    direction?: KategorieDirection;
  }
): boolean {
  const db = getDb();
  const fields: string[] = [];
  const values: (string | number)[] = [];
  if (patch.name !== undefined) {
    fields.push("name = ?");
    values.push(patch.name);
  }
  if (patch.keywords !== undefined) {
    fields.push("keywords = ?");
    values.push(JSON.stringify(patch.keywords));
  }
  if (patch.namePatterns !== undefined) {
    fields.push("name_patterns = ?");
    values.push(JSON.stringify(patch.namePatterns));
  }
  if (patch.ruleOrder !== undefined) {
    fields.push("rule_order = ?");
    values.push(patch.ruleOrder);
  }
  if (patch.direction !== undefined) {
    fields.push("direction = ?");
    values.push(patch.direction);
  }
  if (fields.length === 0) return false;
  values.push(id);
  const result = db
    .prepare(`UPDATE kategorien SET ${fields.join(", ")} WHERE id = ?`)
    .run(...values);
  return result.changes > 0;
}

export function createKategorieRule(
  name: string,
  keywords: string[] = [],
  namePatterns: string[] = [],
  direction: KategorieDirection = "beide"
): KategorieRule {
  const db = getDb();
  // Neue User-Kategorien werden ans Ende sortiert, aber vor die Fallbacks
  const max = db
    .prepare(
      "SELECT MAX(rule_order) AS m FROM kategorien WHERE name NOT IN ('Sonstiges', 'Sonstige Einnahmen')"
    )
    .get() as { m: number | null };
  const order = (max.m ?? -1) + 1;
  const result = db
    .prepare(
      "INSERT INTO kategorien (name, rule_order, keywords, name_patterns, direction) VALUES (?, ?, ?, ?, ?)"
    )
    .run(
      name,
      order,
      JSON.stringify(keywords),
      JSON.stringify(namePatterns),
      direction
    );
  return {
    id: result.lastInsertRowid as number,
    name,
    ruleOrder: order,
    keywords,
    namePatterns,
    direction,
    isFallback: false,
  };
}

export function deleteKategorieRule(id: number): boolean {
  const db = getDb();
  const row = db
    .prepare("SELECT name FROM kategorien WHERE id = ?")
    .get(id) as { name: string } | undefined;
  if (!row) return false;
  if (FALLBACK_NAMES.has(row.name)) {
    throw new Error("Fallback-Kategorien können nicht gelöscht werden");
  }
  // Setze betroffene Transactions auf Sonstiges/Sonstige Einnahmen — Modell-Frage
  // simplify: setze kategorie_id auf NULL → rowToTransaction macht 'Sonstiges'
  const tx = db.transaction(() => {
    db.prepare(
      "UPDATE transactions SET kategorie_id = NULL WHERE kategorie_id = ?"
    ).run(id);
    return (
      db.prepare("DELETE FROM kategorien WHERE id = ?").run(id).changes > 0
    );
  });
  return tx() as boolean;
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

export function recomputeUmbuchungenAll(): number {
  const db = getDb();
  recomputeUmbuchungen(db);
  const row = db
    .prepare("SELECT COUNT(*) AS c FROM transactions WHERE is_umbuchung = 1")
    .get() as { c: number };
  return row.c;
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
          "SELECT COUNT(*) AS c FROM kontogruppen WHERE art = 'kreditkarte'"
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

function attachTags(transactions: Transaction[]): Transaction[] {
  if (transactions.length === 0) return transactions;
  const db = getDb();
  const placeholders = transactions.map(() => "?").join(",");
  const rows = db
    .prepare(
      `SELECT tt.transaction_id, t.id, t.name, t.color
       FROM transaction_tags tt
       JOIN tags t ON t.id = tt.tag_id
       WHERE tt.transaction_id IN (${placeholders})
       ORDER BY t.name COLLATE NOCASE`
    )
    .all(...transactions.map((t) => t.id)) as {
    transaction_id: string;
    id: number;
    name: string;
    color: string;
  }[];
  const byTx = new Map<string, Tag[]>();
  for (const r of rows) {
    const list = byTx.get(r.transaction_id) ?? [];
    list.push({ id: r.id, name: r.name, color: r.color });
    byTx.set(r.transaction_id, list);
  }
  for (const t of transactions) {
    t.tags = byTx.get(t.id) ?? [];
  }
  return transactions;
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
  return attachTags(rows.map(rowToTransaction));
}

export function getAllTags(): Tag[] {
  const db = getDb();
  return db
    .prepare("SELECT id, name, color FROM tags ORDER BY name COLLATE NOCASE")
    .all() as Tag[];
}

export function createTag(name: string, color: string): Tag {
  const db = getDb();
  const info = db
    .prepare(
      "INSERT INTO tags (name, color, created_at) VALUES (?, ?, ?)"
    )
    .run(name, color, new Date().toISOString());
  return { id: Number(info.lastInsertRowid), name, color };
}

export function updateTag(id: number, name: string, color: string): boolean {
  const db = getDb();
  const info = db
    .prepare("UPDATE tags SET name = ?, color = ? WHERE id = ?")
    .run(name, color, id);
  return info.changes > 0;
}

export function deleteTag(id: number): boolean {
  const db = getDb();
  const info = db.prepare("DELETE FROM tags WHERE id = ?").run(id);
  return info.changes > 0;
}

export function setTagsForTransaction(
  transactionId: string,
  tagIds: number[]
): void {
  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM transaction_tags WHERE transaction_id = ?").run(
      transactionId
    );
    const insert = db.prepare(
      "INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (?, ?)"
    );
    for (const tagId of tagIds) insert.run(transactionId, tagId);
  });
  tx();
}

export function addTagToTransactions(
  transactionIds: string[],
  tagId: number
): number {
  const db = getDb();
  const insert = db.prepare(
    "INSERT OR IGNORE INTO transaction_tags (transaction_id, tag_id) VALUES (?, ?)"
  );
  let added = 0;
  const tx = db.transaction(() => {
    for (const id of transactionIds) {
      const info = insert.run(id, tagId);
      if (info.changes > 0) added++;
    }
  });
  tx();
  return added;
}

export function removeTagFromTransactions(
  transactionIds: string[],
  tagId: number
): number {
  if (transactionIds.length === 0) return 0;
  const db = getDb();
  const placeholders = transactionIds.map(() => "?").join(",");
  const info = db
    .prepare(
      `DELETE FROM transaction_tags WHERE tag_id = ? AND transaction_id IN (${placeholders})`
    )
    .run(tagId, ...transactionIds);
  return info.changes;
}

/** Baut aus einer User-Anfrage einen FTS5-MATCH-Ausdruck mit Prefix-Suche pro
 * Token. Sonderzeichen werden so behandelt, dass FTS5-Syntax nicht versehentlich
 * getriggert wird. Leere Anfrage → null (Aufrufer soll dann keine Suche machen). */
export function buildFtsQuery(raw: string): string | null {
  const tokens = raw
    .split(/\s+/)
    .map((t) => t.replace(/["*()]/g, "").trim())
    .filter((t) => t.length >= 2);
  if (tokens.length === 0) return null;
  return tokens.map((t) => `"${t}"*`).join(" ");
}

export function searchTransactions(
  rawQuery: string,
  limit = 100
): Transaction[] {
  const query = buildFtsQuery(rawQuery);
  if (!query) return [];
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT ${SELECT_COLS} FROM transactions t
       JOIN transactions_fts fts ON fts.rowid = t.rowid
       LEFT JOIN kategorien k ON k.id = t.kategorie_id
       WHERE transactions_fts MATCH ?
       ORDER BY rank
       LIMIT ?`
    )
    .all(query, limit) as DbRow[];
  return attachTags(rows.map(rowToTransaction));
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
  insertedIds: string[];
}

export function insertTransactions(
  transactions: Transaction[],
  kontogruppeId: number | null,
  sourceFile: string | null = null
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
      kategorie_id, kontogruppe_id, source_file, imported_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
  const insertedIds: string[] = [];

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
        sourceFile,
        now
      );

      if (result.changes > 0) {
        inserted++;
        insertedIds.push(hashId);
      } else {
        skipped++;
      }
    }
  });

  tx(transactions);
  recomputeUmbuchungen(db);

  return { inserted, skipped, total: transactions.length, insertedIds };
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

export function updateCategoryByAi(
  id: string,
  kategorie: string,
  force = false
): boolean {
  const db = getDb();
  const kategorieId = getKategorieId(db, kategorie);
  // Im Force-Modus wird is_manual_override zurückgesetzt — User-getriebene
  // Mehrfach-Auswahl signalisiert explizit „AI soll übernehmen".
  const sql = force
    ? "UPDATE transactions SET kategorie_id = ?, ai_classified = 1, is_manual_override = 0 WHERE id = ?"
    : "UPDATE transactions SET kategorie_id = ?, ai_classified = 1 WHERE id = ? AND is_manual_override = 0";
  const result = db.prepare(sql).run(kategorieId, id);
  return result.changes > 0;
}

/**
 * Wendet die Kategorie-Regeln auf alle (oder nur uneingestufte) Transaktionen
 * an. Manuelle Overrides bleiben erhalten.
 * @param onlySonstiges — wenn true, nur Buchungen mit Kategorie "Sonstiges" /
 *   "Sonstige Einnahmen" (klassisches Fallback-Reset).
 */
export function recategorizeAllByRules(onlySonstiges: boolean): {
  total: number;
  updated: number;
} {
  const db = getDb();
  const rules = getKategorieRules().filter((r) => !r.isFallback);
  const filter = onlySonstiges
    ? "AND (k.name = 'Sonstiges' OR k.name = 'Sonstige Einnahmen')"
    : "";
  const rows = db
    .prepare(
      `SELECT ${SELECT_COLS} FROM transactions t
       LEFT JOIN kategorien k ON k.id = t.kategorie_id
       WHERE t.is_manual_override = 0 ${filter}`
    )
    .all() as DbRow[];

  let updated = 0;
  const update = db.prepare(
    "UPDATE transactions SET kategorie_id = ?, ai_classified = 0 WHERE id = ?"
  );
  const fallbackEinnahme = getKategorieId(db, "Sonstige Einnahmen");
  const fallbackAusgabe = getKategorieId(db, "Sonstiges");
  const tx = db.transaction(() => {
    for (const row of rows) {
      const t = rowToTransaction(row);
      const direction = t.betrag >= 0 ? "einnahme" : "ausgabe";
      let matched: string | null = null;
      for (const rule of rules) {
        if (rule.direction !== "beide" && rule.direction !== direction)
          continue;
        const searchText = `${t.verwendungszweck} ${t.nameZahlungsbeteiligter} ${t.buchungstext}`.toLowerCase();
        const counterparty = t.nameZahlungsbeteiligter.toLowerCase();
        const hit =
          rule.keywords.some(
            (k) => k && searchText.includes(k.toLowerCase())
          ) ||
          rule.namePatterns.some((p) => {
            if (!p) return false;
            const pl = p.toLowerCase();
            return counterparty.includes(pl) || searchText.includes(pl);
          });
        if (hit) {
          matched = rule.name;
          break;
        }
      }
      const newKategorieId =
        matched != null
          ? getKategorieId(db, matched)
          : t.betrag > 0
            ? fallbackEinnahme
            : fallbackAusgabe;
      const r = update.run(newKategorieId, t.id);
      if (r.changes > 0) updated++;
    }
  });
  tx();
  return { total: rows.length, updated };
}

export function getAllUncategorizedIds(): string[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT t.id FROM transactions t
       LEFT JOIN kategorien k ON k.id = t.kategorie_id
       WHERE t.is_manual_override = 0
         AND (k.name = 'Sonstiges' OR k.name = 'Sonstige Einnahmen' OR k.name IS NULL)`
    )
    .all() as { id: string }[];
  return rows.map((r) => r.id);
}

export function getAllTransactionIds(): string[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT id FROM transactions WHERE is_manual_override = 0")
    .all() as { id: string }[];
  return rows.map((r) => r.id);
}

export function clearAll(): number {
  const db = getDb();
  const result = db.prepare("DELETE FROM transactions").run();
  return result.changes;
}

export function deleteTransactionsByIds(ids: string[]): number {
  if (ids.length === 0) return 0;
  const db = getDb();
  const placeholders = ids.map(() => "?").join(",");
  const result = db
    .prepare(`DELETE FROM transactions WHERE id IN (${placeholders})`)
    .run(...ids);
  if (result.changes > 0) recomputeUmbuchungen(db);
  return result.changes;
}

export function bulkUpdateCategory(
  ids: string[],
  kategorie: string
): number {
  if (ids.length === 0) return 0;
  const db = getDb();
  const kategorieId = getKategorieId(db, kategorie);
  const placeholders = ids.map(() => "?").join(",");
  const result = db
    .prepare(
      `UPDATE transactions SET kategorie_id = ?, is_manual_override = 1 WHERE id IN (${placeholders})`
    )
    .run(kategorieId, ...ids);
  return result.changes;
}

export interface ImportBatch {
  importedAt: string;
  count: number;
  kontogruppen: {
    id: number | null;
    name: string | null;
    inhaberName: string | null;
  }[];
  sourceFiles: string[];
  dateFrom: string | null;
  dateTo: string | null;
}

export function getImportBatches(limit = 50): ImportBatch[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT
         imported_at,
         COUNT(*) AS count,
         MIN(buchungstag) AS dateFrom,
         MAX(buchungstag) AS dateTo
       FROM transactions
       WHERE imported_at IS NOT NULL AND imported_at != ''
       GROUP BY imported_at
       ORDER BY imported_at DESC
       LIMIT ?`
    )
    .all(limit) as {
    imported_at: string;
    count: number;
    dateFrom: string | null;
    dateTo: string | null;
  }[];

  const kontoStmt = db.prepare(
    `SELECT DISTINCT t.kontogruppe_id AS id, k.name AS name, i.name AS inhaberName
     FROM transactions t
     LEFT JOIN kontogruppen k ON k.id = t.kontogruppe_id
     LEFT JOIN inhaber i ON i.id = k.inhaber_id
     WHERE t.imported_at = ?`
  );
  const fileStmt = db.prepare(
    `SELECT DISTINCT source_file FROM transactions
     WHERE imported_at = ? AND source_file IS NOT NULL AND source_file != ''`
  );

  return rows.map((r) => ({
    importedAt: r.imported_at,
    count: r.count,
    dateFrom: r.dateFrom,
    dateTo: r.dateTo,
    kontogruppen: kontoStmt.all(r.imported_at) as {
      id: number | null;
      name: string | null;
      inhaberName: string | null;
    }[],
    sourceFiles: (
      fileStmt.all(r.imported_at) as { source_file: string }[]
    ).map((row) => row.source_file),
  }));
}

export function reassignImportBatch(
  importedAt: string,
  kontogruppeId: number | null
): number {
  const db = getDb();
  const result = db
    .prepare(
      "UPDATE transactions SET kontogruppe_id = ? WHERE imported_at = ?"
    )
    .run(kontogruppeId, importedAt);
  if (result.changes > 0) recomputeUmbuchungen(db);
  return result.changes;
}

export function deleteImportBatch(importedAt: string): number {
  const db = getDb();
  const result = db
    .prepare("DELETE FROM transactions WHERE imported_at = ?")
    .run(importedAt);
  if (result.changes > 0) recomputeUmbuchungen(db);
  return result.changes;
}

export function bulkUpdateKontogruppe(
  ids: string[],
  kontogruppeId: number | null
): number {
  if (ids.length === 0) return 0;
  const db = getDb();
  const placeholders = ids.map(() => "?").join(",");
  const result = db
    .prepare(
      `UPDATE transactions SET kontogruppe_id = ? WHERE id IN (${placeholders})`
    )
    .run(kontogruppeId, ...ids);
  if (result.changes > 0) recomputeUmbuchungen(db);
  return result.changes;
}

export function bulkSetUmbuchungOverride(
  ids: string[],
  override: boolean | null
): number {
  if (ids.length === 0) return 0;
  const db = getDb();
  const value = override === null ? null : override ? 1 : 0;
  const placeholders = ids.map(() => "?").join(",");
  const result = db
    .prepare(
      `UPDATE transactions SET umbuchung_override = ? WHERE id IN (${placeholders})`
    )
    .run(value, ...ids);
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

/**
 * Liefert die Teilmenge der übergebenen Hash-IDs, die bereits in der DB liegen.
 * Wird vom Import-Preview genutzt, um Dubletten vor dem Insert auszuweisen.
 */
export function existingHashes(ids: string[]): Set<string> {
  if (ids.length === 0) return new Set();
  const db = getDb();
  const placeholders = ids.map(() => "?").join(",");
  const rows = db
    .prepare(`SELECT id FROM transactions WHERE id IN (${placeholders})`)
    .all(...ids) as { id: string }[];
  return new Set(rows.map((r) => r.id));
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
  inhaber_id: number;
  inhaber_name: string;
  inhaber_type: InhaberType;
  inhaber_color: string;
  art: KontogruppeArt;
  color: string;
  icon: string | null;
  bank: string | null;
  created_at: string;
}

function rowToKontogruppe(row: KontogruppeRow): Kontogruppe {
  return {
    id: row.id,
    name: row.name,
    inhaberId: row.inhaber_id,
    inhaberName: row.inhaber_name,
    inhaberType: row.inhaber_type,
    inhaberColor: row.inhaber_color,
    art: row.art ?? "girokonto",
    color: row.color,
    icon: row.icon || "user",
    bank: row.bank ?? undefined,
    createdAt: row.created_at,
  };
}

const SELECT_KONTOGRUPPEN = `
  SELECT
    kg.id, kg.name, kg.inhaber_id, kg.art, kg.color, kg.icon, kg.bank, kg.created_at,
    i.name AS inhaber_name, i.type AS inhaber_type, i.color AS inhaber_color
  FROM kontogruppen kg
  JOIN inhaber i ON i.id = kg.inhaber_id
`;

export function getAllKontogruppen(): Kontogruppe[] {
  const db = getDb();
  const rows = db
    .prepare(
      `${SELECT_KONTOGRUPPEN} ORDER BY i.sort_order ASC, i.id ASC, kg.sort_order ASC, kg.id ASC`
    )
    .all() as KontogruppeRow[];
  return rows.map(rowToKontogruppe);
}

export function createKontogruppe(
  name: string,
  inhaberId: number,
  art: KontogruppeArt,
  color: string,
  icon: string,
  bank: string | null
): Kontogruppe {
  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO kontogruppen (name, inhaber_id, art, color, icon, bank, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(name, inhaberId, art, color, icon, bank, new Date().toISOString());
  const row = db
    .prepare(`${SELECT_KONTOGRUPPEN} WHERE kg.id = ?`)
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
  inhaberId: number,
  art: KontogruppeArt,
  color: string,
  icon: string,
  bank: string | null
): boolean {
  const db = getDb();
  const result = db
    .prepare(
      "UPDATE kontogruppen SET name = ?, inhaber_id = ?, art = ?, color = ?, icon = ?, bank = ? WHERE id = ?"
    )
    .run(name, inhaberId, art, color, icon, bank, id);
  if (result.changes > 0) recomputeUmbuchungen(db);
  return result.changes > 0;
}

export function reorderKontogruppen(orderedIds: number[]): number {
  if (orderedIds.length === 0) return 0;
  const db = getDb();
  const stmt = db.prepare("UPDATE kontogruppen SET sort_order = ? WHERE id = ?");
  let n = 0;
  const tx = db.transaction(() => {
    orderedIds.forEach((id, idx) => {
      const r = stmt.run(idx, id);
      n += r.changes;
    });
  });
  tx();
  return n;
}

export function reorderKategorien(orderedIds: number[]): number {
  if (orderedIds.length === 0) return 0;
  const db = getDb();
  const stmt = db.prepare("UPDATE kategorien SET rule_order = ? WHERE id = ?");
  let n = 0;
  const tx = db.transaction(() => {
    orderedIds.forEach((id, idx) => {
      const r = stmt.run(idx, id);
      n += r.changes;
    });
  });
  tx();
  return n;
}

// ---------- Inhaber ----------

interface InhaberRow {
  id: number;
  name: string;
  type: InhaberType;
  color: string;
  created_at: string;
}

function rowToInhaber(row: InhaberRow): Inhaber {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    color: row.color,
    createdAt: row.created_at,
  };
}

export function getAllInhaber(): Inhaber[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM inhaber ORDER BY sort_order ASC, id ASC")
    .all() as InhaberRow[];
  return rows.map(rowToInhaber);
}

export function createInhaber(
  name: string,
  type: InhaberType,
  color: string
): Inhaber {
  const db = getDb();
  const result = db
    .prepare(
      "INSERT INTO inhaber (name, type, color, created_at) VALUES (?, ?, ?, ?)"
    )
    .run(name, type, color, new Date().toISOString());
  const row = db
    .prepare("SELECT * FROM inhaber WHERE id = ?")
    .get(result.lastInsertRowid) as InhaberRow;
  return rowToInhaber(row);
}

export function updateInhaber(
  id: number,
  name: string,
  type: InhaberType,
  color: string
): boolean {
  const db = getDb();
  const result = db
    .prepare("UPDATE inhaber SET name = ?, type = ?, color = ? WHERE id = ?")
    .run(name, type, color, id);
  return result.changes > 0;
}

export function deleteInhaber(id: number): boolean {
  const db = getDb();
  const has = db
    .prepare("SELECT COUNT(*) AS c FROM kontogruppen WHERE inhaber_id = ?")
    .get(id) as { c: number };
  if (has.c > 0) {
    throw new Error(
      `Inhaber hat noch ${has.c} Kontogruppe${has.c === 1 ? "" : "n"} — bitte erst diese löschen oder verschieben`
    );
  }
  const result = db.prepare("DELETE FROM inhaber WHERE id = ?").run(id);
  return result.changes > 0;
}

export function reorderInhaber(orderedIds: number[]): number {
  if (orderedIds.length === 0) return 0;
  const db = getDb();
  const stmt = db.prepare("UPDATE inhaber SET sort_order = ? WHERE id = ?");
  let n = 0;
  const tx = db.transaction(() => {
    orderedIds.forEach((id, idx) => {
      const r = stmt.run(idx, id);
      n += r.changes;
    });
  });
  tx();
  return n;
}
