import Papa from "papaparse";
import {
  CategoryRule,
  FieldMapping,
  PreprocessResult,
  RawRow,
  RawTransaction,
  Transaction,
} from "./types";
import { categorizeTransaction } from "./categories";

function parseGermanNumber(value: string): number {
  if (!value) return 0;
  const trimmed = value.trim();
  const hasComma = trimmed.includes(",");
  const hasDot = trimmed.includes(".");
  let cleaned: string;
  if (hasComma && hasDot) {
    cleaned = trimmed.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    cleaned = trimmed.replace(",", ".");
  } else if (hasDot) {
    const lastDot = trimmed.lastIndexOf(".");
    const afterDot = trimmed.length - lastDot - 1;
    if (afterDot >= 1 && afterDot <= 2 && trimmed.split(".").length === 2) {
      cleaned = trimmed;
    } else {
      cleaned = trimmed.replace(/\./g, "");
    }
  } else {
    cleaned = trimmed;
  }
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function parseGermanDate(value: string): string {
  if (!value) return "";
  const trimmed = value.trim();
  const dotted4 = trimmed.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (dotted4) return `${dotted4[3]}-${dotted4[2]}-${dotted4[1]}`;
  const dotted2 = trimmed.match(/^(\d{2})\.(\d{2})\.(\d{2})$/);
  if (dotted2) {
    const yy = parseInt(dotted2[3], 10);
    const fullYear = yy < 70 ? 2000 + yy : 1900 + yy;
    return `${fullYear}-${dotted2[2]}-${dotted2[1]}`;
  }
  const slashed = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (slashed) return `${slashed[3]}-${slashed[2]}-${slashed[1]}`;
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return trimmed;
  return trimmed;
}

export interface ParseOptions {
  invertAmount?: boolean;
  defaultCurrency?: string;
  skipRows?: number;
  preprocess?: (rawText: string) => PreprocessResult;
  rowTransform?: (row: RawRow) => RawRow;
  rules?: CategoryRule[];
}

function applyPreprocessing(
  csvText: string,
  options: ParseOptions
): { csvText: string; defaultFields: Record<string, string> } {
  if (options.preprocess) {
    const r = options.preprocess(csvText);
    return { csvText: r.csvText, defaultFields: r.defaultFields ?? {} };
  }
  if (options.skipRows && options.skipRows > 0) {
    const lines = csvText.split(/\r?\n/);
    return { csvText: lines.slice(options.skipRows).join("\n"), defaultFields: {} };
  }
  return { csvText, defaultFields: {} };
}

export function parseCsvData(
  csvText: string,
  mapping: FieldMapping,
  separator: string,
  options: ParseOptions = {}
): Transaction[] {
  const { csvText: cleaned, defaultFields } = applyPreprocessing(csvText, options);
  const result = Papa.parse<RawTransaction>(cleaned, {
    header: true,
    delimiter: separator,
    skipEmptyLines: true,
  });

  return result.data
    .map((row) => {
      const merged = { ...defaultFields, ...row };
      return options.rowTransform ? options.rowTransform(merged) : merged;
    })
    .filter((row) => {
      const betragField = row[mapping.betrag];
      return betragField !== undefined && betragField !== "";
    })
    .map((row, index) => {
      let betrag = parseGermanNumber(row[mapping.betrag] || "0");
      if (options.invertAmount) betrag = -betrag;
      const tx: Transaction = {
        id: `tx-${index}`,
        kontoBezeichnung: row[mapping.kontoBezeichnung] || "",
        ibanKonto: row[mapping.ibanKonto] || "",
        buchungstag: parseGermanDate(row[mapping.buchungstag] || ""),
        valutadatum: parseGermanDate(row[mapping.valutadatum] || ""),
        nameZahlungsbeteiligter: row[mapping.nameZahlungsbeteiligter] || "",
        ibanZahlungsbeteiligter: row[mapping.ibanZahlungsbeteiligter] || "",
        buchungstext: row[mapping.buchungstext] || "",
        verwendungszweck: row[mapping.verwendungszweck] || "",
        betrag,
        waehrung: row[mapping.waehrung] || options.defaultCurrency || "EUR",
        saldoNachBuchung: parseGermanNumber(row[mapping.saldoNachBuchung] || "0"),
        kategorie: "",
      };
      tx.kategorie = categorizeTransaction(tx, options.rules);
      return tx;
    });
}

export function detectCsvHeaders(
  csvText: string,
  separator: string,
  options: ParseOptions = {}
): string[] {
  const { csvText: cleaned, defaultFields } = applyPreprocessing(csvText, options);
  const result = Papa.parse<RawRow>(cleaned, {
    header: true,
    delimiter: separator,
    preview: 1,
  });
  const baseHeaders = result.meta.fields || [];
  const headersSet = new Set(baseHeaders);
  Object.keys(defaultFields).forEach((k) => headersSet.add(k));
  if (options.rowTransform && result.data[0]) {
    const transformed = options.rowTransform({ ...defaultFields, ...result.data[0] });
    Object.keys(transformed).forEach((k) => headersSet.add(k));
  }
  return Array.from(headersSet);
}
