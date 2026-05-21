import { NextRequest, NextResponse } from "next/server";
import {
  setKontogruppeAnchor,
  clearKontogruppeAnchor,
} from "../../../../../lib/db";
import { parseBody, anchorSchema } from "../../../../../lib/api-validation";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const parsed = await parseBody(req, anchorSchema);
  if (!parsed.ok) return parsed.response;
  const updated = setKontogruppeAnchor(
    parseInt(id, 10),
    parsed.data.date,
    parsed.data.value
  );
  return NextResponse.json({ updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cleared = clearKontogruppeAnchor(parseInt(id, 10));
  return NextResponse.json({ cleared });
}
