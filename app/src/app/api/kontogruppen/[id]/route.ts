import { NextRequest, NextResponse } from "next/server";
import { deleteKontogruppe, updateKontogruppe } from "../../../../lib/db";
import {
  parseBody,
  kontogruppeUpdateSchema,
} from "../../../../lib/api-validation";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const parsed = await parseBody(req, kontogruppeUpdateSchema);
  if (!parsed.ok) return parsed.response;
  const { name, type, art, color, icon, bank } = parsed.data;

  const updated = updateKontogruppe(
    parseInt(id, 10),
    name,
    type,
    art ?? "girokonto",
    color,
    icon || "user",
    bank ?? null
  );
  return NextResponse.json({ updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deleted = deleteKontogruppe(parseInt(id, 10));
  return NextResponse.json({ deleted });
}
