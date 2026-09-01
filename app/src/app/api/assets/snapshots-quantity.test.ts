import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import {
  bulkUpsertAssetSnapshots,
  createAsset,
  getAssetSnapshots,
  upsertAssetSnapshot,
} from "../../../lib/db";
import {
  GET as snapshotsGet,
  POST as snapshotPost,
} from "./[id]/snapshots/route";
import { jsonRequest, setupFreshInMemoryDb } from "../../../lib/test-helpers";

setupFreshInMemoryDb();

function nextReq(url: string, method: string, body: unknown): NextRequest {
  return new NextRequest(jsonRequest(url, method, body));
}

const routeParams = (id: number) => ({
  params: Promise.resolve({ id: String(id) }),
});

describe("upsertAssetSnapshot mit Menge × Preis (DB)", () => {
  it("speichert quantity und unitPrice und liefert sie über getAssetSnapshots", () => {
    const a = createAsset("Gold", "Edelmetall", null);
    upsertAssetSnapshot(a.id, "2026-08-31", 30000, 12.5, 2400);
    const snaps = getAssetSnapshots(a.id);
    expect(snaps).toHaveLength(1);
    expect(snaps[0]).toMatchObject({
      date: "2026-08-31",
      value: 30000,
      quantity: 12.5,
      unitPrice: 2400,
    });
  });

  it("Plain-Value-Update am gleichen Datum löscht die Aufschlüsselung", () => {
    const a = createAsset("Gold", "Edelmetall", null);
    upsertAssetSnapshot(a.id, "2026-08-31", 30000, 12.5, 2400);
    upsertAssetSnapshot(a.id, "2026-08-31", 31000);
    const snaps = getAssetSnapshots(a.id);
    expect(snaps).toHaveLength(1);
    expect(snaps[0].value).toBe(31000);
    expect(snaps[0].quantity).toBeNull();
    expect(snaps[0].unitPrice).toBeNull();
  });

  it("Bulk-Upsert am gleichen Datum löscht die Aufschlüsselung ebenfalls", () => {
    const a = createAsset("Gold", "Edelmetall", null);
    upsertAssetSnapshot(a.id, "2026-08-31", 30000, 12.5, 2400);
    bulkUpsertAssetSnapshots(a.id, [{ date: "2026-08-31", value: 29500 }]);
    const snaps = getAssetSnapshots(a.id);
    expect(snaps).toHaveLength(1);
    expect(snaps[0].value).toBe(29500);
    expect(snaps[0].quantity).toBeNull();
    expect(snaps[0].unitPrice).toBeNull();
  });
});

describe("POST /api/assets/[id]/snapshots mit quantity + unitPrice", () => {
  it("berechnet value = quantity × unitPrice", async () => {
    const a = createAsset("Gold", "Edelmetall", null);
    const res = await snapshotPost(
      nextReq("http://localhost/api/assets/x/snapshots", "POST", {
        date: "2026-08-31",
        quantity: 12.5,
        unitPrice: 2400.1,
      }),
      routeParams(a.id)
    );
    expect(res.status).toBe(200);
    const snaps = getAssetSnapshots(a.id);
    expect(snaps[0].value).toBe(30001.25);
    expect(snaps[0].quantity).toBe(12.5);
    expect(snaps[0].unitPrice).toBe(2400.1);
  });

  it("rundet das Produkt auf Cent", async () => {
    const a = createAsset("Gold", "Edelmetall", null);
    const res = await snapshotPost(
      nextReq("http://localhost/api/assets/x/snapshots", "POST", {
        date: "2026-08-31",
        quantity: 1.5,
        unitPrice: 33.333,
      }),
      routeParams(a.id)
    );
    expect(res.status).toBe(200);
    expect(getAssetSnapshots(a.id)[0].value).toBe(50);
  });

  it("value-only-Body funktioniert unverändert weiter", async () => {
    const a = createAsset("Depot", "manual", null);
    const res = await snapshotPost(
      nextReq("http://localhost/api/assets/x/snapshots", "POST", {
        date: "2026-08-31",
        value: 12500,
      }),
      routeParams(a.id)
    );
    expect(res.status).toBe(200);
    const snaps = getAssetSnapshots(a.id);
    expect(snaps[0].value).toBe(12500);
    expect(snaps[0].quantity).toBeNull();
    expect(snaps[0].unitPrice).toBeNull();
  });

  it("lehnt quantity ohne unitPrice ab (400)", async () => {
    const a = createAsset("Gold", "Edelmetall", null);
    const res = await snapshotPost(
      nextReq("http://localhost/api/assets/x/snapshots", "POST", {
        date: "2026-08-31",
        quantity: 12.5,
      }),
      routeParams(a.id)
    );
    expect(res.status).toBe(400);
  });

  it("lehnt Body ohne value und ohne Paar ab (400)", async () => {
    const a = createAsset("Gold", "Edelmetall", null);
    const res = await snapshotPost(
      nextReq("http://localhost/api/assets/x/snapshots", "POST", {
        date: "2026-08-31",
      }),
      routeParams(a.id)
    );
    expect(res.status).toBe(400);
  });

  it("lehnt negative quantity ab (400)", async () => {
    const a = createAsset("Gold", "Edelmetall", null);
    const res = await snapshotPost(
      nextReq("http://localhost/api/assets/x/snapshots", "POST", {
        date: "2026-08-31",
        quantity: -1,
        unitPrice: 2400,
      }),
      routeParams(a.id)
    );
    expect(res.status).toBe(400);
  });

  it("GET liefert quantity und unitPrice mit aus", async () => {
    const a = createAsset("Gold", "Edelmetall", null);
    upsertAssetSnapshot(a.id, "2026-08-31", 30000, 12.5, 2400);
    const res = await snapshotsGet(
      new NextRequest("http://localhost/api/assets/x/snapshots"),
      routeParams(a.id)
    );
    const json = await res.json();
    expect(json.snapshots).toEqual([
      { date: "2026-08-31", value: 30000, quantity: 12.5, unitPrice: 2400 },
    ]);
  });
});
