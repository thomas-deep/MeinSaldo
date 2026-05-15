import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logEvent, reorderKategorien } from "../../../lib/db";
import { parseBody } from "../../../lib/api-validation";

const schema = z.object({
  ids: z.array(z.number().int().positive()).min(1),
});

export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, schema);
  if (!parsed.ok) return parsed.response;
  const n = reorderKategorien(parsed.data.ids);
  logEvent("info", "kategorien.reorder", `${n} Kategorien neu sortiert`, {
    count: n,
  });
  return NextResponse.json({ updated: n });
}
