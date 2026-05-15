import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getAllTransactionIds,
  getAllUncategorizedIds,
  logEvent,
  recategorizeAllByRules,
} from "../../../lib/db";
import { parseBody } from "../../../lib/api-validation";

const schema = z.object({
  mode: z.enum(["rules", "rules-only-sonstiges"]),
});

export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, schema);
  if (!parsed.ok) return parsed.response;
  const onlySonstiges = parsed.data.mode === "rules-only-sonstiges";
  const result = recategorizeAllByRules(onlySonstiges);
  logEvent(
    "info",
    "categorize.rules",
    `${result.updated} Buchungen via Regel neu kategorisiert (${parsed.data.mode})`,
    { ...result, mode: parsed.data.mode }
  );
  return NextResponse.json(result);
}

// Optional GET — IDs für KI-Bulk holen
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const scope = url.searchParams.get("scope");
  const ids =
    scope === "all" ? getAllTransactionIds() : getAllUncategorizedIds();
  return NextResponse.json({ ids });
}
