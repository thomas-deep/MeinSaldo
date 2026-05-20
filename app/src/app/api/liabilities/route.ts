import { NextRequest, NextResponse } from "next/server";
import { createLiability, getLiabilities } from "../../../lib/db";
import {
  parseBody,
  liabilityCreateSchema,
} from "../../../lib/api-validation";

export async function GET() {
  return NextResponse.json({ liabilities: getLiabilities() });
}

export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, liabilityCreateSchema);
  if (!parsed.ok) return parsed.response;
  const liability = createLiability(
    parsed.data.name.trim(),
    parsed.data.kind ?? "sonstiges",
    parsed.data.note?.trim() || null
  );
  return NextResponse.json({ liability });
}
