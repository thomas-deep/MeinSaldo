import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  bulkSetUmbuchungOverride,
  bulkUpdateCategory,
  deleteTransactionsByIds,
  logEvent,
  trimLogs,
} from "../../../../lib/db";
import { parseBody } from "../../../../lib/api-validation";

const baseSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, "ids array darf nicht leer sein"),
});

const patchSchema = baseSchema.extend({
  kategorie: z.string().min(1).max(64).optional(),
  umbuchung: z.union([z.boolean(), z.null()]).optional(),
});

const deleteSchema = baseSchema;

export async function PATCH(req: NextRequest) {
  const parsed = await parseBody(req, patchSchema);
  if (!parsed.ok) return parsed.response;
  const { ids, kategorie, umbuchung } = parsed.data;

  if (kategorie === undefined && umbuchung === undefined) {
    return NextResponse.json(
      { error: "Mindestens 'kategorie' oder 'umbuchung' angeben" },
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
