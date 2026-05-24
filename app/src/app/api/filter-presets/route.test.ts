import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";
import { PATCH, DELETE } from "./[id]/route";
import { jsonRequest, setupFreshInMemoryDb } from "../../../lib/test-helpers";

setupFreshInMemoryDb();

function nextReq(url: string, method: string, body: unknown): NextRequest {
  return new NextRequest(jsonRequest(url, method, body));
}

const samplePayload = JSON.stringify({
  auswertung: { preset: "lfdMonat" },
  kontogruppen: { inhaberIds: [], kontogruppeIds: [], includeNone: false },
});

describe("/api/filter-presets", () => {
  it("GET liefert leere Liste auf frischer DB", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.presets).toEqual([]);
  });

  it("POST legt Preset an und vergibt sort_order automatisch", async () => {
    const a = await POST(
      nextReq("http://localhost/api/filter-presets", "POST", {
        name: "Letzter Monat",
        payload: samplePayload,
      })
    );
    expect(a.status).toBe(200);
    const aj = await a.json();
    expect(aj.preset.name).toBe("Letzter Monat");
    expect(aj.preset.sortOrder).toBe(0);

    const b = await POST(
      nextReq("http://localhost/api/filter-presets", "POST", {
        name: "Vorquartal",
        payload: samplePayload,
      })
    );
    const bj = await b.json();
    expect(bj.preset.sortOrder).toBe(1);
  });

  it("POST mit doppeltem Namen liefert 409", async () => {
    await POST(
      nextReq("http://localhost/api/filter-presets", "POST", {
        name: "Mein Filter",
        payload: samplePayload,
      })
    );
    const dup = await POST(
      nextReq("http://localhost/api/filter-presets", "POST", {
        name: "Mein Filter",
        payload: samplePayload,
      })
    );
    expect(dup.status).toBe(409);
  });

  it("PATCH aktualisiert Name und Payload", async () => {
    const create = await POST(
      nextReq("http://localhost/api/filter-presets", "POST", {
        name: "Alt",
        payload: samplePayload,
      })
    );
    const id = (await create.json()).preset.id as number;
    const upd = await PATCH(
      nextReq(`http://localhost/api/filter-presets/${id}`, "PATCH", {
        name: "Neu",
        payload: JSON.stringify({ auswertung: { preset: "vorjahr" } }),
      }),
      { params: Promise.resolve({ id: String(id) }) }
    );
    expect(upd.status).toBe(200);
    const all = await (await GET()).json();
    expect(all.presets[0].name).toBe("Neu");
  });

  it("DELETE entfernt das Preset", async () => {
    const create = await POST(
      nextReq("http://localhost/api/filter-presets", "POST", {
        name: "Weg",
        payload: samplePayload,
      })
    );
    const id = (await create.json()).preset.id as number;
    const del = await DELETE(
      nextReq(`http://localhost/api/filter-presets/${id}`, "DELETE", {}),
      { params: Promise.resolve({ id: String(id) }) }
    );
    expect((await del.json()).deleted).toBe(true);
    const all = await (await GET()).json();
    expect(all.presets).toEqual([]);
  });
});
