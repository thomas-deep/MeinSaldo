import { NextRequest, NextResponse } from "next/server";
import {
  getAllTransactions,
  insertTransactions,
  clearAll,
  getStats,
} from "../../../lib/db";
import { Transaction } from "../../../lib/types";

async function parseJson(req: NextRequest): Promise<unknown | null> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

export async function GET() {
  const transactions = getAllTransactions();
  const stats = getStats();
  return NextResponse.json({ transactions, stats });
}

export async function POST(req: NextRequest) {
  const body = await parseJson(req);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const { transactions, kontogruppeId } = body as {
    transactions?: Transaction[];
    kontogruppeId?: number | null;
  };

  if (!Array.isArray(transactions)) {
    return NextResponse.json(
      { error: "transactions array required" },
      { status: 400 }
    );
  }

  const groupId = typeof kontogruppeId === "number" ? kontogruppeId : null;
  const result = insertTransactions(transactions, groupId);
  return NextResponse.json(result);
}

export async function DELETE() {
  const count = clearAll();
  return NextResponse.json({ deleted: count });
}
