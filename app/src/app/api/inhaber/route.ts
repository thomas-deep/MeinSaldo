import { NextRequest, NextResponse } from "next/server";
import { createInhaber, getAllInhaber } from "../../../lib/db";
import {
  parseBody,
  inhaberCreateSchema,
} from "../../../lib/api-validation";

export async function GET() {
  return NextResponse.json({ inhaber: getAllInhaber() });
}

export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, inhaberCreateSchema);
  if (!parsed.ok) return parsed.response;
  const { name, type, color } = parsed.data;
  try {
    const inhaber = createInhaber(name.trim(), type, color);
    return NextResponse.json({ inhaber });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
