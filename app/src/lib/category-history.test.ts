import { describe, expect, it } from "vitest";
import {
  buildCategoryHistory,
  lookupHistoricalCategory,
  isFallbackCategory,
} from "./category-history";

describe("isFallbackCategory", () => {
  it("erkennt die Fallback-Kategorien", () => {
    expect(isFallbackCategory("Sonstiges")).toBe(true);
    expect(isFallbackCategory("Sonstige Einnahmen")).toBe(true);
    expect(isFallbackCategory("Lebensmittel")).toBe(false);
  });
});

describe("buildCategoryHistory", () => {
  it("ordnet einen Counterparty seiner einzigen Kategorie zu", () => {
    const h = buildCategoryHistory([
      { name: "REWE Markt", kategorie: "Lebensmittel", manual: false },
    ]);
    expect(lookupHistoricalCategory(h, "REWE Markt")).toBe("Lebensmittel");
  });

  it("ignoriert Fallback-Kategorien als Signal", () => {
    const h = buildCategoryHistory([
      { name: "Unbekannt GmbH", kategorie: "Sonstiges", manual: false },
    ]);
    expect(lookupHistoricalCategory(h, "Unbekannt GmbH")).toBeNull();
  });

  it("nimmt die häufigste Kategorie bei mehreren Einträgen", () => {
    const h = buildCategoryHistory([
      { name: "Shop", kategorie: "Shopping", manual: false },
      { name: "Shop", kategorie: "Shopping", manual: false },
      { name: "Shop", kategorie: "Geschenke", manual: false },
    ]);
    expect(lookupHistoricalCategory(h, "Shop")).toBe("Shopping");
  });

  it("manuelle Kategorisierung schlägt häufigere automatische", () => {
    const h = buildCategoryHistory([
      { name: "Baumarkt", kategorie: "Shopping", manual: false },
      { name: "Baumarkt", kategorie: "Shopping", manual: false },
      { name: "Baumarkt", kategorie: "Renovierung", manual: true },
    ]);
    expect(lookupHistoricalCategory(h, "Baumarkt")).toBe("Renovierung");
  });

  it("matcht über normalisierte Counterparty-Namen (Case/Whitespace)", () => {
    const h = buildCategoryHistory([
      { name: "  Müller   Drogerie ", kategorie: "Drogerie", manual: false },
    ]);
    expect(lookupHistoricalCategory(h, "MÜLLER DROGERIE")).toBe("Drogerie");
  });

  it("liefert null für unbekannte Counterparties", () => {
    const h = buildCategoryHistory([
      { name: "Bekannt", kategorie: "Freizeit", manual: false },
    ]);
    expect(lookupHistoricalCategory(h, "Niemals Gesehen")).toBeNull();
  });
});
