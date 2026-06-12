import { describe, expect, it } from "vitest";
import {
  encryptBackup,
  decryptBackup,
  isEncryptedBackup,
  BackupAuthError,
} from "./backup-crypto";

const sample = Buffer.from("SQLite format 3\0 — beliebige Binärdaten ✓", "utf8");

describe("backup-crypto", () => {
  it("Round-Trip: entschlüsselt zum Original", () => {
    const enc = encryptBackup(sample, "geheim123");
    const dec = decryptBackup(enc, "geheim123");
    expect(dec.equals(sample)).toBe(true);
  });

  it("erkennt verschlüsselte Container am Magic-Header", () => {
    const enc = encryptBackup(sample, "pw");
    expect(isEncryptedBackup(enc)).toBe(true);
    expect(isEncryptedBackup(sample)).toBe(false);
    expect(isEncryptedBackup(Buffer.alloc(3))).toBe(false);
  });

  it("falsches Passwort wirft BackupAuthError", () => {
    const enc = encryptBackup(sample, "richtig");
    expect(() => decryptBackup(enc, "falsch")).toThrow(BackupAuthError);
  });

  it("manipuliertes Ciphertext wirft BackupAuthError", () => {
    const enc = encryptBackup(sample, "pw");
    enc[enc.length - 1] ^= 0xff; // letztes Byte kippen
    expect(() => decryptBackup(enc, "pw")).toThrow(BackupAuthError);
  });

  it("zwei Verschlüsselungen liefern unterschiedliche Container (Salt/IV random)", () => {
    const a = encryptBackup(sample, "pw");
    const b = encryptBackup(sample, "pw");
    expect(a.equals(b)).toBe(false);
  });

  it("unverschlüsselte Daten an decrypt wirft Auth-Fehler", () => {
    expect(() => decryptBackup(sample, "pw")).toThrow(BackupAuthError);
  });

  it("leeres Passwort wird abgelehnt", () => {
    expect(() => encryptBackup(sample, "")).toThrow();
  });
});
