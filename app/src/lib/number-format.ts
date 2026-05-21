/**
 * Parst eine im deutschen Format eingegebene Zahl zu einer JS-Zahl.
 *
 * Akzeptiert: `1234,56`, `1.234,56`, `1234`, `1.234`, `-1.234,56`,
 * Eurozeichen und umgebenden Whitespace.
 *
 * Heuristik für einen einzelnen Punkt ohne Komma:
 * - Folgen genau 3 Ziffern → Tausender-Trennzeichen (`1.234` → 1234).
 * - Sonst → Dezimalpunkt (`1.23` → 1.23, `1.2345` → 1.2345).
 * Mehrere Punkte ohne Komma gelten immer als Tausender-Trennung.
 *
 * Gibt `null` zurück, wenn die Eingabe keine gültige Zahl ist.
 */
export function parseGermanNumber(input: string): number | null {
  let s = input.trim().replace(/[\s €]/g, "");
  if (s === "") return null;

  let sign = 1;
  if (s.startsWith("-")) {
    sign = -1;
    s = s.slice(1);
  } else if (s.startsWith("+")) {
    s = s.slice(1);
  }

  if (s === "" || !/^[0-9.,]+$/.test(s)) return null;

  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  let normalized: string;

  if (hasComma) {
    // Komma = Dezimaltrenner, Punkte = Tausender
    if (s.split(",").length > 2) return null;
    normalized = s.replace(/\./g, "").replace(",", ".");
  } else if (hasDot) {
    const parts = s.split(".");
    if (parts.length > 2) {
      // mehrere Punkte → alle Tausender-Trennzeichen
      normalized = parts.join("");
    } else if (parts[1].length === 3) {
      // genau ein Punkt mit 3 Folgeziffern → Tausender-Annahme
      normalized = parts.join("");
    } else {
      // Dezimalpunkt
      normalized = s;
    }
  } else {
    normalized = s;
  }

  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  return sign * n;
}

const germanAmountFormatter = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Formatiert eine Zahl als deutschen Betrag ohne Währungssymbol: `1.234,56`. */
export function formatGermanAmount(value: number): string {
  return germanAmountFormatter.format(value);
}
