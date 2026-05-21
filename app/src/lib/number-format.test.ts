import { describe, expect, it } from "vitest";
import { parseGermanNumber, formatGermanAmount } from "./number-format";

describe("parseGermanNumber", () => {
  it("parst Dezimalkomma", () => {
    expect(parseGermanNumber("1234,56")).toBe(1234.56);
  });

  it("parst Tausenderpunkt + Dezimalkomma", () => {
    expect(parseGermanNumber("1.234,56")).toBe(1234.56);
    expect(parseGermanNumber("1.234.567,89")).toBe(1234567.89);
  });

  it("parst reine Ganzzahl", () => {
    expect(parseGermanNumber("1234")).toBe(1234);
  });

  it("ein Punkt mit 3 Folgeziffern → Tausender", () => {
    expect(parseGermanNumber("1.234")).toBe(1234);
    expect(parseGermanNumber("12.345")).toBe(12345);
  });

  it("ein Punkt mit nicht-3 Folgeziffern → Dezimalpunkt", () => {
    expect(parseGermanNumber("1.23")).toBe(1.23);
    expect(parseGermanNumber("1.2345")).toBe(1.2345);
    expect(parseGermanNumber("1.5")).toBe(1.5);
  });

  it("mehrere Punkte ohne Komma → alle Tausender", () => {
    expect(parseGermanNumber("12.345.678")).toBe(12345678);
  });

  it("negative Werte", () => {
    expect(parseGermanNumber("-1.234,56")).toBe(-1234.56);
    expect(parseGermanNumber("+42")).toBe(42);
  });

  it("toleriert Whitespace und Eurozeichen", () => {
    expect(parseGermanNumber("  1.234,50 € ")).toBe(1234.5);
  });

  it("liefert null für ungültige Eingaben", () => {
    expect(parseGermanNumber("")).toBeNull();
    expect(parseGermanNumber("abc")).toBeNull();
    expect(parseGermanNumber("1,2,3")).toBeNull();
    expect(parseGermanNumber("-")).toBeNull();
  });

  it("0 ist gültig", () => {
    expect(parseGermanNumber("0")).toBe(0);
    expect(parseGermanNumber("0,00")).toBe(0);
  });
});

describe("formatGermanAmount", () => {
  it("formatiert mit Tausenderpunkt und zwei Nachkommastellen", () => {
    expect(formatGermanAmount(1234.5)).toBe("1.234,50");
    expect(formatGermanAmount(-1234567.89)).toBe("-1.234.567,89");
    expect(formatGermanAmount(0)).toBe("0,00");
  });
});
