import { describe, expect, it } from "vitest";
import {
  insertTransactions,
  updateCategory,
  updateCategoryByAi,
  getAllTransactions,
} from "./db";
import { Transaction } from "./types";
import { setupFreshInMemoryDb } from "./test-helpers";

setupFreshInMemoryDb();

function makeTx(): Transaction {
  return {
    id: "ignored-computed-by-hash",
    kontoBezeichnung: "Giro",
    ibanKonto: "DE00000000000000000000",
    buchungstag: "2026-01-15",
    valutadatum: "2026-01-15",
    nameZahlungsbeteiligter: "Beispiel Markt",
    ibanZahlungsbeteiligter: "DE99999999999999999999",
    buchungstext: "LASTSCHRIFT",
    verwendungszweck: "Wocheneinkauf",
    betrag: -42.5,
    waehrung: "EUR",
    saldoNachBuchung: 0,
    kategorie: "Sonstiges",
  };
}

function insertAndGetId(): string {
  insertTransactions([makeTx()], null);
  const all = getAllTransactions();
  if (all.length !== 1) throw new Error(`expected 1 tx, got ${all.length}`);
  return all[0].id;
}

function readKategorie(id: string): string {
  return getAllTransactions().find((t) => t.id === id)!.kategorie;
}

describe("is_manual_override entkoppelt von ai_classified", () => {
  it("AI im Normal-Modus überschreibt manuelle Kategorie NICHT", () => {
    const id = insertAndGetId();
    expect(updateCategory(id, "Lebensmittel")).toBe(true);

    // AI versucht ohne force eine andere Kategorie zu setzen
    const aiResult = updateCategoryByAi(id, "Bargeld", false);
    expect(aiResult).toBe(false);
    expect(readKategorie(id)).toBe("Lebensmittel");
  });

  it("AI im Force-Modus überschreibt manuelle Kategorie und reset den User-Flag", () => {
    const id = insertAndGetId();
    expect(updateCategory(id, "Lebensmittel")).toBe(true);

    const aiResult = updateCategoryByAi(id, "Bargeld", true);
    expect(aiResult).toBe(true);
    expect(readKategorie(id)).toBe("Bargeld");

    // Anschließend kann AI im Normal-Modus wieder eingreifen (kein User-Sperre mehr)
    const aiAgain = updateCategoryByAi(id, "Sonstiges", false);
    expect(aiAgain).toBe(true);
  });

  it("AI darf eine zuvor nur AI-klassifizierte Buchung im Normal-Modus erneut anfassen", () => {
    const id = insertAndGetId();
    // Erste AI-Klassifikation
    expect(updateCategoryByAi(id, "Bargeld", false)).toBe(true);
    // Zweite AI-Klassifikation (z. B. nach Modellwechsel) — darf!
    expect(updateCategoryByAi(id, "Lebensmittel", false)).toBe(true);
    expect(readKategorie(id)).toBe("Lebensmittel");
  });
});
