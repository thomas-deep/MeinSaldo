import { NextRequest } from "next/server";
import { createBackupBuffer } from "../../../lib/backup";
import {
  backupErrorResponse,
  fileDownloadResponse,
} from "../../../lib/backup-response";
import { backupCreateSchema, parseBody } from "../../../lib/api-validation";

/**
 * Erzeugt einen Snapshot und streamt ihn direkt zum Download, ohne ihn in
 * `backups/` abzulegen. Sibling-Route (nicht unter `/api/backups/[name]`), um
 * den Next-16-Konflikt statischer Segmente mit dem dynamischen `[name]` zu
 * vermeiden — analog zu `/api/transactions-bulk`.
 */
export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, backupCreateSchema);
  if (!parsed.ok) return parsed.response;
  try {
    const { filename, data } = createBackupBuffer({
      encrypt: parsed.data.encrypt,
      password: parsed.data.password,
    });
    return fileDownloadResponse(filename, data);
  } catch (e) {
    return backupErrorResponse(e);
  }
}
