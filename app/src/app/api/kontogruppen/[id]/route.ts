import { NextRequest, NextResponse } from "next/server";
import { deleteKontogruppe, updateKontogruppe } from "../../../../lib/db";
import {
  parseBody,
  kontogruppeUpdateSchema,
} from "../../../../lib/api-validation";
import { normalizeIban } from "../../../../lib/iban";

function isIbanUniqueError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return (
    msg.includes("UNIQUE constraint failed") && msg.includes("kontogruppen.iban")
  );
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const parsed = await parseBody(req, kontogruppeUpdateSchema);
  if (!parsed.ok) return parsed.response;
  const { name, inhaberId, art, color, icon, bank, iban } = parsed.data;

  try {
    const updated = updateKontogruppe(
      parseInt(id, 10),
      name,
      inhaberId,
      art ?? "girokonto",
      color,
      icon || "user",
      bank ?? null,
      normalizeIban(iban)
    );
    return NextResponse.json({ updated });
  } catch (e: unknown) {
    if (isIbanUniqueError(e)) {
      return NextResponse.json(
        { error: "Diese IBAN ist bereits einer anderen Kontogruppe zugeordnet." },
        { status: 409 }
      );
    }
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deleted = deleteKontogruppe(parseInt(id, 10));
  return NextResponse.json({ deleted });
}
