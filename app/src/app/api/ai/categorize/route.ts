import { NextRequest, NextResponse } from "next/server";
import {
  getSetting,
  getTransactionsByIds,
  getUncategorizedIds,
  updateCategoryByAi,
  logEvent,
  trimLogs,
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
  const force = parsed.data.force === true;
  try {
    const transactions = getTransactionsByIds(parsed.data.ids);
    const categories = getAllowedCategories();
    const results: { id: string; kategorie: string | null; error?: string }[] = [];
    let matched = 0;
    let failed = 0;

    for (const tx of transactions) {
      if (req.signal.aborted) break;
      try {
        const r = await categorizeWithOllama(
          url,
          model,
          tx,
          categories,
          req.signal
        );
        if (r.match) {
          updateCategoryByAi(tx.id, r.match, force);
          results.push({ id: tx.id, kategorie: r.match });
          matched++;
        } else {
          results.push({ id: tx.id, kategorie: null, error: "no match" });
        }
        logEvent("info", "ai.classify", `${tx.id} → ${r.match ?? "(kein Match)"}`, {
          tx: {
            id: tx.id,
            name: tx.nameZahlungsbeteiligter,
            zweck: tx.verwendungszweck,
            betrag: tx.betrag,
          },
          model,
          force,
          prompt: r.prompt,
          answer: r.answer,
          match: r.match,
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "unknown";
        results.push({ id: tx.id, kategorie: null, error: msg });
        failed++;
        logEvent("error", "ai.classify", `${tx.id}: ${msg}`, {
          tx: { id: tx.id, name: tx.nameZahlungsbeteiligter },
          model,
          error: msg,
        });
      }
    }

    logEvent(
      "info",
      "ai.run",
      `KI-Lauf abgeschlossen: ${matched}/${transactions.length} erkannt${
        failed ? `, ${failed} Fehler` : ""
      }`,
      { model, force, total: transactions.length, matched, failed }
    );
    trimLogs();

    return NextResponse.json({ results });
  } finally {
    aiRunning = false;
  }
}
