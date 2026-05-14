import { NextRequest, NextResponse } from "next/server";
import { clearLogs, countLogs, getLogs, logEvent } from "../../../lib/db";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const limit = Math.min(
    1000,
    Math.max(1, parseInt(url.searchParams.get("limit") ?? "200", 10) || 200)
  );
  const offset = Math.max(
    0,
    parseInt(url.searchParams.get("offset") ?? "0", 10) || 0
  );
  return NextResponse.json({
    logs: getLogs(limit, offset),
    total: countLogs(),
    limit,
    offset,
  });
}

export async function DELETE() {
  const count = clearLogs();
  logEvent("warn", "logs.clear", `Logs gelöscht (${count} Einträge)`, {
    deleted: count,
  });
  return NextResponse.json({ deleted: count });
}
