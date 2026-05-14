export type RangePreset =
  | "alle"
  | "lfdMonat"
  | "vormonat"
  | "lfdQuartal"
  | "vorquartal"
  | "lfdJahr"
  | "vorjahr"
  | "letzte12Monate"
  | "custom";

export interface DateRange {
  from: string | null; // ISO yyyy-mm-dd, null = unbegrenzt
  to: string | null;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function isoDate(y: number, m: number, d: number): string {
  return `${y}-${pad(m)}-${pad(d)}`;
}

function lastDayOfMonth(year: number, month: number): number {
  // month 1-12
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function quarterStart(month: number): number {
  // returns first month of the quarter containing `month`
  return Math.floor((month - 1) / 3) * 3 + 1;
}

/**
 * Berechnet das Datumsintervall für ein Preset bezogen auf `today`.
 * Custom liefert {null,null} — der Aufrufer ergänzt die UI-Werte.
 */
export function rangeFor(preset: RangePreset, today: Date): DateRange {
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth() + 1;

  switch (preset) {
    case "alle":
    case "custom":
      return { from: null, to: null };

    case "lfdMonat": {
      const lastDay = lastDayOfMonth(y, m);
      return { from: isoDate(y, m, 1), to: isoDate(y, m, lastDay) };
    }

    case "vormonat": {
      const prevYear = m === 1 ? y - 1 : y;
      const prevMonth = m === 1 ? 12 : m - 1;
      const lastDay = lastDayOfMonth(prevYear, prevMonth);
      return {
        from: isoDate(prevYear, prevMonth, 1),
        to: isoDate(prevYear, prevMonth, lastDay),
      };
    }

    case "lfdQuartal": {
      const qStart = quarterStart(m);
      const qEnd = qStart + 2;
      return {
        from: isoDate(y, qStart, 1),
        to: isoDate(y, qEnd, lastDayOfMonth(y, qEnd)),
      };
    }

    case "vorquartal": {
      const qStart = quarterStart(m);
      const prevQStart = qStart === 1 ? 10 : qStart - 3;
      const prevQYear = qStart === 1 ? y - 1 : y;
      const prevQEnd = prevQStart + 2;
      return {
        from: isoDate(prevQYear, prevQStart, 1),
        to: isoDate(prevQYear, prevQEnd, lastDayOfMonth(prevQYear, prevQEnd)),
      };
    }

    case "lfdJahr":
      return { from: isoDate(y, 1, 1), to: isoDate(y, 12, 31) };

    case "vorjahr":
      return { from: isoDate(y - 1, 1, 1), to: isoDate(y - 1, 12, 31) };

    case "letzte12Monate": {
      const startMonth = m === 12 ? 1 : m + 1;
      const startYear = m === 12 ? y : y - 1;
      return {
        from: isoDate(startYear, startMonth, 1),
        to: isoDate(y, m, lastDayOfMonth(y, m)),
      };
    }
  }
}

/**
 * Verschiebt einen Datumsbereich exakt um ein Jahr nach hinten.
 * 29. Februar wird auf 28. Februar im Vorjahr abgebildet.
 */
export function shiftByYear(range: DateRange, years: number): DateRange {
  return {
    from: shiftIsoByYear(range.from, years),
    to: shiftIsoByYear(range.to, years),
  };
}

function shiftIsoByYear(iso: string | null, years: number): string | null {
  if (!iso) return null;
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  const y = parseInt(m[1], 10) - years;
  const month = parseInt(m[2], 10);
  let day = parseInt(m[3], 10);
  const maxDay = lastDayOfMonth(y, month);
  if (day > maxDay) day = maxDay; // 29.02 → 28.02 im Nicht-Schaltjahr
  return isoDate(y, month, day);
}

export function isWithin(buchungstag: string, range: DateRange): boolean {
  if (!buchungstag) return false;
  if (range.from && buchungstag < range.from) return false;
  if (range.to && buchungstag > range.to) return false;
  return true;
}

export const PRESET_LABELS: Record<RangePreset, string> = {
  alle: "Alle Zeit",
  lfdMonat: "Lfd. Monat",
  vormonat: "Vormonat",
  lfdQuartal: "Lfd. Quartal",
  vorquartal: "Vorquartal",
  lfdJahr: "Lfd. Jahr",
  vorjahr: "Vorjahr",
  letzte12Monate: "Letzte 12 Monate",
  custom: "Benutzerdefiniert",
};
