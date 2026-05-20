import { NextRequest, NextResponse } from "next/server";
import { createTag, getAllTags } from "../../../lib/db";
import { parseBody, tagCreateSchema } from "../../../lib/api-validation";

export async function GET() {
  return NextResponse.json({ tags: getAllTags() });
}

export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, tagCreateSchema);
  if (!parsed.ok) return parsed.response;
  try {
    const tag = createTag(parsed.data.name.trim(), parsed.data.color);
    return NextResponse.json({ tag });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
