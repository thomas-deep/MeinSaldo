import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";
import { POST as createInhaberPost } from "../inhaber/route";
import { setupFreshInMemoryDb, jsonRequest } from "../../../lib/test-helpers";

setupFreshInMemoryDb();

function nextReq(url: string, method: string, body: unknown): NextRequest {
  return new NextRequest(jsonRequest(url, method, body));
}

async function createInhaberFixture(): Promise<number> {
  const res = await createInhaberPost(
    nextReq("http://localhost/api/inhaber", "POST", {
      name: "Beispiel",
      type: "privat",
      color: "#abcdef",
    })
  );
  const json = await res.json();
  return json.inhaber.id as number;
}

describe("/api/kontogruppen", () => {
  it("GET liefert leere Liste auf frischer DB", async () => {
    const res = await GET();
    const json = await res.json();
    expect(json.kontogruppen).toEqual([]);
  });

  it("POST legt Kontogruppe für einen Inhaber an", async () => {
    const inhaberId = await createInhaberFixture();
    const res = await POST(
      nextReq("http://localhost/api/kontogruppen", "POST", {
        name: "Giro",
        inhaberId,
        art: "girokonto",
        color: "#112233",
        icon: "user",
      })
    );
    const json = await res.json();
    expect(json.kontogruppe.name).toBe("Giro");
    expect(json.kontogruppe.inhaberId).toBe(inhaberId);
    expect(json.kontogruppe.art).toBe("girokonto");
  });

  it("POST ohne existierenden Inhaber liefert 400", async () => {
    const res = await POST(
      nextReq("http://localhost/api/kontogruppen", "POST", {
        name: "Giro",
        inhaberId: 9999,
        color: "#112233",
      })
    );
    expect(res.status).toBe(400);
  });

  it("POST mit ungültiger Farbe wird abgelehnt (Zod)", async () => {
    const inhaberId = await createInhaberFixture();
    const res = await POST(
      nextReq("http://localhost/api/kontogruppen", "POST", {
        name: "Giro",
        inhaberId,
        color: "nicht-hex",
      })
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("validation failed");
  });
});
