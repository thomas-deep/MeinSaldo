import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  deleteImportBatch,
  getImportBatches,
  logEvent,
  reassignImportBatch,
  trimLogs,
} from "../../../lib/db";
import { parseBody } from "../../../lib/api-validation";

export async function GET() {
  return NextResponse.json({ imports: getImportBatches() });
}

const patchSchema = z.object({
  importedAt: z.string().min(1),
  kontogruppeId: z.union([z.number().int(), z.null()]),
});

export async function PATCH(req: NextRequest) {
  const parsed = await parseBody(req, patchSchema);
  if (!parsed.ok) return parsed.response;
  const updated = reassignImportBatch(
    parsed.data.importedAt,
    parsed.data.kontogruppeId
  );
  logEvent(
    "info",
    "import.reassign",
    `${updated} Buchungen aus Import ${parsed.data.importedAt} → Konto ${parsed.data.kontogruppeId ?? "(keine)"}`,
    { count: updated, ...parsed.data }
  );
  trimLogs();
  return NextResponse.json({ updated });
}

const deleteSchema = z.object({
  importedAt: z.string().min(1),
});

export async function DELETE(req: NextRequest) {
  const parsed = await parseBody(req, deleteSchema);
  if (!parsed.ok) return parsed.response;
  const deleted = deleteImportBatch(parsed.data.importedAt);
  logEvent(
    "warn",
    "import.delete",
    `${deleted} Buchungen aus Import ${parsed.data.importedAt} gelöscht`,
    { count: deleted, importedAt: parsed.data.importedAt }
  );
  trimLogs();
  return NextResponse.json({ deleted });
}
