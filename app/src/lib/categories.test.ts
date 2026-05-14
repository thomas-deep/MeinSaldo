import { describe, expect, it } from "vitest";
import { categorizeTransaction, categoryRules } from "./categories";
import { Transaction } from "./types";

function tx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "t",
    kontoBezeichnung: "",
    ibanKonto: "",
    buchungstag: "2024-01-01",
    valutadatum: "2024-01-01",
    nameZahlungsbeteiligter: "",
    ibanZahlungsbeteiligter: "",
    buchungstext: "",
    verwendungszweck: "",
    betrag: -10,
    waehrung: "EUR",
    saldoNachBuchung: 0,
    kategorie: "",
    ...overrides,
  };
}

describe("categorizeTransaction", () => {
  it("matches by keyword in Verwendungszweck", () => {
    expect(categorizeTransaction(tx({ verwendungszweck: "Miete Januar" }))).toBe(
      "Miete & Wohnen"
    );
  });

  it("matches by namePattern on counterparty (Edeka → Lebensmittel)", () => {
    expect(
      categorizeTransaction(tx({ nameZahlungsbeteiligter: "EDEKA Markt Berlin" }))
    ).toBe("Lebensmittel");
  });

  it("Netflix → Abonnements & Streaming", () => {
    expect(
      categorizeTransaction(tx({ nameZahlungsbeteiligter: "NETFLIX.COM" }))
    ).toBe("Abonnements & Streaming");
  });

  it("Tankstelle keyword wins", () => {
    expect(
      categorizeTransaction(tx({ verwendungszweck: "Tankstelle Berlin Mitte" }))
    ).toBe("Transport & Mobilität");
  });

  it("positive betrag with no match → 'Sonstige Einnahmen'", () => {
    expect(categorizeTransaction(tx({ betrag: 50 }))).toBe("Sonstige Einnahmen");
  });

  it("negative betrag with no match → 'Sonstiges'", () => {
    expect(categorizeTransaction(tx({ betrag: -50 }))).toBe("Sonstiges");
  });

  it("rule order: keyword match in earlier rule wins over later", () => {
    // "miete" is in Miete & Wohnen (before Versicherungen)
    const t = tx({ verwendungszweck: "miete versicherung kombiniert" });
    expect(categorizeTransaction(t)).toBe("Miete & Wohnen");
  });

  it("matching is case-insensitive", () => {
    expect(
      categorizeTransaction(tx({ nameZahlungsbeteiligter: "AMAZON EU SARL" }))
    ).toBe("Shopping & Konsum");
  });

  it("umlaut keyword (ärzt) matches in lower case", () => {
    expect(
      categorizeTransaction(tx({ verwendungszweck: "Frau Dr. Ärztehaus Charité" }))
    ).toBe("Gesundheit");
  });

  it("counterparty 'Württembergische' → Versicherungen", () => {
    expect(
      categorizeTransaction(tx({ nameZahlungsbeteiligter: "Württembergische" }))
    ).toBe("Versicherungen");
  });

  it("every rule has a non-empty kategorie", () => {
    for (const r of categoryRules) {
      expect(r.kategorie.length).toBeGreaterThan(0);
    }
  });
});
