import { NextRequest, NextResponse } from "next/server";
import {
  getSetting,
  getTransactionsByIds,
  getUncategorizedIds,
  updateCategory,
} from "../../../../lib/db";
import {
  categorizeWithOllama,
  getAllowedCategories,
} from "../../../../lib/ollama";

export async function GET() {
  const ids = getUncategorizedIds();
  return NextResponse.json({ ids, count: ids.length });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const url = getSetting("ollama_url") || "http://localhost:11434";
  const model = getSetting("ollama_model");
  if (!model) {
    return NextResponse.json(
      { error: "Kein Ollama-Modell konfiguriert" },
      { status: 400 }
    );
  }

  const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "ids array required" }, { status: 400 });
  }

  const transactions = getTransactionsByIds(ids);
  const categories = getAllowedCategories();
  const results: { id: string; kategorie: string | null; error?: string }[] = [];

  for (const tx of transactions) {
    try {
      const cat = await categorizeWithOllama(url, model, tx, categories);
      if (cat) {
        updateCategory(tx.id, cat);
        results.push({ id: tx.id, kategorie: cat });
      } else {
        results.push({ id: tx.id, kategorie: null, error: "no match" });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "unknown";
      results.push({ id: tx.id, kategorie: null, error: msg });
    }
  }

  return NextResponse.json({ results });
}
