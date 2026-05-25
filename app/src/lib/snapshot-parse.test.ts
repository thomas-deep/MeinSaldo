import { describe, expect, it } from "vitest";
import { parseSnapshotPaste } from "./snapshot-parse";

describe("parseSnapshotPaste", () => {
  it("parst ISO-Datum + deutsche Zahl mit Semikolon", () => {
    const r = parseSnapshotPaste("2026-01-15;1.234,56");
    expect(r.errors).toEqual([]);
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].date).toBe("2026-01-15");
    expect(r.rows[0].value).toBeCloseTo(1234.56);
  });

  it("parst deutsches Datum + Tab + englische Zahl", () => {
    const r = parseSnapshotPaste("15.01.2026\t1234.56");
    expect(r.errors).toEqual([]);
    expect(r.rows[0].date).toBe("2026-01-15");
    expect(r.rows[0].value).toBeCloseTo(1234.56);
  });

  it("parst Slash-Datum + Komma-Trenner zwischen Feldern", () => {
    // Achtung: das Komma als Feld-Trenner kollidiert mit DE-Dezimalkomma
    // → User muss in dem Fall Semikolon nehmen. Hier Test mit englischer
    // Zahl.
    const r = parseSnapshotPaste("15/01/2026,1234.56");
    expect(r.errors).toEqual([]);
    expect(r.rows[0].date).toBe("2026-01-15");
    expect(r.rows[0].value).toBeCloseTo(1234.56);
  });

  it("ignoriert leere Zeilen", () => {
    const r = parseSnapshotPaste("\n2026-01-15;100\n\n2026-02-15;200\n");
    expect(r.errors).toEqual([]);
    expect(r.rows.map((x) => x.date)).toEqual(["2026-01-15", "2026-02-15"]);
  });

  it("verwirft Header-Zeile, wenn weder Datum noch Zahl plausibel", () => {
    const r = parseSnapshotPaste("Datum;Wert\n2026-01-15;100");
    expect(r.errors).toEqual([]);
    expect(r.rows).toHaveLength(1);
  });

  it("entfernt Anführungszeichen um Felder (Excel-CSV-Paste)", () => {
    const r = parseSnapshotPaste('"2026-01-15";"1.234,56"');
    expect(r.errors).toEqual([]);
    expect(r.rows[0].value).toBeCloseTo(1234.56);
  });

  it("erkennt negative Werte", () => {
    const r = parseSnapshotPaste("2026-01-15;-500,00");
    expect(r.rows[0].value).toBeCloseTo(-500);
  });

  it("meldet ungültiges Datum als Fehler mit Zeilennummer", () => {
    const r = parseSnapshotPaste("31.13.2026;100");
    expect(r.rows).toHaveLength(0);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0].line).toBe(1);
    expect(r.errors[0].reason).toMatch(/Datum/);
  });

  it("meldet ungültigen Wert als Fehler", () => {
    const r = parseSnapshotPaste("2026-01-15;nicht-zahl");
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0].reason).toMatch(/Wert/);
  });

  it("meldet fehlenden Trenner", () => {
    const r = parseSnapshotPaste("2026-01-15 100");
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0].reason).toMatch(/Trennzeichen/);
  });

  it("liefert valide Zeilen auch wenn andere kaputt sind", () => {
    const r = parseSnapshotPaste(
      "2026-01-15;100\nKAPUTT\n2026-02-15;200"
    );
    expect(r.rows).toHaveLength(2);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0].line).toBe(2);
  });

  it("Header wird nur einmal als erste Zeile verworfen, danach echte Fehler gemeldet", () => {
    const r = parseSnapshotPaste(
      "Datum;Wert\n2026-01-15;100\nKAPUTT;auch-kaputt"
    );
    expect(r.rows).toHaveLength(1);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0].line).toBe(3);
  });
});
