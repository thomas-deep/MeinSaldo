import { NextRequest, NextResponse } from "next/server";
import { searchTransactions } from "../../../lib/db";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const limitRaw = req.nextUrl.searchParams.get("limit");
  const limit = Math.min(
    Math.max(parseInt(limitRaw ?? "50", 10) || 50, 1),
    500
  );
  if (!q.trim()) {
    return NextResponse.json({ transactions: [], query: q });
  }
  const transactions = searchTransactions(q, limit);
  return NextResponse.json({ transactions, query: q });
}
