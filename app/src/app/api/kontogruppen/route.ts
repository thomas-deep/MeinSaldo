import { NextRequest, NextResponse } from "next/server";
import { getAllKontogruppen, createKontogruppe } from "../../../lib/db";
import {
  parseBody,
  kontogruppeCreateSchema,
} from "../../../lib/api-validation";

export async function GET() {
  return NextResponse.json({ kontogruppen: getAllKontogruppen() });
}

export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, kontogruppeCreateSchema);
  if (!parsed.ok) return parsed.response;
  const { name, inhaberId, art, color, icon, bank } = parsed.data;

  try {
    const kontogruppe = createKontogruppe(
      name,
      inhaberId,
      art ?? "girokonto",
      color,
      icon || "user",
      bank ?? null
    );
    return NextResponse.json({ kontogruppe });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
