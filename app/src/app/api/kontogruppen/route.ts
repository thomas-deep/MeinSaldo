import { NextRequest, NextResponse } from "next/server";
import {
  getAllKontogruppen,
  createKontogruppe,
} from "../../../lib/db";
import { KontogruppeType } from "../../../lib/types";

export async function GET() {
  return NextResponse.json({ kontogruppen: getAllKontogruppen() });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const { name, type, color, icon, bank } = body as {
    name?: string;
    type?: KontogruppeType;
    color?: string;
    icon?: string;
    bank?: string | null;
  };

  if (!name || !type || !color) {
    return NextResponse.json(
      { error: "name, type, color required" },
      { status: 400 }
    );
  }

  try {
    const kontogruppe = createKontogruppe(
      name,
      type,
      color,
      icon || "user",
      bank || null
    );
    return NextResponse.json({ kontogruppe });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
