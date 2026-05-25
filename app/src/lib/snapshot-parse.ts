import { parseGermanNumber } from "./number-format";

/**
 * Tolerantes Parsen einer Mehrzeilen-Eingabe aus dem Bulk-Snapshot-Modal.
 *
 * Akzeptiert pro Zeile zwei Felder „Datum" und „Wert", getrennt durch `;`,
 * `,` oder Tab. Whitespace und Anführungszeichen um Felder werden
 * entfernt. Leere Zeilen werden ignoriert.
 *
 * **Datumsformate**:
 *  - ISO `YYYY-MM-DD`
 *  - Deutsch `TT.MM.JJJJ`
 *  - Slash `TT/MM/JJJJ`
 *
 * **Zahlenformate** (via `parseGermanNumber`):
 *  - Deutsch `1.234,56`
 *  - Englisch `1234.56` / `1234`
 *
 * **Header-Erkennung**: Wenn die erste Zeile in beiden Spalten kein
 * gültiges Datum bzw. keine gültige Zahl liefert, wird sie als Header
 * verworfen statt als Fehler markiert.
 */

export interface ParsedSnapshot {
  /** 1-basierte Zeilennummer in der Original-Eingabe. */
  line: number;
  date: string; // ISO YYYY-MM-DD
  value: number;
  raw: string;
}

export interface SnapshotParseError {
  line: number;
  raw: string;
  reason: string;
}

export interface SnapshotParseResult {
  rows: ParsedSnapshot[];
  errors: SnapshotParseError[];
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DE_DATE = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/;
const SLASH_DATE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

function trimField(s: string): string {
  return s.trim().replace(/^["']|["']$/g, "").trim();
}

function parseDate(input: string): string | null {
  const s = trimField(input);
  if (!s) return null;
  const iso = s.match(ISO_DATE);
  if (iso) {
    const [, y, m, d] = iso;
    if (Number(m) < 1 || Number(m) > 12 || Number(d) < 1 || Number(d) > 31) {
      return null;
    }
    return `${y}-${m}-${d}`;
  }
  const de = s.match(DE_DATE);
  if (de) {
    const [, d, m, y] = de;
    if (Number(m) < 1 || Number(m) > 12 || Number(d) < 1 || Number(d) > 31) {
      return null;
    }
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const slash = s.match(SLASH_DATE);
  if (slash) {
    const [, d, m, y] = slash;
    if (Number(m) < 1 || Number(m) > 12 || Number(d) < 1 || Number(d) > 31) {
      return null;
    }
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}

export function parseSnapshotPaste(input: string): SnapshotParseResult {
  const lines = input.split(/\r?\n/);
  const rows: ParsedSnapshot[] = [];
  const errors: SnapshotParseError[] = [];

  // Header-Heuristik: Wenn die erste Daten-Zeile beim Parsen weder
  // Datum noch Zahl liefert, ist es wahrscheinlich eine Header-Zeile.
  let headerSkipped = false;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();
    if (!trimmed) continue;

    // Trenner-Reihenfolge: Tab > Semikolon > Komma. Erst der letzte
    // Fallback ist Komma, weil DE-Dezimalkomma sonst kollidieren würde.
    let sep: string;
    if (trimmed.includes("\t")) sep = "\t";
    else if (trimmed.includes(";")) sep = ";";
    else if (trimmed.includes(",")) sep = ",";
    else {
      errors.push({
        line: i + 1,
        raw,
        reason: "Kein Trennzeichen (Tab, Semikolon oder Komma) gefunden.",
      });
      continue;
    }
    const parts = trimmed.split(sep).map(trimField);

    // Nimm die ersten beiden nicht-leeren Spalten — Excel kann eine
    // Trailing-Empty-Spalte erzeugen.
    const [datePart, valuePart] = parts;
    const date = parseDate(datePart);
    const value = parseGermanNumber(valuePart);

    if (date === null && value === null && !headerSkipped && rows.length === 0) {
      headerSkipped = true;
      continue;
    }

    if (date === null) {
      errors.push({
        line: i + 1,
        raw,
        reason: `Kein gültiges Datum: „${datePart}". Erwartet TT.MM.JJJJ oder JJJJ-MM-TT.`,
      });
      continue;
    }
    if (value === null) {
      errors.push({
        line: i + 1,
        raw,
        reason: `Kein gültiger Wert: „${valuePart}".`,
      });
      continue;
    }

    rows.push({ line: i + 1, date, value, raw });
  }

  return { rows, errors };
}
