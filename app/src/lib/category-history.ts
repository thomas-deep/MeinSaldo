import { normalizeCounterparty } from "./recurring";

export interface HistoryEntry {
  /** Roher Counterparty-Name (wird intern normalisiert). */
  name: string;
  /** Aktuelle Kategorie der Buchung. */
  kategorie: string;
  /** True, wenn die Kategorie manuell gesetzt/korrigiert wurde. */
  manual: boolean;
}

const FALLBACK_CATEGORIES = new Set(["Sonstiges", "Sonstige Einnahmen"]);

export function isFallbackCategory(name: string): boolean {
  return FALLBACK_CATEGORIES.has(name);
}

function bump(
  store: Map<string, Map<string, number>>,
  key: string,
  kategorie: string
): void {
  const votes = store.get(key) ?? new Map<string, number>();
  votes.set(kategorie, (votes.get(kategorie) ?? 0) + 1);
  store.set(key, votes);
}

function dominant(votes: Map<string, number> | undefined): string | null {
  if (!votes || votes.size === 0) return null;
  let best: string | null = null;
  let bestCount = 0;
  for (const [kategorie, count] of votes) {
    if (count > bestCount) {
      best = kategorie;
      bestCount = count;
    }
  }
  return best;
}

/**
 * Baut aus der Buchungs-Historie eine Zuordnung
 * `normalisierter Counterparty → dominante Kategorie`.
 *
 * - Fallback-Kategorien („Sonstiges") zählen nicht als Signal.
 * - Manuell gesetzte Kategorisierungen haben Vorrang: gibt es für einen
 *   Counterparty manuelle Einträge, gewinnt deren häufigste Kategorie;
 *   sonst die häufigste über alle Einträge.
 */
export function buildCategoryHistory(
  entries: HistoryEntry[]
): Map<string, string> {
  const all = new Map<string, Map<string, number>>();
  const manual = new Map<string, Map<string, number>>();

  for (const e of entries) {
    if (isFallbackCategory(e.kategorie)) continue;
    const key = normalizeCounterparty(e.name);
    if (!key) continue;
    bump(all, key, e.kategorie);
    if (e.manual) bump(manual, key, e.kategorie);
  }

  const result = new Map<string, string>();
  const keys = new Set([...all.keys(), ...manual.keys()]);
  for (const key of keys) {
    const winner = dominant(manual.get(key)) ?? dominant(all.get(key));
    if (winner) result.set(key, winner);
  }
  return result;
}

/** Schlägt für einen Counterparty-Namen die Verlaufs-Kategorie nach. */
export function lookupHistoricalCategory(
  history: Map<string, string>,
  name: string
): string | null {
  const key = normalizeCounterparty(name);
  if (!key) return null;
  return history.get(key) ?? null;
}
