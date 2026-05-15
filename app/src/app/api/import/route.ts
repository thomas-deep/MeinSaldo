import { NextRequest, NextResponse } from "next/server";
import {
  computeTransactionHash,
  existingHashes,
  getKategorieRules,
  insertTransactions,
  logEvent,
  trimLogs,
} from "../../../lib/db";
import { bankPresets, defaultMapping } from "../../../lib/field-mapping";
import { parseCsvData } from "../../../lib/parse-csv";
import { FieldMapping, PreprocessResult, RawRow } from "../../../lib/types";

const PREVIEW_LIMIT = 30;

const SUPPORTED_ENCODINGS = ["utf-8", "windows-1252"] as const;
type Encoding = (typeof SUPPORTED_ENCODINGS)[number];
const MAX_FILE_BYTES = 25 * 1024 * 1024;

function isEncoding(v: string): v is Encoding {
  return (SUPPORTED_ENCODINGS as readonly string[]).includes(v);
}

function readMapping(json: string | null): FieldMapping {
  if (!json) return { ...defaultMapping };
  try {
    const parsed = JSON.parse(json) as Partial<FieldMapping>;
    return { ...defaultMapping, ...parsed };
  } catch {
    throw new Error("mapping ist kein valides JSON");
  }
}

interface ImportConfig {
  mapping: FieldMapping;
  separator: string;
  invertAmount: boolean;
  defaultCurrency: string;
  presetEncoding: string;
  preprocess?: (raw: string) => PreprocessResult;
  rowTransform?: (row: RawRow) => RawRow;
}

function resolveConfig(form: FormData): ImportConfig {
  const presetName = (form.get("preset") as string | null) ?? null;
  const preset = presetName
    ? bankPresets.find((p) => p.name === presetName) ?? null
    : null;
  if (presetName && !preset) {
    throw new Error(`Unbekanntes Preset: ${presetName}`);
  }

  const mappingJson = (form.get("mapping") as string | null) ?? null;
  const mapping = mappingJson ? readMapping(mappingJson) : { ...(preset?.mapping ?? defaultMapping) };
  const separator =
    (form.get("separator") as string | null) || preset?.separator || ";";
  const invertAmountRaw = form.get("invertAmount") as string | null;
  const invertAmount =
    invertAmountRaw !== null
      ? invertAmountRaw === "1" || invertAmountRaw === "true"
      : preset?.invertAmount ?? false;
  const defaultCurrency =
    (form.get("defaultCurrency") as string | null) ||
    preset?.defaultCurrency ||
    "EUR";

  return {
    mapping,
    separator,
    invertAmount,
    defaultCurrency,
    presetEncoding: preset?.encoding ?? "utf-8",
    preprocess: preset?.preprocess,
    rowTransform: preset?.rowTransform,
  };
}

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "multipart/form-data erwartet" },
      { status: 400 }
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file fehlt" }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: `Datei zu groß (max ${MAX_FILE_BYTES} Bytes)` },
      { status: 413 }
    );
  }

  const encodingChoice = (form.get("encoding") as string | null) ?? "auto";
  const kontogruppeIdRaw = form.get("kontogruppeId") as string | null;
  const kontogruppeId =
    kontogruppeIdRaw && kontogruppeIdRaw !== ""
      ? Number.parseInt(kontogruppeIdRaw, 10)
      : null;
  if (kontogruppeIdRaw && Number.isNaN(kontogruppeId)) {
    return NextResponse.json(
      { error: "kontogruppeId muss eine Zahl sein" },
      { status: 400 }
    );
  }

  let config: ImportConfig;
  try {
    config = resolveConfig(form);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Konfigurationsfehler" },
      { status: 400 }
    );
  }

  const encoding =
    encodingChoice === "auto"
      ? config.presetEncoding
      : isEncoding(encodingChoice)
        ? encodingChoice
        : "utf-8";

  const buffer = await file.arrayBuffer();
  let text: string;
  try {
    text = new TextDecoder(encoding, { fatal: false }).decode(buffer);
  } catch {
    text = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
  }

  let transactions;
  try {
    const dbRules = getKategorieRules();
    const rules = dbRules
      .filter((r) => !r.isFallback)
      .map((r) => ({
        kategorie: r.name,
        keywords: r.keywords,
        namePatterns: r.namePatterns,
        direction: r.direction,
      }));
    transactions = parseCsvData(text, config.mapping, config.separator, {
      invertAmount: config.invertAmount,
      defaultCurrency: config.defaultCurrency,
      preprocess: config.preprocess,
      rowTransform: config.rowTransform,
      rules,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Parse-Fehler" },
      { status: 400 }
    );
  }

  const dryRun = form.get("dryRun") === "1" || form.get("dryRun") === "true";

  if (dryRun) {
    const hashes = transactions.map((t) => computeTransactionHash(t));
    const existing = existingHashes(hashes);
    const dates = transactions
      .map((t) => t.buchungstag)
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
      .sort();
    const preview = transactions.slice(0, PREVIEW_LIMIT).map((t, i) => ({
      id: hashes[i],
      buchungstag: t.buchungstag,
      nameZahlungsbeteiligter: t.nameZahlungsbeteiligter,
      verwendungszweck: t.verwendungszweck,
      betrag: t.betrag,
      kategorie: t.kategorie,
      isDuplicate: existing.has(hashes[i]),
    }));
    return NextResponse.json({
      dryRun: true,
      total: transactions.length,
      newCount: hashes.filter((h) => !existing.has(h)).length,
      duplicateCount: existing.size,
      dateFrom: dates[0] ?? null,
      dateTo: dates[dates.length - 1] ?? null,
      preview,
      previewLimit: PREVIEW_LIMIT,
      encoding,
    });
  }

  const result = insertTransactions(transactions, kontogruppeId);
  logEvent(
    "info",
    "import",
    `${file.name}: ${result.inserted} importiert, ${result.skipped} übersprungen (${transactions.length} geparst)`,
    {
      filename: file.name,
      size: file.size,
      encoding,
      preset: (form.get("preset") as string | null) ?? null,
      kontogruppeId,
      inserted: result.inserted,
      skipped: result.skipped,
      total: result.total,
    }
  );
  trimLogs();
  return NextResponse.json({
    inserted: result.inserted,
    skipped: result.skipped,
    total: result.total,
    insertedIds: result.insertedIds,
    parsed: transactions.length,
    encoding,
  });
}
