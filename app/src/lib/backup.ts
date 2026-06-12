import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import {
  closeDb,
  getDbFilePath,
  logEvent,
  reopenDb,
  vacuumInto,
} from "./db";
import {
  BackupAuthError,
  decryptBackup,
  encryptBackup,
  isEncryptedBackup,
} from "./backup-crypto";

/** Metadaten einer abgelegten Sicherung (fürs UI). */
export interface BackupInfo {
  name: string;
  size: number;
  createdAt: string; // ISO (mtime)
  encrypted: boolean;
}

export const PLAIN_EXT = ".db";
export const ENC_EXT = ".msbak";

// ──────────────── Fehlerklassen ────────────────

export class BackupBusyError extends Error {
  constructor() {
    super("Eine andere Sicherungs-Operation läuft gerade");
    this.name = "BackupBusyError";
  }
}
export class BackupNotFoundError extends Error {
  constructor() {
    super("Sicherung nicht gefunden");
    this.name = "BackupNotFoundError";
  }
}
export class BackupNameError extends Error {
  constructor() {
    super("Ungültiger Sicherungsname");
    this.name = "BackupNameError";
  }
}
export class BackupPasswordRequiredError extends Error {
  constructor() {
    super("Diese Sicherung ist verschlüsselt — Passwort erforderlich");
    this.name = "BackupPasswordRequiredError";
  }
}
export class BackupInvalidError extends Error {
  constructor(message = "Datei ist keine gültige MeinSaldo-Sicherung") {
    super(message);
    this.name = "BackupInvalidError";
  }
}
export { BackupAuthError };

// ──────────────── Pfade & Namen ────────────────

function dataDir(): string {
  return path.dirname(getDbFilePath());
}

function backupsDir(): string {
  const dir = path.join(dataDir(), "backups");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function isBackupFile(name: string): boolean {
  return name.endsWith(PLAIN_EXT) || name.endsWith(ENC_EXT);
}

/** Validiert einen vom Client gelieferten Sicherungsnamen und liefert den
 *  absoluten Pfad — wehrt Path-Traversal ab (nur Basenames innerhalb von
 *  `backups/`, keine `..`, kein Verzeichnis-Anteil, kein Dotfile). */
function resolveBackupPath(name: string): string {
  const base = path.basename(name);
  if (
    !name ||
    base !== name ||
    base.startsWith(".") ||
    !isBackupFile(base)
  ) {
    throw new BackupNameError();
  }
  const dir = backupsDir();
  const full = path.join(dir, base);
  const rel = path.relative(dir, full);
  if (rel.startsWith("..") || path.isAbsolute(rel)) throw new BackupNameError();
  return full;
}

function timestamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}` +
    `-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
  );
}

/** Liefert einen Dateinamen, der noch nicht existiert (hängt -2, -3, … an,
 *  falls innerhalb derselben Sekunde mehrfach gesichert wird). */
function uniquePath(filename: string): string {
  const dir = backupsDir();
  const ext = path.extname(filename);
  const stem = filename.slice(0, -ext.length);
  let candidate = path.join(dir, filename);
  let i = 2;
  while (fs.existsSync(candidate)) {
    candidate = path.join(dir, `${stem}-${i}${ext}`);
    i++;
  }
  return candidate;
}

function statBackup(full: string): BackupInfo {
  const st = fs.statSync(full);
  const name = path.basename(full);
  return {
    name,
    size: st.size,
    createdAt: st.mtime.toISOString(),
    encrypted: name.endsWith(ENC_EXT),
  };
}

// ──────────────── Operations-Lock ────────────────
// Single-Process: ein simples Flag reicht, um parallele Backup/Restore-Läufe
// (die alle dieselbe DB-Verbindung anfassen) zu serialisieren.
let opInProgress = false;

function withLock<T>(fn: () => T): T {
  if (opInProgress) throw new BackupBusyError();
  opInProgress = true;
  try {
    return fn();
  } finally {
    opInProgress = false;
  }
}

// ──────────────── Sicherungen erstellen ────────────────

interface CreateOpts {
  encrypt: boolean;
  password?: string;
}

function assertEncryptArgs(opts: CreateOpts): void {
  if (opts.encrypt && !opts.password) {
    throw new Error("Passwort erforderlich für verschlüsselte Sicherung");
  }
}

/** Erzeugt einen Snapshot der DB und legt ihn in `backups/` ab. */
export function createBackup(opts: CreateOpts): BackupInfo {
  assertEncryptArgs(opts);
  return withLock(() => {
    const ts = timestamp();
    if (!opts.encrypt) {
      const target = uniquePath(`meinsaldo-${ts}${PLAIN_EXT}`);
      vacuumInto(target);
      logEvent("info", "backup.create", `Sicherung erstellt: ${path.basename(target)}`, {
        encrypted: false,
      });
      return statBackup(target);
    }
    const tmp = uniquePath(`meinsaldo-${ts}.tmp`);
    vacuumInto(tmp);
    try {
      const enc = encryptBackup(fs.readFileSync(tmp), opts.password!);
      const target = uniquePath(`meinsaldo-${ts}${ENC_EXT}`);
      fs.writeFileSync(target, enc);
      logEvent(
        "info",
        "backup.create",
        `Verschlüsselte Sicherung erstellt: ${path.basename(target)}`,
        { encrypted: true }
      );
      return statBackup(target);
    } finally {
      safeUnlink(tmp);
    }
  });
}

/** Erzeugt einen Snapshot als Puffer für den direkten Download (ohne Ablage). */
export function createBackupBuffer(opts: CreateOpts): {
  filename: string;
  data: Buffer;
} {
  assertEncryptArgs(opts);
  return withLock(() => {
    const ts = timestamp();
    const tmp = uniquePath(`meinsaldo-${ts}.tmp`);
    vacuumInto(tmp);
    try {
      const plain = fs.readFileSync(tmp);
      if (opts.encrypt) {
        return {
          filename: `meinsaldo-${ts}${ENC_EXT}`,
          data: encryptBackup(plain, opts.password!),
        };
      }
      return { filename: `meinsaldo-${ts}${PLAIN_EXT}`, data: plain };
    } finally {
      safeUnlink(tmp);
    }
  });
}

/** Legt vor einer destruktiven Aktion (Restore, „DB leeren") automatisch eine
 *  unverschlüsselte Schutz-Sicherung an. Schlägt sie fehl, wird das nur
 *  geloggt — die eigentliche Aktion soll dadurch nicht blockiert werden. */
export function createSafetySnapshot(reason: string): BackupInfo | null {
  try {
    const target = uniquePath(`schutz-${reason}-${timestamp()}${PLAIN_EXT}`);
    vacuumInto(target);
    logEvent(
      "info",
      "backup.create",
      `Schutz-Sicherung (${reason}): ${path.basename(target)}`,
      { auto: true, reason }
    );
    return statBackup(target);
  } catch (e) {
    logEvent("error", "backup.create", "Schutz-Sicherung fehlgeschlagen", {
      reason,
      error: e instanceof Error ? e.message : String(e),
    });
    return null;
  }
}

// ──────────────── Auflisten / Lesen / Löschen ────────────────

export function listBackups(): BackupInfo[] {
  const dir = backupsDir();
  return fs
    .readdirSync(dir)
    .filter((n) => !n.startsWith(".") && isBackupFile(n))
    .map((n) => statBackup(path.join(dir, n)))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function readBackup(name: string): { data: Buffer; info: BackupInfo } {
  const full = resolveBackupPath(name);
  if (!fs.existsSync(full)) throw new BackupNotFoundError();
  return { data: fs.readFileSync(full), info: statBackup(full) };
}

export function deleteBackup(name: string): boolean {
  const full = resolveBackupPath(name);
  if (!fs.existsSync(full)) return false;
  fs.unlinkSync(full);
  logEvent("warn", "backup.delete", `Sicherung gelöscht: ${path.basename(full)}`);
  return true;
}

// ──────────────── Restore ────────────────

/** Öffnet die Datei read-only und prüft, dass es eine intakte SQLite-DB mit
 *  MeinSaldo-Schema ist. Wirft `BackupInvalidError`, sonst nichts. */
function validateSqliteFile(file: string): void {
  let probe: Database.Database | null = null;
  try {
    probe = new Database(file, { readonly: true, fileMustExist: true });
    const check = probe.pragma("quick_check", { simple: true });
    if (check !== "ok") throw new Error("quick_check");
    const row = probe
      .prepare(
        `SELECT COUNT(*) AS c FROM sqlite_master
         WHERE type = 'table' AND name IN ('schema_migrations', 'transactions')`
      )
      .get() as { c: number };
    if (row.c < 1) throw new Error("schema");
  } catch {
    throw new BackupInvalidError();
  } finally {
    try {
      probe?.close();
    } catch {
      // ignore
    }
  }
}

/** Spielt einen Sicherungs-Puffer ein: validiert, legt eine Schutz-Sicherung
 *  der aktuellen DB an und tauscht dann die DB-Datei unter der geschlossenen
 *  Verbindung aus. Anschließend wird neu geöffnet (inkl. evtl. Migrationen). */
export function restoreFromBuffer(buf: Buffer, password?: string): void {
  return withLock(() => {
    const dbPath = getDbFilePath();
    if (dbPath === ":memory:") {
      throw new BackupInvalidError("Restore im In-Memory-Modus nicht möglich");
    }

    let plain: Buffer;
    if (isEncryptedBackup(buf)) {
      if (!password) throw new BackupPasswordRequiredError();
      plain = decryptBackup(buf, password); // wirft BackupAuthError bei falschem PW
    } else {
      plain = buf;
    }

    const tmp = uniquePath(`restore-${timestamp()}.tmp`);
    fs.writeFileSync(tmp, plain);
    try {
      validateSqliteFile(tmp);
      createSafetySnapshot("vor-restore");

      // closeDb() checkpointet das WAL in die Hauptdatei → die alte .db bleibt
      // vollständig, falls der Tausch scheitert. Danach sind die Sidecars
      // veraltet und müssen weg, bevor die neue Datei eingesetzt wird.
      closeDb();
      safeUnlink(dbPath + "-wal");
      safeUnlink(dbPath + "-shm");
      // rename(2) ersetzt das Ziel atomar (gleiche Partition wie backups/).
      fs.renameSync(tmp, dbPath);
    } catch (e) {
      safeUnlink(tmp);
      // Verbindung wieder herstellen, falls wir schon geschlossen hatten
      reopenDb();
      throw e;
    }

    reopenDb(); // frische Datei öffnen + ggf. migrieren
    logEvent("warn", "backup.restore", "Sicherung eingespielt");
  });
}

export function restoreFromStored(name: string, password?: string): void {
  const full = resolveBackupPath(name);
  if (!fs.existsSync(full)) throw new BackupNotFoundError();
  restoreFromBuffer(fs.readFileSync(full), password);
}

// ──────────────── intern ────────────────

function safeUnlink(p: string): void {
  try {
    if (fs.existsSync(p)) fs.unlinkSync(p);
  } catch {
    // ignore
  }
}
