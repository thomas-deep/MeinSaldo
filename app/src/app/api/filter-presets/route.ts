import { NextRequest, NextResponse } from "next/server";
import { createFilterPreset, getAllFilterPresets } from "../../../lib/db";
import {
  filterPresetCreateSchema,
  parseBody,
} from "../../../lib/api-validation";

function isNameUniqueError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return (
    msg.includes("UNIQUE constraint failed") && msg.includes("filter_presets.name")
  );
}

export async function GET() {
  return NextResponse.json({ presets: getAllFilterPresets() });
}

export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, filterPresetCreateSchema);
  if (!parsed.ok) return parsed.response;
  const { name, payload } = parsed.data;
  try {
    const preset = createFilterPreset(name.trim(), payload);
    return NextResponse.json({ preset });
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
