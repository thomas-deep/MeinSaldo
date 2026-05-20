import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
import { POST as createTransactionsPost } from "../transactions/route";
import { setupFreshInMemoryDb, jsonRequest } from "../../../lib/test-helpers";

setupFreshInMemoryDb();

async function seedMonthly(name: string, amount: number, months: string[]) {
  const transactions = months.map((d, i) => ({
    id: `${name}-${i}`,
    kontoBezeichnung: "Giro",
    ibanKonto: "DE00000000000000000000",
    buchungstag: d,
    valutadatum: d,
    nameZahlungsbeteiligter: name,
    ibanZahlungsbeteiligter: "DE99999999999999999999",
    buchungstext: "",
    verwendungszweck: "",
    betrag: amount,
    waehrung: "EUR",
    saldoNachBuchung: 0,
    kategorie: "",
  }));
  await createTransactionsPost(
    new NextRequest(
      jsonRequest("http://localhost/api/transactions", "POST", { transactions })
    )
  );
}

describe("/api/recurring", () => {
  it("leere DB → leere Serien", async () => {
    const res = await GET();
    const json = await res.json();
    expect(json.series).toEqual([]);
  });

  it("findet eine monatliche Serie", async () => {
    await seedMonthly("Vermieter", -800, [
      "2025-01-15",
      "2025-02-15",
      "2025-03-15",
    ]);
    const res = await GET();
    const json = await res.json();
    expect(json.series).toHaveLength(1);
    expect(json.series[0].interval).toBe("monthly");
    expect(json.series[0].name).toBe("Vermieter");
  });
});
