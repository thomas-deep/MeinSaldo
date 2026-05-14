import { NextRequest, NextResponse } from "next/server";
import { deleteInhaber, updateInhaber } from "../../../../lib/db";
import {
  parseBody,
  inhaberUpdateSchema,
} from "../../../../lib/api-validation";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const parsed = await parseBody(req, inhaberUpdateSchema);
  if (!parsed.ok) return parsed.response;
  const { name, type, color } = parsed.data;
  const updated = updateInhaber(parseInt(id, 10), name.trim(), type, color);
  return NextResponse.json({ updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const deleted = deleteInhaber(parseInt(id, 10));
    return NextResponse.json({ deleted });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
