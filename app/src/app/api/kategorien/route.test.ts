import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";
import { setupFreshInMemoryDb, jsonRequest } from "../../../lib/test-helpers";

setupFreshInMemoryDb();

function nextReq(url: string, method: string, body: unknown): NextRequest {
  return new NextRequest(jsonRequest(url, method, body));
}

describe("/api/kategorien", () => {
  it("GET liefert die Default-Kategorien-Regeln", async () => {
    const res = await GET();
    const json = await res.json();
    expect(Array.isArray(json.kategorien)).toBe(true);
    expect(json.kategorien.length).toBeGreaterThan(0);
    const namen = json.kategorien.map((k: { name: string }) => k.name);
    expect(namen).toContain("Sonstiges");
  });

  it("POST legt neue Kategorie mit Keywords an", async () => {
    const res = await POST(
      nextReq("http://localhost/api/kategorien", "POST", {
        name: "Testkategorie",
        keywords: ["foo", "bar"],
        namePatterns: ["beispiel-merchant"],
        direction: "ausgabe",
      })
    );
    const json = await res.json();
    expect(json.kategorie.name).toBe("Testkategorie");
    expect(json.kategorie.keywords).toEqual(["foo", "bar"]);
    expect(json.kategorie.direction).toBe("ausgabe");
  });

  it("POST mit leerem Namen wird abgelehnt", async () => {
    const res = await POST(
      nextReq("http://localhost/api/kategorien", "POST", { name: "" })
    );
    expect(res.status).toBe(400);
  });

  it("POST mit ungültiger Direction wird abgelehnt", async () => {
    const res = await POST(
      nextReq("http://localhost/api/kategorien", "POST", {
        name: "X",
        direction: "unsinn",
      })
    );
    expect(res.status).toBe(400);
  });

  it("POST mit Duplikat-Name liefert 400", async () => {
    await POST(
      nextReq("http://localhost/api/kategorien", "POST", { name: "Doppelt" })
    );
    const res = await POST(
      nextReq("http://localhost/api/kategorien", "POST", { name: "Doppelt" })
    );
    expect(res.status).toBe(400);
  });
});
