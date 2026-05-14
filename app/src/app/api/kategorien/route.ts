import { NextRequest, NextResponse } from "next/server";
import {
  createKategorieRule,
  getKategorieRules,
  logEvent,
} from "../../../lib/db";
import { parseBody } from "../../../lib/api-validation";
import { z } from "zod";

export async function GET() {
  return NextResponse.json({ kategorien: getKategorieRules() });
}

const createSchema = z.object({
  name: z.string().min(1).max(64),
  keywords: z.array(z.string()).max(200).optional(),
  namePatterns: z.array(z.string()).max(200).optional(),
});

export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, createSchema);
  if (!parsed.ok) return parsed.response;
  try {
    const k = createKategorieRule(
      parsed.data.name.trim(),
      (parsed.data.keywords ?? []).map((s) => s.trim()).filter(Boolean),
      (parsed.data.namePatterns ?? []).map((s) => s.trim()).filter(Boolean)
    );
    logEvent("info", "kategorien", `Kategorie '${k.name}' angelegt`, {
      id: k.id,
      keywords: k.keywords.length,
      patterns: k.namePatterns.length,
    });
    return NextResponse.json({ kategorie: k });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
