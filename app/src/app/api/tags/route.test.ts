import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";
import { setupFreshInMemoryDb, jsonRequest } from "../../../lib/test-helpers";

setupFreshInMemoryDb();

function nextReq(url: string, method: string, body: unknown): NextRequest {
  return new NextRequest(jsonRequest(url, method, body));
}

describe("/api/tags", () => {
  it("GET leere DB → leere Liste", async () => {
    const res = await GET();
    const json = await res.json();
    expect(json.tags).toEqual([]);
  });

  it("POST legt Tag an", async () => {
    const res = await POST(
      nextReq("http://localhost/api/tags", "POST", {
        name: "urlaub-2025",
        color: "#3b82f6",
      })
    );
    const json = await res.json();
    expect(json.tag.name).toBe("urlaub-2025");
    expect(json.tag.id).toBeTypeOf("number");
  });

  it("POST mit Duplikat-Namen liefert 400", async () => {
    await POST(
      nextReq("http://localhost/api/tags", "POST", {
        name: "doppelt",
        color: "#3b82f6",
      })
    );
    const res = await POST(
      nextReq("http://localhost/api/tags", "POST", {
        name: "doppelt",
        color: "#3b82f6",
      })
    );
    expect(res.status).toBe(400);
  });

  it("POST mit ungültiger Farbe wird abgelehnt", async () => {
    const res = await POST(
      nextReq("http://localhost/api/tags", "POST", {
        name: "x",
        color: "blau",
      })
    );
    expect(res.status).toBe(400);
  });

  it("POST mit leerem Namen wird abgelehnt", async () => {
    const res = await POST(
      nextReq("http://localhost/api/tags", "POST", {
        name: "",
        color: "#3b82f6",
      })
    );
    expect(res.status).toBe(400);
  });
});
