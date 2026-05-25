import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import {
  bulkUpsertAssetSnapshots,
  createAsset,
  getAssetSnapshots,
} from "../../../lib/db";
import { POST as bulkPost } from "./[id]/snapshots/bulk/route";
import { jsonRequest, setupFreshInMemoryDb } from "../../../lib/test-helpers";

setupFreshInMemoryDb();

function nextReq(url: string, method: string, body: unknown): NextRequest {
  return new NextRequest(jsonRequest(url, method, body));
}

describe("bulkUpsertAssetSnapshots (DB)", () => {
  it("schreibt mehrere Snapshots in einer Transaction", () => {
    const a = createAsset("Depot", "manual", null);
    const n = bulkUpsertAssetSnapshots(a.id, [
      { date: "2026-01-31", value: 12500 },
      { date: "2026-02-28", value: 12640.5 },
      { date: "2026-03-31", value: 12880 },
    ]);
    expect(n).toBe(3);
    const snaps = getAssetSnapshots(a.id);
    expect(snaps.map((s) => s.date)).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
    ]);
    expect(snaps.find((s) => s.date === "2026-02-28")?.value).toBeCloseTo(
      12640.5
    );
  });

  it("aktualisiert bestehende Werte am gleichen Datum", () => {
    const a = createAsset("Depot", "manual", null);
    bulkUpsertAssetSnapshots(a.id, [{ date: "2026-01-31", value: 100 }]);
    bulkUpsertAssetSnapshots(a.id, [{ date: "2026-01-31", value: 250 }]);
    const snaps = getAssetSnapshots(a.id);
    expect(snaps).toHaveLength(1);
    expect(snaps[0].value).toBe(250);
  });
});

describe("POST /api/assets/[id]/snapshots/bulk", () => {
  it("akzeptiert valides Bulk-Payload und antwortet mit Anzahl", async () => {
    const a = createAsset("Depot", "manual", null);
    const res = await bulkPost(
      nextReq("http://localhost/api/assets/x/snapshots/bulk", "POST", {
        snapshots: [
          { date: "2026-01-31", value: 100 },
          { date: "2026-02-28", value: 200 },
        ],
      }),
      { params: Promise.resolve({ id: String(a.id) }) }
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.upserted).toBe(2);
  });

  it("lehnt invalides Datum via Zod ab (400)", async () => {
    const a = createAsset("Depot", "manual", null);
    const res = await bulkPost(
      nextReq("http://localhost/api/assets/x/snapshots/bulk", "POST", {
        snapshots: [{ date: "31.01.2026", value: 100 }],
      }),
      { params: Promise.resolve({ id: String(a.id) }) }
    );
    expect(res.status).toBe(400);
  });

  it("lehnt leeres Snapshot-Array ab (400)", async () => {
    const a = createAsset("Depot", "manual", null);
    const res = await bulkPost(
      nextReq("http://localhost/api/assets/x/snapshots/bulk", "POST", {
        snapshots: [],
      }),
      { params: Promise.resolve({ id: String(a.id) }) }
    );
    expect(res.status).toBe(400);
  });
});
