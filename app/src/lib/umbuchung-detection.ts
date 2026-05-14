const CREDIT_CARD_NAME_PATTERNS = [
  "american express",
  "amex",
  "visa europe",
  "visa card",
  "mastercard",
  "master card",
  "diners club",
  "diners international",
];

export const UMBUCHUNG_DATE_WINDOW_DAYS = 3;

export interface UmbuchungInput {
  id: string;
  buchungstag: string;
  betrag: number;
  ibanKonto: string;
  ibanZahlungsbeteiligter: string;
  nameZahlungsbeteiligter: string;
  kontogruppeId: number | null;
}

export interface DetectionOptions {
  hasKreditkarteGroup: boolean;
  windowDays?: number;
}

function isoToDays(iso: string): number {
  const d = new Date(iso + "T00:00:00Z");
  return Math.floor(d.getTime() / 86400000);
}

/**
 * Greedy paar-Matching: Für jede negative Buchung wird auf einer ANDEREN
 * Kontogruppe eine positive Buchung gleichen absoluten Betrags innerhalb
 * eines Datumsfensters gesucht. Zusätzlich werden IBAN-Match und
 * Kreditkarten-Settlements einseitig markiert.
 *
 * @returns Set der Transaction-IDs, die als Umbuchung gelten.
 */
export function detectUmbuchungen(
  txns: UmbuchungInput[],
  opts: DetectionOptions
): Set<string> {
  const window = opts.windowDays ?? UMBUCHUNG_DATE_WINDOW_DAYS;
  const ownIbans = new Set(
    txns.map((t) => t.ibanKonto.trim()).filter(Boolean)
  );

  const matched = new Set<string>();
  const positives = txns.filter((t) => t.betrag > 0);
  const byAmount = new Map<string, UmbuchungInput[]>();
  for (const p of positives) {
    const key = p.betrag.toFixed(2);
    const list = byAmount.get(key) ?? [];
    list.push(p);
    byAmount.set(key, list);
  }

  for (const neg of txns) {
    if (neg.betrag >= 0) continue;
    const pool = byAmount.get((-neg.betrag).toFixed(2));
    if (!pool) continue;

    const negDay = isoToDays(neg.buchungstag);
    let best: UmbuchungInput | null = null;
    let bestDiff = Infinity;
    for (const pos of pool) {
      if (matched.has(pos.id)) continue;
      if (pos.kontogruppeId === null || neg.kontogruppeId === null) continue;
      if (pos.kontogruppeId === neg.kontogruppeId) continue;
      const diff = Math.abs(isoToDays(pos.buchungstag) - negDay);
      if (diff > window) continue;
      if (diff < bestDiff) {
        best = pos;
        bestDiff = diff;
      }
    }
    if (best) {
      matched.add(neg.id);
      matched.add(best.id);
    }
  }

  for (const c of txns) {
    if (matched.has(c.id)) continue;
    const counterIban = c.ibanZahlungsbeteiligter.trim();
    if (counterIban && ownIbans.has(counterIban)) {
      matched.add(c.id);
      continue;
    }
    if (
      opts.hasKreditkarteGroup &&
      c.betrag < 0 &&
      CREDIT_CARD_NAME_PATTERNS.some((p) =>
        c.nameZahlungsbeteiligter.toLowerCase().includes(p)
      )
    ) {
      matched.add(c.id);
    }
  }

  return matched;
}
