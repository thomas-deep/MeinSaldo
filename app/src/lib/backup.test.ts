import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { __resetDbForTests, createTag, getAllTags } from "./db";
import {
  BackupAuthError,
  BackupInvalidError,
  BackupNameError,
  BackupPasswordRequiredError,
  createBackup,
  createBackupBuffer,
  deleteBackup,
  listBackups,
  readBackup,
  restoreFromBuffer,
  restoreFromStored,
} from "./backup";

let tmpDir: string;

/** Seedet die DB mit einem Marker-Tag, an dem wir Restore-Erfolg messen. */
function seed(marker: string): void {
  createTag(marker, "#ffffff");
}

function tagNames(): string[] {
  return getAllTags().map((t) => t.name);
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "meinsaldo-backup-"));
  process.env.FINANZEN_DB_PATH = path.join(tmpDir, "finanzen.db");
  __resetDbForTests();
});

afterEach(() => {
  __resetDbForTests();
  delete process.env.FINANZEN_DB_PATH;
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("createBackup / listBackups", () => {
  it("legt eine unverschlüsselte Sicherung ab und listet sie", () => {
    seed("AlphaInhaber");
    const info = createBackup({ encrypt: false });
    expect(info.encrypted).toBe(false);
    expect(info.name.endsWith(".db")).toBe(true);
    expect(info.size).toBeGreaterThan(0);

    const list = listBackups();
    expect(list.map((b) => b.name)).toContain(info.name);
  });

  it("legt eine verschlüsselte Sicherung als .msbak ab", () => {
    seed("AlphaInhaber");
    const info = createBackup({ encrypt: true, password: "pw123456" });
    expect(info.encrypted).toBe(true);
    expect(info.name.endsWith(".msbak")).toBe(true);

    const raw = fs.readFileSync(path.join(tmpDir, "backups", info.name));
    expect(raw.subarray(0, 6).toString("latin1")).toBe("MSBAK1");
  });

  it("verlangt ein Passwort für verschlüsselte Sicherungen", () => {
    seed("AlphaInhaber");
    expect(() => createBackup({ encrypt: true })).toThrow();
  });
});

describe("createBackupBuffer (Download ohne Ablage)", () => {
  it("liefert rohe SQLite-Bytes ohne etwas abzulegen", () => {
    seed("AlphaInhaber");
    const { filename, data } = createBackupBuffer({ encrypt: false });
    expect(filename.endsWith(".db")).toBe(true);
    expect(data.subarray(0, 16).toString("latin1")).toBe("SQLite format 3\0");
    expect(listBackups()).toHaveLength(0);
  });

  it("verschlüsselt den Download-Puffer", () => {
    seed("AlphaInhaber");
    const { filename, data } = createBackupBuffer({
      encrypt: true,
      password: "pw123456",
    });
    expect(filename.endsWith(".msbak")).toBe(true);
    expect(data.subarray(0, 6).toString("latin1")).toBe("MSBAK1");
    expect(listBackups()).toHaveLength(0);
  });
});

describe("restore", () => {
  it("stellt einen früheren Zustand wieder her (unverschlüsselt)", () => {
    seed("Ur-Zustand");
    const { data } = createBackupBuffer({ encrypt: false });

    seed("Spaeter-Hinzugefuegt");
    expect(tagNames()).toContain("Spaeter-Hinzugefuegt");

    restoreFromBuffer(data);
    expect(tagNames()).toContain("Ur-Zustand");
    expect(tagNames()).not.toContain("Spaeter-Hinzugefuegt");
  });

  it("legt vor dem Restore automatisch eine Schutz-Sicherung an", () => {
    seed("Ur-Zustand");
    const { data } = createBackupBuffer({ encrypt: false });
    restoreFromBuffer(data);
    const schutz = listBackups().filter((b) => b.name.startsWith("schutz-vor-restore-"));
    expect(schutz.length).toBeGreaterThanOrEqual(1);
  });

  it("stellt aus verschlüsselter Sicherung mit Passwort wieder her", () => {
    seed("Verschluesselt-Original");
    const info = createBackup({ encrypt: true, password: "geheim" });

    seed("Wird-Verworfen");
    restoreFromStored(info.name, "geheim");

    expect(tagNames()).toContain("Verschluesselt-Original");
    expect(tagNames()).not.toContain("Wird-Verworfen");
  });

  it("verschlüsselte Sicherung ohne Passwort → PasswordRequired", () => {
    seed("X");
    const info = createBackup({ encrypt: true, password: "geheim" });
    expect(() => restoreFromStored(info.name)).toThrow(BackupPasswordRequiredError);
  });

  it("verschlüsselte Sicherung mit falschem Passwort → AuthError", () => {
    seed("X");
    const info = createBackup({ encrypt: true, password: "richtig" });
    expect(() => restoreFromStored(info.name, "falsch")).toThrow(BackupAuthError);
  });

  it("Müll-Datei wird als ungültig abgelehnt", () => {
    seed("X");
    expect(() => restoreFromBuffer(Buffer.from("kein sqlite"))).toThrow(
      BackupInvalidError
    );
    // DB bleibt funktionsfähig
    expect(tagNames()).toContain("X");
  });
});

describe("deleteBackup & Pfad-Sicherheit", () => {
  it("löscht eine abgelegte Sicherung", () => {
    seed("X");
    const info = createBackup({ encrypt: false });
    expect(deleteBackup(info.name)).toBe(true);
    expect(listBackups().map((b) => b.name)).not.toContain(info.name);
  });

  it("wehrt Path-Traversal-Namen ab", () => {
    expect(() => readBackup("../finanzen.db")).toThrow(BackupNameError);
    expect(() => deleteBackup("../../etc/passwd")).toThrow(BackupNameError);
    expect(() => readBackup("/etc/hosts")).toThrow(BackupNameError);
    expect(() => readBackup("evil.txt")).toThrow(BackupNameError);
  });
});
