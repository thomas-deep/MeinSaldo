import { NextRequest, NextResponse } from "next/server";
import { getAllKontogruppen, createKontogruppe } from "../../../lib/db";
import {
  parseBody,
  kontogruppeCreateSchema,
} from "../../../lib/api-validation";
import { normalizeIban } from "../../../lib/iban";

function isIbanUniqueError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return (
    msg.includes("UNIQUE constraint failed") && msg.includes("kontogruppen.iban")
  );
}

export async function GET() {
  return NextResponse.json({ kontogruppen: getAllKontogruppen() });
}

export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, kontogruppeCreateSchema);
  if (!parsed.ok) return parsed.response;
  const { name, inhaberId, art, color, icon, bank, iban } = parsed.data;

  try {
    const kontogruppe = createKontogruppe(
      name,
      inhaberId,
      art ?? "girokonto",
      color,
      icon || "user",
      bank ?? null,
      normalizeIban(iban)
    );
    return NextResponse.json({ kontogruppe });
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
