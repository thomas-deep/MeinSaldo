/**
 * Format-Helfer für die Mobile-Ansicht. Pure Funktionen, keine React-Abhängigkeit.
 */

export const eur = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});

export const eurSigned = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  signDisplay: "exceptZero",
});

export const eurCompact = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const WEEKDAYS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const MONTHS_SHORT = [
  "Jan", "Feb", "Mär", "Apr", "Mai", "Jun",
  "Jul", "Aug", "Sep", "Okt", "Nov", "Dez",
];

/** `2026-06-11` → `11.06.2026` */
export function formatDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

/** `2026-06-11` → `Do, 11. Jun` (Gruppen-Header in der Buchungsliste) */
export function formatDayHeading(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const [y, m, d] = iso.split("-").map((s) => parseInt(s, 10));
  const date = new Date(Date.UTC(y, m - 1, d));
  return `${WEEKDAYS[date.getUTCDay()]}, ${d}. ${MONTHS_SHORT[m - 1]}`;
}

/** `2026-06` → `Jun ’26` */
export function monthLabel(yyyyMm: string): string {
  const [y, m] = yyyyMm.split("-");
  const idx = parseInt(m, 10) - 1;
  if (idx < 0 || idx > 11) return yyyyMm;
  return `${MONTHS_SHORT[idx]} ’${y.slice(2)}`;
}

/** `2026-06` → `Juni 2026` (ausgeschrieben für den Hero-Header) */
export function monthLabelLong(yyyyMm: string): string {
  const LONG = [
    "Januar", "Februar", "März", "April", "Mai", "Juni",
    "Juli", "August", "September", "Oktober", "November", "Dezember",
  ];
  const [y, m] = yyyyMm.split("-");
  const idx = parseInt(m, 10) - 1;
  if (idx < 0 || idx > 11) return yyyyMm;
  return `${LONG[idx]} ${y}`;
}

/** Initialen für den Counterparty-Avatar, z. B. "Stadtwerke München" → "SM" */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "·";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/** Stabiler Hash → Index, um Counterparties konsistent einzufärben. */
export function paletteIndex(s: string, size: number): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % size;
}
