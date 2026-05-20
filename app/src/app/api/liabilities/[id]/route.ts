import { NextRequest, NextResponse } from "next/server";
import { deleteLiability } from "../../../../lib/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deleted = deleteLiability(parseInt(id, 10));
  return NextResponse.json({ deleted });
}
