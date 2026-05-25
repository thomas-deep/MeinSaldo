import { NextRequest, NextResponse } from "next/server";
import { bulkUpsertLiabilitySnapshots } from "../../../../../../lib/db";
import {
  parseBody,
  snapshotsBulkSchema,
} from "../../../../../../lib/api-validation";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const parsed = await parseBody(req, snapshotsBulkSchema);
  if (!parsed.ok) return parsed.response;
  const upserted = bulkUpsertLiabilitySnapshots(
    parseInt(id, 10),
    parsed.data.snapshots
  );
  return NextResponse.json({ upserted });
}
