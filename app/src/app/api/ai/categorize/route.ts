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

export async function GET() {
  const ids = getUncategorizedIds();
  return NextResponse.json({ ids, count: ids.length });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const url = getSetting("ollama_url") || "http://localhost:11434";
  const model = getSetting("ollama_model");
  if (!model) {
    return NextResponse.json(
      { error: "Kein Ollama-Modell konfiguriert" },
      { status: 400 }
    );
  }

  const bodyData = body as { ids?: unknown };
  const ids: string[] = Array.isArray(bodyData.ids)
    ? bodyData.ids.filter((v): v is string => typeof v === "string")
    : [];
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
