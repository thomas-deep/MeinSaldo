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
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-surface px-5 py-3">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-brand-soft p-2">
          <Database className="h-4 w-4 text-brand" />
        </div>
        <div className="text-xs">
          <p className="font-medium text-fg">
            {count.toLocaleString("de-DE")} Transaktionen gespeichert
          </p>
          <p className="text-fg-subtle">
            Zeitraum: {formatDate(earliest)} – {formatDate(latest)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {lastImport && (
          <div className="text-xs text-fg-muted">
            <span className="text-positive font-medium">+{lastImport.inserted}</span>
            {" neu, "}
            <span className="text-fg-subtle">{lastImport.skipped}</span>
            {" Duplikate übersprungen"}
          </div>
        )}
        <button
          onClick={onClear}
          className="flex items-center gap-1.5 rounded-lg border border-border-strong bg-bg-muted px-3 py-1.5 text-xs font-medium text-fg-muted transition-colors hover:border-red-500 hover:text-danger cursor-pointer"
        >
          <Trash2 className="h-3.5 w-3.5" />
          DB leeren
        </button>
      </div>
    </div>
  );
}
