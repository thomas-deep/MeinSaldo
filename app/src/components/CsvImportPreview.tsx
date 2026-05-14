"use client";

import { CheckCircle2, X, AlertCircle, Loader2 } from "lucide-react";

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
  onConfirm: () => void;
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

  return (
    <div className="space-y-3 rounded-xl border border-blue-500/30 bg-blue-500/5">
      <div className="flex flex-wrap items-center gap-4 px-5 pt-4">
        <div>
          <h3 className="text-sm font-medium text-slate-100">
            Vorschau – noch nicht importiert
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            {total} Buchungen geparst
            {dateFrom && dateTo && (
              <>
                {" "}· Zeitraum{" "}
                <span className="text-slate-200">{formatDate(dateFrom)}</span>
                {" – "}
                <span className="text-slate-200">{formatDate(dateTo)}</span>
              </>
            )}
            {" "}· Encoding{" "}
            <span className="font-mono text-slate-200">{preview.encoding}</span>
          </p>
        </div>
        <div className="flex-1" />
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-300">
            {newCount} neu
          </span>
          {duplicateCount > 0 && (
            <span className="rounded-lg bg-slate-700/50 px-2.5 py-1 text-xs text-slate-400">
              {duplicateCount} bereits vorhanden
            </span>
          )}
        </div>
      </div>

      {empty && (
        <div className="mx-5 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-200">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>
            Keine Buchungen aus der Datei extrahiert. Bitte Mapping und Separator
            prüfen.
          </span>
        </div>
      )}

      {allDuplicates && !empty && (
        <div className="mx-5 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-200">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>
            Alle Buchungen sind bereits in der Datenbank — der Import würde nichts
            verändern.
          </span>
        </div>
      )}

      {preview.preview.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-y border-slate-700 text-left text-[11px] text-slate-500">
                <th className="px-5 py-2 font-medium">Datum</th>
                <th className="px-5 py-2 font-medium">Zahlungsbeteiligter</th>
                <th className="px-5 py-2 font-medium">Verwendungszweck</th>
                <th className="px-5 py-2 font-medium">Kategorie</th>
                <th className="px-5 py-2 text-right font-medium">Betrag</th>
                <th className="px-5 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {preview.preview.map((row) => (
                <tr
                  key={row.id}
                  className={`border-b border-slate-700/40 ${
                    row.isDuplicate ? "opacity-60" : ""
                  }`}
                >
                  <td className="whitespace-nowrap px-5 py-1.5 text-slate-400">
                    {formatDate(row.buchungstag)}
                  </td>
                  <td className="max-w-[180px] truncate px-5 py-1.5 text-slate-200">
                    {row.nameZahlungsbeteiligter || "—"}
                  </td>
                  <td className="max-w-[260px] truncate px-5 py-1.5 text-slate-400">
                    {row.verwendungszweck || "—"}
                  </td>
                  <td className="px-5 py-1.5 text-slate-300">{row.kategorie}</td>
                  <td
                    className={`whitespace-nowrap px-5 py-1.5 text-right font-medium ${
                      row.betrag >= 0 ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {formatEuro(row.betrag)}
                  </td>
                  <td className="px-5 py-1.5 text-[11px]">
                    {row.isDuplicate ? (
                      <span className="text-slate-500">bereits vorhanden</span>
                    ) : (
                      <span className="text-emerald-400">neu</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > preview.previewLimit && (
        <p className="px-5 text-[11px] text-slate-500">
          Zeige erste {preview.previewLimit} von {total} Buchungen. Beim Import
          werden alle berücksichtigt.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-700/50 px-5 py-3">
        <button
          onClick={onCancel}
          disabled={isImporting}
          className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-500 cursor-pointer disabled:opacity-50"
        >
          <X className="h-3.5 w-3.5" />
          Verwerfen
        </button>
        <button
          onClick={onConfirm}
          disabled={isImporting || empty || allDuplicates}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
        >
          {isImporting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5" />
          )}
          {isImporting
            ? "Importiere…"
            : `${newCount} Buchung${newCount === 1 ? "" : "en"} importieren`}
        </button>
      </div>
    </div>
  );
}
