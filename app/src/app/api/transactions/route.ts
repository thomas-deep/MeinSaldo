import { NextRequest, NextResponse } from "next/server";
import {
  getAllTransactions,
  insertTransactions,
  clearAll,
  getStats,
  logEvent,
} from "../../../lib/db";
import { parseBody, transactionsPostSchema } from "../../../lib/api-validation";

export async function GET() {
  const transactions = getAllTransactions();
  const stats = getStats();
  return NextResponse.json({ transactions, stats });
}

export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, transactionsPostSchema);
  if (!parsed.ok) return parsed.response;

  const groupId =
    typeof parsed.data.kontogruppeId === "number"
      ? parsed.data.kontogruppeId
      : null;
  const result = insertTransactions(parsed.data.transactions, groupId);
  return NextResponse.json(result);
}

export async function DELETE() {
  const count = clearAll();
  logEvent("warn", "db.clear", `Alle Transaktionen gelöscht (${count} Zeilen)`, {
    deleted: count,
  });
  return NextResponse.json({ deleted: count });
}
