import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST, DELETE } from "./route";
import { setupFreshInMemoryDb, jsonRequest } from "../../../lib/test-helpers";

setupFreshInMemoryDb();

function nextReq(url: string, method: string, body: unknown): NextRequest {
  return new NextRequest(jsonRequest(url, method, body));
}

function txInput(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "ignored-server-rehashes",
    kontoBezeichnung: "Giro",
    ibanKonto: "DE00000000000000000000",
    buchungstag: "2025-01-15",
    valutadatum: "2025-01-15",
    nameZahlungsbeteiligter: "Beispiel GmbH",
    ibanZahlungsbeteiligter: "DE99999999999999999999",
    buchungstext: "Lastschrift",
    verwendungszweck: "Rechnung 1234",
    betrag: -42.5,
    waehrung: "EUR",
    saldoNachBuchung: 1000,
    kategorie: "",
    ...overrides,
  };
}

describe("/api/transactions", () => {
  it("GET liefert leere Liste + Stats auf frischer DB", async () => {
    const res = await GET();
    const json = await res.json();
    expect(json.transactions).toEqual([]);
    expect(json.stats).toBeDefined();
  });

  it("POST inserted Transaktionen und GET findet sie", async () => {
    const post = await POST(
      nextReq("http://localhost/api/transactions", "POST", {
        transactions: [txInput()],
      })
    );
    const inserted = await post.json();
    expect(inserted.inserted).toBeGreaterThan(0);

    const get = await GET();
    const json = await get.json();
    expect(json.transactions).toHaveLength(1);
    expect(json.transactions[0].nameZahlungsbeteiligter).toBe("Beispiel GmbH");
  });

  it("POST mit leerem Array fügt nichts ein", async () => {
    const res = await POST(
      nextReq("http://localhost/api/transactions", "POST", { transactions: [] })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.inserted ?? 0).toBe(0);
  });

  it("POST mit fehlendem transactions-Key wird abgelehnt", async () => {
    const res = await POST(
      nextReq("http://localhost/api/transactions", "POST", {})
    );
    expect(res.status).toBe(400);
  });

  it("DELETE löscht alle Transaktionen", async () => {
    await POST(
      nextReq("http://localhost/api/transactions", "POST", {
        transactions: [txInput()],
      })
    );
    const del = await DELETE();
    const delJson = await del.json();
    expect(delJson.deleted).toBeGreaterThan(0);

    const get = await GET();
    const json = await get.json();
    expect(json.transactions).toEqual([]);
  });
});

describe("/api/transactions — Kategorie-Übernahme aus Verlauf", () => {
  async function post(transactions: unknown[]) {
    return POST(
      nextReq("http://localhost/api/transactions", "POST", { transactions })
    );
  }

  it("neuer Import erbt die Kategorie gleicher früherer Buchung", async () => {
    // Historie: REWE wurde als Lebensmittel kategorisiert
    await post([
      txInput({
        nameZahlungsbeteiligter: "REWE Markt",
        verwendungszweck: "Einkauf Januar",
        betrag: -55,
        kategorie: "Lebensmittel",
      }),
    ]);
    // Neuer Import: REWE ohne Kategorie (→ Sonstiges)
    await post([
      txInput({
        nameZahlungsbeteiligter: "REWE Markt",
        verwendungszweck: "Einkauf Februar",
        betrag: -61,
        buchungstag: "2025-02-10",
        valutadatum: "2025-02-10",
        kategorie: "",
      }),
    ]);

    const json = await (await GET()).json();
    const februar = json.transactions.find(
      (t: { verwendungszweck: string }) =>
        t.verwendungszweck === "Einkauf Februar"
    );
    expect(februar.kategorie).toBe("Lebensmittel");
  });

  it("lässt Regel-Treffer der neuen Buchung unangetastet", async () => {
    await post([
      txInput({
        nameZahlungsbeteiligter: "REWE Markt",
        verwendungszweck: "Einkauf Januar",
        betrag: -55,
        kategorie: "Lebensmittel",
      }),
    ]);
    // Neue REWE-Buchung, die bereits eine Nicht-Fallback-Kategorie trägt
    await post([
      txInput({
        nameZahlungsbeteiligter: "REWE Markt",
        verwendungszweck: "Einkauf Februar",
        betrag: -61,
        buchungstag: "2025-02-10",
        valutadatum: "2025-02-10",
        kategorie: "Geschenke",
      }),
    ]);

    const json = await (await GET()).json();
    const februar = json.transactions.find(
      (t: { verwendungszweck: string }) =>
        t.verwendungszweck === "Einkauf Februar"
    );
    expect(februar.kategorie).toBe("Geschenke");
  });

  it("unbekannter Counterparty bleibt Sonstiges", async () => {
    await post([
      txInput({
        nameZahlungsbeteiligter: "Noch Nie Gesehen GmbH",
        verwendungszweck: "Erstkontakt",
        kategorie: "",
      }),
    ]);
    const json = await (await GET()).json();
    expect(json.transactions[0].kategorie).toBe("Sonstiges");
  });
});
