import { NextRequest, NextResponse } from "next/server";
import {
  getLiabilitySnapshots,
  upsertLiabilitySnapshot,
} from "../../../../../lib/db";
import { parseBody, snapshotSchema } from "../../../../../lib/api-validation";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return NextResponse.json({
    snapshots: getLiabilitySnapshots(parseInt(id, 10)),
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const parsed = await parseBody(req, snapshotSchema);
  if (!parsed.ok) return parsed.response;
  upsertLiabilitySnapshot(
    parseInt(id, 10),
    parsed.data.date,
    parsed.data.value
  );
  return NextResponse.json({ ok: true });
}
