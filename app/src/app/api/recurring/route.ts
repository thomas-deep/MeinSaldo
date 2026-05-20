import { NextResponse } from "next/server";
import { getAllTransactions } from "../../../lib/db";
import { detectRecurring } from "../../../lib/recurring";

export async function GET() {
  const transactions = getAllTransactions();
  const series = detectRecurring(transactions);
  return NextResponse.json({ series });
}
