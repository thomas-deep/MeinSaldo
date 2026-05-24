import { describe, expect, it } from "vitest";
import { formatIbanForDisplay, maskIban, normalizeIban } from "./iban";

describe("normalizeIban", () => {
  it("entfernt Whitespaces und macht uppercase", () => {
    expect(normalizeIban("de89 3704 0044 0532 0130 00")).toBe(
      "DE89370400440532013000"
    );
  });

  it("entfernt führende/abschließende Whitespaces", () => {
    expect(normalizeIban("  DE89370400440532013000  ")).toBe(
      "DE89370400440532013000"
    );
  });

  it("liefert null für leeren String", () => {
    expect(normalizeIban("")).toBeNull();
  });

  it("liefert null für nur Whitespace", () => {
    expect(normalizeIban("   \t\n")).toBeNull();
  });

  it("liefert null für null und undefined", () => {
    expect(normalizeIban(null)).toBeNull();
    expect(normalizeIban(undefined)).toBeNull();
  });

  it("ist idempotent", () => {
    const a = normalizeIban("de89 3704 0044 0532 0130 00");
    const b = normalizeIban(a);
    expect(b).toBe(a);
  });
});

describe("formatIbanForDisplay", () => {
  it("fügt 4er-Gruppen-Spaces ein", () => {
    expect(formatIbanForDisplay("DE89370400440532013000")).toBe(
      "DE89 3704 0044 0532 0130 00"
    );
  });

  it("liefert leeren String für leere/null Eingaben", () => {
    expect(formatIbanForDisplay("")).toBe("");
    expect(formatIbanForDisplay(null)).toBe("");
    expect(formatIbanForDisplay(undefined)).toBe("");
  });
});

describe("maskIban", () => {
  it("zeigt Anfang und Ende, maskiert die Mitte", () => {
    expect(maskIban("DE89370400440532013000")).toBe("DE89••3000");
  });

  it("liefert kurze IBANs unverändert", () => {
    expect(maskIban("DE893704")).toBe("DE893704");
  });

  it("liefert leeren String für leere Eingabe", () => {
    expect(maskIban(null)).toBe("");
  });
});
