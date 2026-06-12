import { NextRequest, NextResponse } from "next/server";
import {
  getAllTransactions,
  insertTransactions,
  clearAll,
  getStats,
  logEvent,
} from "../../../lib/db";
import { parseBody, transactionsPostSchema } from "../../../lib/api-validation";
import { createSafetySnapshot } from "../../../lib/backup";

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
  // Schutz-Sicherung der kompletten DB anlegen, bevor unwiderruflich geleert
  // wird (schlägt sie fehl, blockiert das die Löschung nicht — siehe Logs).
  const snapshot = createSafetySnapshot("vor-leeren");
  const count = clearAll();
  logEvent("warn", "db.clear", `Alle Transaktionen gelöscht (${count} Zeilen)`, {
    deleted: count,
    safetyBackup: snapshot?.name ?? null,
  });
  return NextResponse.json({ deleted: count, safetyBackup: snapshot?.name ?? null });
}
