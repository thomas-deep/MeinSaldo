import { describe, expect, it } from "vitest";
import { detectRecurring, normalizeCounterparty } from "./recurring";
import { Transaction } from "./types";

function tx(
  date: string,
  name: string,
  betrag: number,
  overrides: Partial<Transaction> = {}
): Transaction {
  return {
    id: `${date}-${name}-${betrag}`,
    kontoBezeichnung: "Giro",
    ibanKonto: "DE00000000000000000000",
    buchungstag: date,
    valutadatum: date,
    nameZahlungsbeteiligter: name,
    ibanZahlungsbeteiligter: "DE99999999999999999999",
    buchungstext: "",
    verwendungszweck: "",
    betrag,
    waehrung: "EUR",
    saldoNachBuchung: 0,
    kategorie: "",
    ...overrides,
  };
}

describe("normalizeCounterparty", () => {
  it("normalisiert Whitespace und Case", () => {
    expect(normalizeCounterparty("  Beispiel  GmbH  ")).toBe("beispiel gmbh");
  });

  it("ersetzt Umlaute", () => {
    expect(normalizeCounterparty("Müller AG")).toBe("muller ag");
  });

  it("trimmt typische Bank-Suffixe", () => {
    expect(normalizeCounterparty("Beispiel GmbH//Frankfurt//DE")).toBe(
      "beispiel gmbh"
    );
  });
});

describe("detectRecurring", () => {
  it("erkennt monatliche Buchungen mit identischem Betrag", () => {
    const txs = [
      tx("2025-01-15", "Vermieter", -800),
      tx("2025-02-15", "Vermieter", -800),
      tx("2025-03-15", "Vermieter", -800),
      tx("2025-04-15", "Vermieter", -800),
    ];
    const result = detectRecurring(txs);
    expect(result).toHaveLength(1);
    expect(result[0].interval).toBe("monthly");
    expect(result[0].avgBetrag).toBe(-800);
    expect(result[0].occurrences).toBe(4);
    expect(result[0].name).toBe("Vermieter");
  });

  it("erkennt monatlich auch bei kleinen Datums-Abweichungen", () => {
    const txs = [
      tx("2025-01-03", "Streaming AG", -9.99),
      tx("2025-02-01", "Streaming AG", -9.99),
      tx("2025-03-05", "Streaming AG", -9.99),
    ];
    const result = detectRecurring(txs);
    expect(result).toHaveLength(1);
    expect(result[0].interval).toBe("monthly");
  });

  it("erkennt jährliche Buchungen", () => {
    const txs = [
      tx("2023-06-10", "Versicherung", -250),
      tx("2024-06-12", "Versicherung", -260),
      tx("2025-06-09", "Versicherung", -270),
    ];
    const result = detectRecurring(txs);
    expect(result).toHaveLength(1);
    expect(result[0].interval).toBe("yearly");
  });

  it("ignoriert Counterparties mit weniger als 3 Buchungen", () => {
    const txs = [
      tx("2025-01-15", "Einmalig", -100),
      tx("2025-02-15", "Einmalig", -100),
    ];
    expect(detectRecurring(txs)).toEqual([]);
  });

  it("markiert Preisänderung wenn aktueller Betrag stark abweicht", () => {
    const txs = [
      tx("2025-01-15", "Streaming", -9.99),
      tx("2025-02-15", "Streaming", -9.99),
      tx("2025-03-15", "Streaming", -9.99),
      tx("2025-04-15", "Streaming", -14.99),
    ];
    const result = detectRecurring(txs);
    expect(result).toHaveLength(1);
    expect(result[0].priceChanged).toBe(true);
    expect(result[0].latestBetrag).toBe(-14.99);
  });

  it("markiert keine Preisänderung bei stabilem Betrag", () => {
    const txs = [
      tx("2025-01-15", "Strom", -50),
      tx("2025-02-15", "Strom", -52),
      tx("2025-03-15", "Strom", -50),
      tx("2025-04-15", "Strom", -51),
    ];
    const result = detectRecurring(txs);
    expect(result[0].priceChanged).toBe(false);
  });

  it("ignoriert unregelmäßige Buchungen", () => {
    const txs = [
      tx("2025-01-15", "Zufall", -10),
      tx("2025-02-20", "Zufall", -10),
      tx("2025-06-01", "Zufall", -10),
      tx("2025-06-15", "Zufall", -10),
    ];
    expect(detectRecurring(txs)).toEqual([]);
  });

  it("ignoriert als Umbuchung markierte Buchungen", () => {
    const txs = [
      tx("2025-01-15", "Sparkonto", -500, { isUmbuchung: true }),
      tx("2025-02-15", "Sparkonto", -500, { isUmbuchung: true }),
      tx("2025-03-15", "Sparkonto", -500, { isUmbuchung: true }),
    ];
    expect(detectRecurring(txs)).toEqual([]);
  });

  it("nextExpected ist Datum + Intervall ab letzter Buchung", () => {
    const txs = [
      tx("2025-01-15", "Miete", -800),
      tx("2025-02-15", "Miete", -800),
      tx("2025-03-15", "Miete", -800),
    ];
    const result = detectRecurring(txs);
    expect(result[0].nextExpected).toMatch(/^2025-04-/);
  });

  it("sortiert nach Betrag absteigend (größte Ausgaben zuerst)", () => {
    const txs = [
      tx("2025-01-15", "Klein", -10),
      tx("2025-02-15", "Klein", -10),
      tx("2025-03-15", "Klein", -10),
      tx("2025-01-15", "Groß", -800),
      tx("2025-02-15", "Groß", -800),
      tx("2025-03-15", "Groß", -800),
    ];
    const result = detectRecurring(txs);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Groß");
    expect(result[1].name).toBe("Klein");
  });
});
