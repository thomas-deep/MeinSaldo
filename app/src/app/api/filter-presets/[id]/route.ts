import { NextRequest, NextResponse } from "next/server";
import { deleteFilterPreset, updateFilterPreset } from "../../../../lib/db";
import {
  filterPresetUpdateSchema,
  parseBody,
} from "../../../../lib/api-validation";

function isNameUniqueError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return (
    msg.includes("UNIQUE constraint failed") && msg.includes("filter_presets.name")
  );
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const parsed = await parseBody(req, filterPresetUpdateSchema);
  if (!parsed.ok) return parsed.response;
  try {
    const updated = updateFilterPreset(
      parseInt(id, 10),
      parsed.data.name.trim(),
      parsed.data.payload
    );
    return NextResponse.json({ updated });
  } catch (e: unknown) {
    if (isNameUniqueError(e)) {
      return NextResponse.json(
        { error: "Ein Preset mit diesem Namen existiert bereits." },
        { status: 409 }
      );
    }
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deleted = deleteFilterPreset(parseInt(id, 10));
  return NextResponse.json({ deleted });
}
