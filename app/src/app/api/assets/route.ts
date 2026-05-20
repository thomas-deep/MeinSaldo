import { NextRequest, NextResponse } from "next/server";
import { createAsset, getAssets } from "../../../lib/db";
import { parseBody, assetCreateSchema } from "../../../lib/api-validation";

export async function GET() {
  return NextResponse.json({ assets: getAssets() });
}

export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, assetCreateSchema);
  if (!parsed.ok) return parsed.response;
  const asset = createAsset(
    parsed.data.name.trim(),
    parsed.data.kind ?? "sonstiges",
    parsed.data.note?.trim() || null
  );
  return NextResponse.json({ asset });
}
