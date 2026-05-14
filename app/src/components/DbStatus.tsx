"use client";

import { Database, Trash2 } from "lucide-react";

interface DbStatusProps {
  count: number;
  earliest: string | null;
  latest: string | null;
  lastImport: { inserted: number; skipped: number } | null;
  onClear: () => void;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "–";
  try {
    const [y, m, d] = dateStr.split("-");
    return `${d}.${m}.${y}`;
  } catch {
    return dateStr;
  }
}

export default function DbStatus({
  count,
  earliest,
  latest,
  lastImport,
  onClear,
}: DbStatusProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-700 bg-slate-800/50 px-5 py-3">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-blue-500/10 p-2">
          <Database className="h-4 w-4 text-blue-400" />
        </div>
        <div className="text-xs">
          <p className="font-medium text-slate-200">
            {count.toLocaleString("de-DE")} Transaktionen gespeichert
          </p>
          <p className="text-slate-500">
            Zeitraum: {formatDate(earliest)} – {formatDate(latest)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {lastImport && (
          <div className="text-xs text-slate-400">
            <span className="text-emerald-400 font-medium">+{lastImport.inserted}</span>
            {" neu, "}
            <span className="text-slate-500">{lastImport.skipped}</span>
            {" Duplikate übersprungen"}
          </div>
        )}
        <button
          onClick={onClear}
          className="flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-700/50 px-3 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:border-red-500 hover:text-red-400 cursor-pointer"
        >
          <Trash2 className="h-3.5 w-3.5" />
          DB leeren
        </button>
      </div>
    </div>
  );
}
