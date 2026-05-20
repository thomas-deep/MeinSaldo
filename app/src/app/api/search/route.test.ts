import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
import { POST as createTransactionsPost } from "../transactions/route";
import { setupFreshInMemoryDb, jsonRequest } from "../../../lib/test-helpers";

setupFreshInMemoryDb();

function searchReq(q: string): NextRequest {
  return new NextRequest(`http://localhost/api/search?q=${encodeURIComponent(q)}`);
}

async function seed(): Promise<void> {
  const post = await createTransactionsPost(
    new NextRequest(
      jsonRequest("http://localhost/api/transactions", "POST", {
        transactions: [
          {
            id: "a",
            kontoBezeichnung: "Giro",
            ibanKonto: "DE00000000000000000000",
            buchungstag: "2025-01-15",
            valutadatum: "2025-01-15",
            nameZahlungsbeteiligter: "Beispiel GmbH",
            ibanZahlungsbeteiligter: "DE99999999999999999999",
            buchungstext: "Lastschrift",
            verwendungszweck: "Rechnung Nummer 1234 Hosting",
            betrag: -42.5,
            waehrung: "EUR",
            saldoNachBuchung: 1000,
            kategorie: "",
          },
          {
            id: "b",
            kontoBezeichnung: "Giro",
            ibanKonto: "DE00000000000000000000",
            buchungstag: "2025-02-01",
            valutadatum: "2025-02-01",
            nameZahlungsbeteiligter: "Supermarkt AG",
            ibanZahlungsbeteiligter: "DE88888888888888888888",
            buchungstext: "Kartenzahlung",
            verwendungszweck: "Wocheneinkauf",
            betrag: -78.9,
            waehrung: "EUR",
            saldoNachBuchung: 921,
            kategorie: "",
          },
        ],
      })
    )
  );
  await post.json();
}

describe("/api/search", () => {
  it("leere Query liefert leere Ergebnisliste", async () => {
    await seed();
    const res = await GET(searchReq(""));
    const json = await res.json();
    expect(json.transactions).toEqual([]);
  });

  it("findet Treffer im Verwendungszweck", async () => {
    await seed();
    const res = await GET(searchReq("Hosting"));
    const json = await res.json();
    expect(json.transactions).toHaveLength(1);
    expect(json.transactions[0].nameZahlungsbeteiligter).toBe("Beispiel GmbH");
  });

  it("findet Treffer im Counterparty-Namen", async () => {
    await seed();
    const res = await GET(searchReq("Supermarkt"));
    const json = await res.json();
    expect(json.transactions).toHaveLength(1);
  });

  it("Prefix-Suche: 'Bei' findet 'Beispiel'", async () => {
    await seed();
    const res = await GET(searchReq("Bei"));
    const json = await res.json();
    expect(json.transactions).toHaveLength(1);
  });

  it("Sonderzeichen in Query werfen keinen FTS-Syntax-Error", async () => {
    await seed();
    const res = await GET(searchReq('test"*('));
    expect(res.status).toBe(200);
  });
});
