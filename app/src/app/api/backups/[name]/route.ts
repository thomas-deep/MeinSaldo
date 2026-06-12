import { NextResponse } from "next/server";
import { deleteBackup, readBackup } from "../../../../lib/backup";
import {
  backupErrorResponse,
  fileDownloadResponse,
} from "../../../../lib/backup-response";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  try {
    const { data, info } = readBackup(decodeURIComponent(name));
    return fileDownloadResponse(info.name, data);
  } catch (e) {
    return backupErrorResponse(e);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  try {
    const deleted = deleteBackup(decodeURIComponent(name));
    return NextResponse.json({ deleted });
  } catch (e) {
    return backupErrorResponse(e);
  }
}
