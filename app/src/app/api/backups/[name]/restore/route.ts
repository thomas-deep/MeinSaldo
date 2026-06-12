import { NextRequest, NextResponse } from "next/server";
import { restoreFromStored } from "../../../../../lib/backup";
import { backupErrorResponse } from "../../../../../lib/backup-response";
import { backupRestoreSchema, parseBody } from "../../../../../lib/api-validation";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const parsed = await parseBody(req, backupRestoreSchema);
  if (!parsed.ok) return parsed.response;
  try {
    restoreFromStored(decodeURIComponent(name), parsed.data.password);
    return NextResponse.json({ restored: true });
  } catch (e) {
    return backupErrorResponse(e);
  }
}
