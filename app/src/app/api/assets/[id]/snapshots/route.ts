import { NextRequest, NextResponse } from "next/server";
import {
  getAssetSnapshots,
  upsertAssetSnapshot,
} from "../../../../../lib/db";
import {
  parseBody,
  assetSnapshotSchema,
} from "../../../../../lib/api-validation";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return NextResponse.json({
    snapshots: getAssetSnapshots(parseInt(id, 10)),
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const parsed = await parseBody(req, assetSnapshotSchema);
  if (!parsed.ok) return parsed.response;
  const assetId = parseInt(id, 10);
  const { date, value, quantity, unitPrice } = parsed.data;
  if (quantity !== undefined && unitPrice !== undefined) {
    const computed = Math.round(quantity * unitPrice * 100) / 100;
    upsertAssetSnapshot(assetId, date, computed, quantity, unitPrice);
  } else if (value !== undefined) {
    upsertAssetSnapshot(assetId, date, value);
  } else {
    // Durch das Zod-Refine ausgeschlossen, aber TypeScript kennt das nicht.
    return NextResponse.json({ error: "value fehlt" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
