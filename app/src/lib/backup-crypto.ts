import {
  randomBytes,
  scryptSync,
  createCipheriv,
  createDecipheriv,
  timingSafeEqual,
  type ScryptOptions,
} from "crypto";

/**
 * Verschlüsselungs-Container für Datenbank-Sicherungen.
 *
 * Aufbau einer `.msbak`-Datei (alle Felder binär, in dieser Reihenfolge):
 *
 *   MAGIC (8)  | salt (16) | iv (12) | authTag (16) | ciphertext (rest)
 *
 * - Schlüssel: scrypt(password, salt) → 32 Byte (AES-256)
 * - Cipher:    AES-256-GCM (authenticated) — falsches Passwort oder eine
 *              manipulierte Datei scheitern beim `final()` mit Auth-Fehler.
 *
 * Der Klartext ist eine vollständige SQLite-Datei (Ausgabe von `VACUUM INTO`).
 */

const MAGIC = Buffer.from("MSBAK1\0\0", "latin1"); // 8 Bytes
const SALT_LEN = 16;
const IV_LEN = 12;
const TAG_LEN = 16;
const KEY_LEN = 32;

// scrypt-Kostenparameter: N=2^15 → ~32 MiB Speicher, spürbar aber schnell genug
// für eine einmalige Backup-/Restore-Operation. maxmem großzügig setzen, damit
// die Defaults von Node nicht limitieren.
const SCRYPT: ScryptOptions = { N: 1 << 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

/** Eigene Fehlerklasse für „falsches Passwort / beschädigte Sicherung". */
export class BackupAuthError extends Error {
  constructor(message = "Falsches Passwort oder beschädigte Sicherung") {
    super(message);
    this.name = "BackupAuthError";
  }
}

/** True, wenn der Puffer mit dem MeinSaldo-Verschlüsselungs-Header beginnt. */
export function isEncryptedBackup(buf: Buffer): boolean {
  return (
    buf.length >= MAGIC.length &&
    timingSafeEqual(buf.subarray(0, MAGIC.length), MAGIC)
  );
}

function deriveKey(password: string, salt: Buffer): Buffer {
  return scryptSync(Buffer.from(password, "utf8"), salt, KEY_LEN, SCRYPT);
}

/** Verschlüsselt einen Klartext-Puffer (die rohe SQLite-Datei). */
export function encryptBackup(plain: Buffer, password: string): Buffer {
  if (!password) throw new Error("Passwort erforderlich");
  const salt = randomBytes(SALT_LEN);
  const iv = randomBytes(IV_LEN);
  const key = deriveKey(password, salt);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([MAGIC, salt, iv, tag, ciphertext]);
}

/**
 * Entschlüsselt einen `.msbak`-Container zurück zur rohen SQLite-Datei.
 * Wirft `BackupAuthError` bei falschem Passwort oder beschädigtem Inhalt.
 */
export function decryptBackup(buf: Buffer, password: string): Buffer {
  if (!password) throw new Error("Passwort erforderlich");
  if (!isEncryptedBackup(buf)) {
    throw new BackupAuthError("Keine verschlüsselte MeinSaldo-Sicherung");
  }
  let offset = MAGIC.length;
  const salt = buf.subarray(offset, (offset += SALT_LEN));
  const iv = buf.subarray(offset, (offset += IV_LEN));
  const tag = buf.subarray(offset, (offset += TAG_LEN));
  const ciphertext = buf.subarray(offset);
  if (salt.length < SALT_LEN || iv.length < IV_LEN || tag.length < TAG_LEN) {
    throw new BackupAuthError("Beschädigte Sicherung (unvollständiger Header)");
  }
  const key = deriveKey(password, salt);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  try {
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch {
    throw new BackupAuthError();
  }
}
