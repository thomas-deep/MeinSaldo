import { NextRequest, NextResponse } from "next/server";
import { deleteTag, updateTag } from "../../../../lib/db";
import { parseBody, tagUpdateSchema } from "../../../../lib/api-validation";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const parsed = await parseBody(req, tagUpdateSchema);
  if (!parsed.ok) return parsed.response;
  const updated = updateTag(
    parseInt(id, 10),
    parsed.data.name.trim(),
    parsed.data.color
  );
  return NextResponse.json({ updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deleted = deleteTag(parseInt(id, 10));
  return NextResponse.json({ deleted });
}
