import { NextRequest, NextResponse } from "next/server";
import {
  deleteKontogruppe,
  updateKontogruppe,
} from "../../../../lib/db";
import { KontogruppeType } from "../../../../lib/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { name, type, color, icon, bank } = body as {
    name: string;
    type: KontogruppeType;
    color: string;
    icon?: string;
    bank?: string | null;
  };
  const updated = updateKontogruppe(
    parseInt(id, 10),
    name,
    type,
    color,
    icon || "user",
    bank || null
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
