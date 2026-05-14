import { Transaction } from "./types";
import { categoryRules } from "./categories";

export interface OllamaModel {
  name: string;
  size?: number;
}

export async function listOllamaModels(url: string): Promise<OllamaModel[]> {
  const res = await fetch(`${url.replace(/\/$/, "")}/api/tags`);
  if (!res.ok) throw new Error(`Ollama nicht erreichbar (HTTP ${res.status})`);
  const data = (await res.json()) as { models?: { name: string; size: number }[] };
  return (data.models ?? []).map((m) => ({ name: m.name, size: m.size }));
}

export function getAllowedCategories(): string[] {
  return [
    ...categoryRules.map((r) => r.kategorie),
    "Sonstige Einnahmen",
    "Sonstiges",
  ];
}

function buildPrompt(tx: Transaction, categories: string[]): string {
  const direction = tx.betrag >= 0 ? "Einnahme" : "Ausgabe";
  return `Du bist ein Assistent zur Klassifikation deutscher Bankbuchungen.
Wähle EXAKT EINE der folgenden Kategorien aus. Antworte ausschließlich mit dem Kategoriennamen, ohne Anführungszeichen, ohne Erklärung.

Kategorien:
${categories.map((c) => `- ${c}`).join("\n")}

Buchung (${direction}):
Empfänger/Absender: ${tx.nameZahlungsbeteiligter || "(unbekannt)"}
Verwendungszweck: ${tx.verwendungszweck || "(leer)"}
Buchungstext: ${tx.buchungstext || "(leer)"}
Betrag: ${tx.betrag.toFixed(2)} EUR

Kategorie:`;
}

function matchCategory(answer: string, categories: string[]): string | null {
  const cleaned = answer.trim().replace(/^["'`]+|["'`]+$/g, "");
  const lower = cleaned.toLowerCase();
  const exact = categories.find((c) => c.toLowerCase() === lower);
  if (exact) return exact;
  const startsWith = categories.find((c) => lower.startsWith(c.toLowerCase()));
  if (startsWith) return startsWith;
  const contains = categories.find((c) => lower.includes(c.toLowerCase()));
  if (contains) return contains;
  const inverse = categories.find((c) => c.toLowerCase().includes(lower) && lower.length > 4);
  return inverse ?? null;
}

export async function categorizeWithOllama(
  url: string,
  model: string,
  tx: Transaction,
  categories: string[],
  signal?: AbortSignal
): Promise<string | null> {
  const prompt = buildPrompt(tx, categories);
  const res = await fetch(`${url.replace(/\/$/, "")}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      options: { temperature: 0, num_predict: 32 },
    }),
    signal,
  });
  if (!res.ok) throw new Error(`Ollama call failed: HTTP ${res.status}`);
  const data = (await res.json()) as { response?: string };
  const answer = data.response ?? "";
  return matchCategory(answer, categories);
}
