import { NextResponse } from "next/server";
import { logEvent, recomputeUmbuchungenAll, trimLogs } from "../../../../lib/db";

export async function POST() {
  const matched = recomputeUmbuchungenAll();
  logEvent("info", "umbuchung.recompute", `${matched} Umbuchungen erkannt`, {
    count: matched,
  });
  trimLogs();
  return NextResponse.json({ matched });
}
