import { NextRequest, NextResponse } from "next/server";
import {
  getAllTransactions,
  insertTransactions,
  clearAll,
  getStats,
} from "../../../lib/db";
import { Transaction } from "../../../lib/types";

export async function GET() {
  const transactions = getAllTransactions();
  const stats = getStats();
  return NextResponse.json({ transactions, stats });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const transactions = body.transactions as Transaction[];
  const kontogruppeId =
    typeof body.kontogruppeId === "number" ? body.kontogruppeId : null;

  if (!Array.isArray(transactions)) {
    return NextResponse.json(
      { error: "transactions array required" },
      { status: 400 }
    );
  }

  const result = insertTransactions(transactions, kontogruppeId);
  return NextResponse.json(result);
}

export async function DELETE() {
  const count = clearAll();
  return NextResponse.json({ deleted: count });
}
