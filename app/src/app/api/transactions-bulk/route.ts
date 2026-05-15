import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  bulkSetUmbuchungOverride,
  bulkUpdateCategory,
  bulkUpdateKontogruppe,
  deleteTransactionsByIds,
  logEvent,
  trimLogs,
} from "../../../lib/db";
import { parseBody } from "../../../lib/api-validation";

const baseSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, "ids array darf nicht leer sein"),
});

const patchSchema = baseSchema.extend({
  kategorie: z.string().min(1).max(64).optional(),
  umbuchung: z.union([z.boolean(), z.null()]).optional(),
  kontogruppeId: z.union([z.number().int(), z.null()]).optional(),
});

const deleteSchema = baseSchema;

export async function PATCH(req: NextRequest) {
  const parsed = await parseBody(req, patchSchema);
  if (!parsed.ok) return parsed.response;
  const { ids, kategorie, umbuchung, kontogruppeId } = parsed.data;

  if (
    kategorie === undefined &&
    umbuchung === undefined &&
    kontogruppeId === undefined
  ) {
    return NextResponse.json(
      { error: "Mindestens 'kategorie', 'umbuchung' oder 'kontogruppeId' angeben" },
      { status: 400 }
    );
  }

  let updated = 0;
  if (kategorie !== undefined) {
    updated = bulkUpdateCategory(ids, kategorie);
    logEvent(
      "info",
      "bulk.category",
      `${updated} Buchungen → Kategorie '${kategorie}'`,
      { count: updated, kategorie }
    );
  }
  if (umbuchung !== undefined) {
    const u = bulkSetUmbuchungOverride(ids, umbuchung);
    updated = Math.max(updated, u);
    logEvent(
      "info",
      "bulk.umbuchung",
      `${u} Buchungen Umbuchung=${umbuchung}`,
      { count: u, umbuchung }
    );
  }
  if (kontogruppeId !== undefined) {
    const k = bulkUpdateKontogruppe(ids, kontogruppeId);
    updated = Math.max(updated, k);
    logEvent(
      "info",
      "bulk.kontogruppe",
      `${k} Buchungen → Kontogruppe ${kontogruppeId ?? "(keine)"}`,
      { count: k, kontogruppeId }
    );
  }
  trimLogs();
  return NextResponse.json({ updated });
}

export async function DELETE(req: NextRequest) {
  const parsed = await parseBody(req, deleteSchema);
  if (!parsed.ok) return parsed.response;
  const deleted = deleteTransactionsByIds(parsed.data.ids);
  logEvent("warn", "bulk.delete", `${deleted} Buchungen gelöscht`, {
    count: deleted,
  });
  trimLogs();
  return NextResponse.json({ deleted });
}
