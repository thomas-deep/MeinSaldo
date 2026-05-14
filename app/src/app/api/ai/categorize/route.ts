import { NextRequest, NextResponse } from "next/server";
import {
  getSetting,
  getTransactionsByIds,
  getUncategorizedIds,
  updateCategoryByAi,
} from "../../../../lib/db";
import {
  categorizeWithOllama,
  getAllowedCategories,
} from "../../../../lib/ollama";
import { parseBody, aiCategorizeSchema } from "../../../../lib/api-validation";

export async function GET() {
  const ids = getUncategorizedIds();
  return NextResponse.json({ ids, count: ids.length });
}

export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, aiCategorizeSchema);
  if (!parsed.ok) return parsed.response;

  const url = getSetting("ollama_url") || "http://localhost:11434";
  const model = getSetting("ollama_model");
  if (!model) {
    return NextResponse.json(
      { error: "Kein Ollama-Modell konfiguriert" },
      { status: 400 }
    );
  }

  const transactions = getTransactionsByIds(parsed.data.ids);
  const categories = getAllowedCategories();
  const results: { id: string; kategorie: string | null; error?: string }[] = [];

  for (const tx of transactions) {
    if (req.signal.aborted) break;
    try {
      const cat = await categorizeWithOllama(
        url,
        model,
        tx,
        categories,
        req.signal
      );
      if (cat) {
        updateCategoryByAi(tx.id, cat);
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
