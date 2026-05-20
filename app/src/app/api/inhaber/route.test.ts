import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";
import { setupFreshInMemoryDb, jsonRequest } from "../../../lib/test-helpers";

setupFreshInMemoryDb();

function nextReq(url: string, method: string, body: unknown): NextRequest {
  return new NextRequest(jsonRequest(url, method, body));
}

describe("/api/inhaber", () => {
  it("GET liefert leere Liste auf frischer DB", async () => {
    const res = await GET();
    const json = await res.json();
    expect(json.inhaber).toEqual([]);
  });

  it("POST legt Inhaber an und GET liefert ihn", async () => {
    const post = await POST(
      nextReq("http://localhost/api/inhaber", "POST", {
        name: "Beispiel",
        type: "privat",
        color: "#abcdef",
      })
    );
    const created = await post.json();
    expect(created.inhaber.name).toBe("Beispiel");
    expect(created.inhaber.type).toBe("privat");
    expect(created.inhaber.id).toBeTypeOf("number");

    const get = await GET();
    const list = await get.json();
    expect(list.inhaber).toHaveLength(1);
    expect(list.inhaber[0].name).toBe("Beispiel");
  });

  it("POST mit ungültigem Type liefert 400", async () => {
    const res = await POST(
      nextReq("http://localhost/api/inhaber", "POST", {
        name: "X",
        type: "ungueltig",
        color: "#abcdef",
      })
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("validation failed");
  });

  it("POST mit invalidem JSON-Body liefert 400", async () => {
    const req = new NextRequest(
      new Request("http://localhost/api/inhaber", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{not json",
      })
    );
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("POST mit leerem Namen wird abgelehnt", async () => {
    const res = await POST(
      nextReq("http://localhost/api/inhaber", "POST", {
        name: "",
        type: "privat",
        color: "#abcdef",
      })
    );
    expect(res.status).toBe(400);
  });
});
