import { NextRequest, NextResponse } from "next/server";
import { createBackup, listBackups } from "../../../lib/backup";
import { backupErrorResponse } from "../../../lib/backup-response";
import { backupCreateSchema, parseBody } from "../../../lib/api-validation";

export async function GET() {
  return NextResponse.json({ backups: listBackups() });
}

export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, backupCreateSchema);
  if (!parsed.ok) return parsed.response;
  try {
    const backup = createBackup({
      encrypt: parsed.data.encrypt,
      password: parsed.data.password,
    });
    return NextResponse.json({ backup });
  } catch (e) {
    return backupErrorResponse(e);
  }
}
