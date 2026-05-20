import { NextRequest, NextResponse } from "next/server";
import { deleteAsset } from "../../../../lib/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deleted = deleteAsset(parseInt(id, 10));
  return NextResponse.json({ deleted });
}
