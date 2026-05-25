import { NextRequest, NextResponse } from "next/server";
import { getKontogruppeMonthlySnapshots } from "../../../../../lib/db";

/** Rekonstruierte monatliche Saldo-Snapshots für eine Kontogruppe —
 *  read-only, gespeist aus dem Anker-Wert (falls gesetzt) und den
 *  Buchungen. Fürs Mini-Chart in der Vermögensübersicht. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return NextResponse.json({
    snapshots: getKontogruppeMonthlySnapshots(parseInt(id, 10)),
  });
}
