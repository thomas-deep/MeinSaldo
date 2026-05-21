import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { PATCH } from "./route";
import { POST as createTransactions } from "../transactions/route";
import { POST as createTag } from "../tags/route";
import { setupFreshInMemoryDb, jsonRequest } from "../../../lib/test-helpers";

setupFreshInMemoryDb();

function tx(id: string) {
  return {
    id,
    kontoBezeichnung: "Giro",
    ibanKonto: "DE00000000000000000000",
    buchungstag: "2025-03-01",
    valutadatum: "2025-03-01",
    nameZahlungsbeteiligter: "Beispiel GmbH",
    ibanZahlungsbeteiligter: "DE99999999999999999999",
    buchungstext: "Lastschrift",
    verwendungszweck: "Rechnung Hosting",
    betrag: -10,
    waehrung: "EUR",
    saldoNachBuchung: 0,
    kategorie: "",
  };
}

async function seedTwo(): Promise<string[]> {
  const res = await createTransactions(
    new NextRequest(
      jsonRequest("http://localhost/api/transactions", "POST", {
        transactions: [tx("a"), tx("b")],
      })
    )
  );
  const json = await res.json();
  return json.insertedIds as string[];
}

describe("/api/transactions-bulk", () => {
  it("PATCH kategorie aktualisiert die Buchungen (FTS-Trigger feuert ohne Crash)", async () => {
    const ids = await seedTwo();
    const res = await PATCH(
      new NextRequest(
        jsonRequest("http://localhost/api/transactions-bulk", "PATCH", {
          ids,
          kategorie: "Sonstiges",
        })
      )
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.updated).toBe(ids.length);
  });

  it("PATCH addTagId hängt einen Tag an alle Buchungen", async () => {
    const ids = await seedTwo();
    const tagRes = await createTag(
      new NextRequest(
        jsonRequest("http://localhost/api/tags", "POST", {
          name: "testtag",
          color: "#3b82f6",
        })
      )
    );
    const tagId = (await tagRes.json()).tag.id as number;

    const res = await PATCH(
      new NextRequest(
        jsonRequest("http://localhost/api/transactions-bulk", "PATCH", {
          ids,
          addTagId: tagId,
        })
      )
    );
    expect(res.status).toBe(200);
    expect((await res.json()).updated).toBe(ids.length);
  });

  it("PATCH ohne Mutationsfeld liefert 400", async () => {
    const ids = await seedTwo();
    const res = await PATCH(
      new NextRequest(
        jsonRequest("http://localhost/api/transactions-bulk", "PATCH", { ids })
      )
    );
    expect(res.status).toBe(400);
  });
});
