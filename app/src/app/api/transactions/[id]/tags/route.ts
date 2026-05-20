import { NextRequest, NextResponse } from "next/server";
import { setTagsForTransaction } from "../../../../../lib/db";
import {
  parseBody,
  transactionTagsSchema,
} from "../../../../../lib/api-validation";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const parsed = await parseBody(req, transactionTagsSchema);
  if (!parsed.ok) return parsed.response;
  setTagsForTransaction(id, parsed.data.tagIds);
  return NextResponse.json({ ok: true });
}
