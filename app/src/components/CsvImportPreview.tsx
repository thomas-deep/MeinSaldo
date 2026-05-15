"use client";

import { CheckCircle2, X, AlertCircle, Loader2, Sparkles } from "lucide-react";
import { useAiStatus } from "../lib/use-ai-categorize";
import { AiImportMode } from "./CsvUpload";

export interface ImportPreviewRow {
  id: string;
  buchungstag: string;
  nameZahlungsbeteiligter: string;
  verwendungszweck: string;
  betrag: number;
  kategorie: string;
  isDuplicate: boolean;
}

export interface ImportPreview {
  total: number;
  newCount: number;
  duplicateCount: number;
  dateFrom: string | null;
  dateTo: string | null;
  preview: ImportPreviewRow[];
  previewLimit: number;
  encoding: string;
}

interface Props {
  preview: ImportPreview;
  onConfirm: (mode: AiImportMode) => void;
  onCancel: () => void;
  isImporting: boolean;
}

function formatEuro(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function formatDate(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : iso;
}

export default function CsvImportPreview({
  preview,
  onConfirm,
  onCancel,
  isImporting,
}: Props) {
  const { total, newCount, duplicateCount, dateFrom, dateTo } = preview;
  const allDuplicates = total > 0 && newCount === 0;
  const empty = total === 0;
  const disabled = isImporting || empty || allDuplicates;
  const { status: aiStatus } = useAiStatus();

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="flex flex-wrap items-center gap-4 px-5 py-4">
        <div>
          <h3 className="font-editorial text-xl text-fg">
            Vorschau – noch nicht importiert
          </h3>
          <p className="mt-1 text-xs text-fg-muted">
            {total} Buchungen geparst
            {dateFrom && dateTo && (
              <>
                {" "}· Zeitraum{" "}
                <span className="text-fg">{formatDate(dateFrom)}</span>
                {" – "}
                <span className="text-fg">{formatDate(dateTo)}</span>
              </>
            )}
            {" "}· Encoding{" "}
            <span className="font-mono text-fg">{preview.encoding}</span>
          </p>
        </div>
        <div className="flex-1" />
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-positive bg-positive-soft px-2.5 py-1 text-xs font-medium text-positive">
            {newCount} neu
          </span>
          {duplicateCount > 0 && (
            <span className="rounded-full border border-border bg-bg-muted px-2.5 py-1 text-xs text-fg-muted">
              {duplicateCount} bereits vorhanden
            </span>
          )}
        </div>
      </div>

      {empty && (
        <div className="mx-5 mb-3 flex items-start gap-2 rounded-lg border border-warn bg-warn-soft px-3 py-2 text-xs text-warn">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>
            Keine Buchungen aus der Datei extrahiert. Bitte Mapping und Separator
            prüfen.
          </span>
        </div>
      )}

      {allDuplicates && !empty && (
        <div className="mx-5 mb-3 flex items-start gap-2 rounded-lg border border-warn bg-warn-soft px-3 py-2 text-xs text-warn">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>
            Alle Buchungen sind bereits in der Datenbank — der Import würde nichts
            verändern.
          </span>
        </div>
      )}

      {preview.preview.length > 0 && (
        <div className="overflow-x-auto border-t border-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-bg-muted/40 text-left text-[10px] uppercase tracking-[0.12em] text-fg-faint">
                <th className="px-5 py-2 font-medium">Datum</th>
                <th className="px-5 py-2 font-medium">Zahlungsbeteiligter</th>
                <th className="px-5 py-2 font-medium">Verwendungszweck</th>
                <th className="px-5 py-2 font-medium">Kategorie</th>
                <th className="px-5 py-2 text-right font-medium">Betrag</th>
                <th className="px-5 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {preview.preview.map((row, idx) => (
                <tr
                  key={`${row.id}-${idx}`}
                  className={`border-b border-border/50 ${
                    row.isDuplicate ? "opacity-60" : ""
                  }`}
                >
                  <td className="whitespace-nowrap px-5 py-1.5 font-mono tabular-nums text-fg-muted">
                    {formatDate(row.buchungstag)}
                  </td>
                  <td className="max-w-[180px] truncate px-5 py-1.5 text-fg">
                    {row.nameZahlungsbeteiligter || "—"}
                  </td>
                  <td className="max-w-[260px] truncate px-5 py-1.5 text-fg-muted">
                    {row.verwendungszweck || "—"}
                  </td>
                  <td className="px-5 py-1.5 text-fg-soft">{row.kategorie}</td>
                  <td
                    className={`whitespace-nowrap px-5 py-1.5 text-right font-mono tabular-nums font-medium ${
                      row.betrag >= 0 ? "text-positive" : "text-danger"
                    }`}
                  >
                    {formatEuro(row.betrag)}
                  </td>
                  <td className="px-5 py-1.5 text-[11px]">
                    {row.isDuplicate ? (
                      <span className="text-fg-subtle">bereits vorhanden</span>
                    ) : (
                      <span className="text-positive">neu</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > preview.previewLimit && (
        <p className="border-t border-border px-5 py-2 text-[11px] text-fg-subtle">
          Zeige erste {preview.previewLimit} von {total} Buchungen. Beim Import
          werden alle berücksichtigt.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-border bg-bg-muted/30 px-5 py-3">
        <button
          onClick={onCancel}
          disabled={isImporting}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-fg-soft hover:border-border-strong cursor-pointer disabled:opacity-50"
        >
          <X className="h-3.5 w-3.5" />
          Verwerfen
        </button>
        <div className="flex-1" />
        {isImporting ? (
          <span className="flex items-center gap-2 text-xs text-fg-muted">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Importiere…
          </span>
        ) : (
          <>
            <button
              onClick={() => onConfirm("none")}
              disabled={disabled}
              title="Buchungen mit Regel-Kategorisierung importieren; nicht erkannte bleiben 'Sonstiges'"
              className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-fg-soft hover:border-border-strong hover:text-fg disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Importieren
            </button>
            <button
              onClick={() => onConfirm("rulesThenAi")}
              disabled={disabled || !aiStatus.enabled}
              title={
                aiStatus.enabled
                  ? "Importieren + KI klassifiziert anschließend die 'Sonstiges'-Buchungen"
                  : "Erst in den Einstellungen → KI-Kategorisierung Ollama aktivieren"
              }
              className="flex items-center gap-1.5 rounded-lg border border-magic/40 bg-magic-soft px-3 py-1.5 text-xs font-medium text-magic hover:bg-magic/15 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" />
              + KI für Sonstiges
            </button>
            <button
              onClick={() => onConfirm("allAi")}
              disabled={disabled || !aiStatus.enabled}
              title={
                aiStatus.enabled
                  ? "Importieren + alle neuen Buchungen per KI klassifizieren (überschreibt Regel-Matches)"
                  : "Erst in den Einstellungen → KI-Kategorisierung Ollama aktivieren"
              }
              className="flex items-center gap-1.5 rounded-lg bg-magic px-3 py-1.5 text-xs font-medium text-magic-fg hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" />
              + Alles KI
            </button>
          </>
        )}
      </div>
    </div>
  );
}
