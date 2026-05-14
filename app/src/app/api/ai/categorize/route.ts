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
import {
  parseBody,
  aiCategorizeSchema,
  isAllowedOllamaUrl,
} from "../../../../lib/api-validation";

let aiRunning = false;

export async function GET() {
  const ids = getUncategorizedIds();
  return NextResponse.json({ ids, count: ids.length });
}

export async function POST(req: NextRequest) {
  if (aiRunning) {
    return NextResponse.json(
      { error: "Ein KI-Lauf läuft bereits — bitte warten" },
      { status: 429 }
    );
  }

  const parsed = await parseBody(req, aiCategorizeSchema);
  if (!parsed.ok) return parsed.response;

  const url = getSetting("ollama_url") || "http://localhost:11434";
  const urlCheck = isAllowedOllamaUrl(url);
  if (!urlCheck.ok) {
    return NextResponse.json(
      { error: `Gespeicherte ollamaUrl unsicher: ${urlCheck.reason}` },
      { status: 400 }
    );
  }
  const model = getSetting("ollama_model");
  if (!model) {
    return NextResponse.json(
      { error: "Kein Ollama-Modell konfiguriert" },
      { status: 400 }
    );
  }

  aiRunning = true;
  try {
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
  } finally {
    aiRunning = false;
  }
}
