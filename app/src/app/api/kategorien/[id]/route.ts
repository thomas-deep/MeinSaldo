import { NextRequest, NextResponse } from "next/server";
import {
  deleteKategorieRule,
  logEvent,
  updateKategorieRule,
} from "../../../../lib/db";
import { parseBody } from "../../../../lib/api-validation";
import { z } from "zod";

const patchSchema = z
  .object({
    name: z.string().min(1).max(64).optional(),
    keywords: z.array(z.string()).max(500).optional(),
    namePatterns: z.array(z.string()).max(500).optional(),
    ruleOrder: z.number().int().min(0).max(99999).optional(),
    direction: z.enum(["einnahme", "ausgabe", "beide"]).optional(),
  })
  .refine(
    (data) => Object.values(data).some((v) => v !== undefined),
    { message: "Mindestens ein Feld erforderlich" }
  );

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numericId = parseInt(id, 10);
  if (Number.isNaN(numericId)) {
    return NextResponse.json({ error: "ungültige id" }, { status: 400 });
  }
  const parsed = await parseBody(req, patchSchema);
  if (!parsed.ok) return parsed.response;

  const patch = {
    ...parsed.data,
    keywords: parsed.data.keywords
      ? parsed.data.keywords.map((s) => s.trim()).filter(Boolean)
      : undefined,
    namePatterns: parsed.data.namePatterns
      ? parsed.data.namePatterns.map((s) => s.trim()).filter(Boolean)
      : undefined,
  };

  try {
    const updated = updateKategorieRule(numericId, patch);
    if (updated) {
      logEvent("info", "kategorien", `Kategorie #${numericId} aktualisiert`, {
        id: numericId,
        fields: Object.keys(patch).filter(
          (k) => patch[k as keyof typeof patch] !== undefined
        ),
      });
    }
    return NextResponse.json({ updated });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numericId = parseInt(id, 10);
  if (Number.isNaN(numericId)) {
    return NextResponse.json({ error: "ungültige id" }, { status: 400 });
  }
  try {
    const deleted = deleteKategorieRule(numericId);
    if (deleted) {
      logEvent("warn", "kategorien", `Kategorie #${numericId} gelöscht`, {
        id: numericId,
      });
    }
    return NextResponse.json({ deleted });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
