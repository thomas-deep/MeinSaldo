import { Tag, Transaction } from "./types";

export type RecurringInterval = "monthly" | "quarterly" | "yearly";

export interface RecurringSeries {
  /** Normalisierter Schlüssel (Counterparty + grobe Betragsstufe). */
  key: string;
  /** Anzeigename — der häufigste Original-Counterparty-Name in der Serie. */
  name: string;
  interval: RecurringInterval;
  avgBetrag: number;
  latestBetrag: number;
  /** True, wenn der letzte Betrag um mehr als 8 % vom Durchschnitt der vorigen abweicht. */
  priceChanged: boolean;
  occurrences: number;
  lastDate: string;
  /** Erwarteter nächster Buchungstag (lastDate + Intervall). ISO. */
  nextExpected: string;
  /** IDs aller Transaktionen, die zu dieser Serie zählen. */
  transactionIds: string[];
  /** Distinkte Kategorien, die die Buchungen dieser Serie aktuell tragen. */
  categories: string[];
  /** Distinkte Tags über alle Buchungen dieser Serie. */
  tags: Tag[];
}

const PRICE_CHANGE_THRESHOLD = 0.08;
const MIN_OCCURRENCES = 3;

const UMLAUT_MAP: Record<string, string> = {
  ä: "a",
  ö: "o",
  ü: "u",
  ß: "ss",
};

/** Lowercased, Umlaut-frei, Whitespace-normalisiert, Bank-Routing-Suffixe gestutzt. */
export function normalizeCounterparty(raw: string): string {
  const lower = raw.toLowerCase();
  const noUmlaut = lower.replace(/[äöüß]/g, (c) => UMLAUT_MAP[c] ?? c);
  // Bei vielen Banken-Exports: "Name//Stadt//Land" oder "Name|Stadt|Land"
  const stripped = noUmlaut.split(/\/\/|\|/)[0];
  return stripped.replace(/\s+/g, " ").trim();
}

function daysBetween(isoA: string, isoB: string): number {
  const a = new Date(isoA).getTime();
  const b = new Date(isoB).getTime();
  return Math.round((b - a) / 86_400_000);
}

function classifyInterval(days: number): RecurringInterval | null {
  if (days >= 26 && days <= 35) return "monthly";
  if (days >= 84 && days <= 96) return "quarterly";
  if (days >= 350 && days <= 380) return "yearly";
  return null;
}

function intervalDays(interval: RecurringInterval): number {
  switch (interval) {
    case "monthly":
      return 30;
    case "quarterly":
      return 91;
    case "yearly":
      return 365;
  }
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function average(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function mostFrequent<T>(values: T[]): T {
  const counts = new Map<T, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best = values[0];
  let bestCount = 0;
  for (const [v, c] of counts) {
    if (c > bestCount) {
      best = v;
      bestCount = c;
    }
  }
  return best;
}

/** Erkennt regelmäßig wiederkehrende Buchungen pro normalisiertem Counterparty.
 *  Umbuchungen werden ignoriert. */
export function detectRecurring(transactions: Transaction[]): RecurringSeries[] {
  const groups = new Map<string, Transaction[]>();
  for (const t of transactions) {
    if (t.isUmbuchung) continue;
    if (!t.nameZahlungsbeteiligter.trim()) continue;
    const key = normalizeCounterparty(t.nameZahlungsbeteiligter);
    if (!key) continue;
    const list = groups.get(key) ?? [];
    list.push(t);
    groups.set(key, list);
  }

  const series: RecurringSeries[] = [];

  for (const [key, list] of groups) {
    if (list.length < MIN_OCCURRENCES) continue;

    // ISO-Datum, String-Compare ist locale-stabil
    const sorted = [...list].sort((a, b) =>
      a.buchungstag < b.buchungstag ? -1 : a.buchungstag > b.buchungstag ? 1 : 0
    );

    const intervals: RecurringInterval[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const d = daysBetween(sorted[i - 1].buchungstag, sorted[i].buchungstag);
      const cls = classifyInterval(d);
      if (cls) intervals.push(cls);
    }
    // Mindestens (n-1) * 0.75 der Gaps müssen ein erkanntes Intervall haben
    const requiredMatches = Math.ceil((sorted.length - 1) * 0.75);
    if (intervals.length < requiredMatches) continue;

    const interval = mostFrequent(intervals);
    const betraege = sorted.map((t) => t.betrag);
    const avgBetrag = average(betraege);
    const latestBetrag = betraege[betraege.length - 1];
    const priorAvg = average(betraege.slice(0, -1));
    const priceChanged =
      Math.abs(priorAvg) > 0 &&
      Math.abs((latestBetrag - priorAvg) / priorAvg) > PRICE_CHANGE_THRESHOLD;

    const lastDate = sorted[sorted.length - 1].buchungstag;
    const nextExpected = addDays(lastDate, intervalDays(interval));
    const displayName = mostFrequent(
      sorted.map((t) => t.nameZahlungsbeteiligter.trim())
    );

    const nameCollator = new Intl.Collator("de-DE", { sensitivity: "base" });
    const categories = [
      ...new Set(sorted.map((t) => t.kategorie).filter(Boolean)),
    ].sort((a, b) => nameCollator.compare(a, b));
    const tagMap = new Map<number, Tag>();
    for (const t of sorted) {
      for (const tag of t.tags ?? []) tagMap.set(tag.id, tag);
    }
    const tags = [...tagMap.values()].sort((a, b) =>
      nameCollator.compare(a.name, b.name)
    );

    series.push({
      key,
      name: displayName,
      interval,
      avgBetrag: Math.round(avgBetrag * 100) / 100,
      latestBetrag,
      priceChanged,
      occurrences: sorted.length,
      lastDate,
      nextExpected,
      transactionIds: sorted.map((t) => t.id),
      categories,
      tags,
    });
  }

  // Größte Ausgaben (kleinster Betrag) zuerst, dann größte Einnahmen
  series.sort((a, b) => Math.abs(b.avgBetrag) - Math.abs(a.avgBetrag));
  return series;
}
