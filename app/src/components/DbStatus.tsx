"use client";

import { useState } from "react";
import {
  ArrowLeftRight,
  ChevronDown,
  Database,
  Loader2,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useAiStatus } from "../lib/use-ai-categorize";

interface DbStatusProps {
  count: number;
  earliest: string | null;
  latest: string | null;
  lastImport: { inserted: number; skipped: number } | null;
  onClear: () => void;
  onRecomputeUmbuchungen: () => Promise<void> | void;
  onRecategorizeRules: (mode: "rules-only-sonstiges" | "rules") => Promise<void> | void;
  onRecategorizeAi: (mode: "ai-sonstiges" | "ai-all") => Promise<void> | void;
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
  onRecomputeUmbuchungen,
  onRecategorizeRules,
  onRecategorizeAi,
}: DbStatusProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const { status: aiStatus } = useAiStatus();

  const wrap = async (label: string, fn: () => Promise<void> | void) => {
    setBusy(label);
    try {
      await fn();
    } finally {
      setBusy(null);
      setMenuOpen(false);
    }
  };

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

      <div className="flex flex-wrap items-center gap-2">
        {lastImport && (
          <div className="mr-2 text-xs text-fg-muted">
            <span className="text-positive font-medium">+{lastImport.inserted}</span>
            {" neu, "}
            <span className="text-fg-subtle">{lastImport.skipped}</span>
            {" Duplikate übersprungen"}
          </div>
        )}

        <button
          onClick={() =>
            wrap("umbuchungen", () => onRecomputeUmbuchungen())
          }
          disabled={busy !== null}
          className="flex items-center gap-1.5 rounded-lg border border-border-strong bg-bg-muted px-3 py-1.5 text-xs font-medium text-fg-soft hover:text-fg disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          title="Umbuchungs-Erkennung neu über alle Buchungen laufen lassen — manuelle Markierungen bleiben erhalten"
        >
          {busy === "umbuchungen" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ArrowLeftRight className="h-3.5 w-3.5" />
          )}
          Umbuchungen finden
        </button>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            disabled={busy !== null}
            className="flex items-center gap-1.5 rounded-lg border border-border-strong bg-bg-muted px-3 py-1.5 text-xs font-medium text-fg-soft hover:text-fg disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            title="Bestehende Buchungen neu kategorisieren"
          >
            {busy?.startsWith("recat") ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            Neukategorisieren
            <ChevronDown className="h-3 w-3" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full z-20 mt-1 w-72 rounded-xl border border-border bg-surface p-1.5 shadow-[var(--shadow-md)]">
              <button
                onClick={() =>
                  wrap("recat-rules-sonstiges", () =>
                    onRecategorizeRules("rules-only-sonstiges")
                  )
                }
                className="block w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-bg-muted cursor-pointer"
              >
                <div className="font-medium text-fg">
                  Regeln auf &bdquo;Sonstiges&ldquo; anwenden
                </div>
                <div className="mt-0.5 text-fg-subtle">
                  Nur unkategorisierte Buchungen, manuelle Overrides bleiben.
                </div>
              </button>
              <button
                onClick={() =>
                  wrap("recat-rules-all", () => onRecategorizeRules("rules"))
                }
                className="block w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-bg-muted cursor-pointer"
              >
                <div className="font-medium text-fg">
                  Regeln über alle Buchungen
                </div>
                <div className="mt-0.5 text-fg-subtle">
                  Alle automatisch zugeordneten Buchungen neu nach den
                  aktuellen Regeln. Manuelle Overrides bleiben.
                </div>
              </button>
              <button
                onClick={() =>
                  wrap("recat-ai-sonst", () => onRecategorizeAi("ai-sonstiges"))
                }
                disabled={!aiStatus.enabled}
                className="block w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-bg-muted disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                title={
                  aiStatus.enabled
                    ? `KI nur auf "Sonstiges" anwenden — Model: ${aiStatus.model}`
                    : "Erst Ollama in den Einstellungen aktivieren"
                }
              >
                <div className="font-medium text-magic">
                  KI nur auf &bdquo;Sonstiges&ldquo;
                </div>
                <div className="mt-0.5 text-fg-subtle">
                  Ollama-Modell läuft über noch unkategorisierte Buchungen.
                </div>
              </button>
              <button
                onClick={() =>
                  wrap("recat-ai-all", () => onRecategorizeAi("ai-all"))
                }
                disabled={!aiStatus.enabled}
                className="block w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-bg-muted disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                title={
                  aiStatus.enabled
                    ? `KI auf alle Buchungen (außer manuell überschriebene)`
                    : "Erst Ollama in den Einstellungen aktivieren"
                }
              >
                <div className="font-medium text-magic">
                  Komplett über KI
                </div>
                <div className="mt-0.5 text-fg-subtle">
                  Ollama-Modell läuft über alle automatisch zugeordneten
                  Buchungen (lang, manuelle Overrides bleiben).
                </div>
              </button>
            </div>
          )}
        </div>

        <button
          onClick={onClear}
          disabled={busy !== null}
          className="flex items-center gap-1.5 rounded-lg border border-border-strong bg-bg-muted px-3 py-1.5 text-xs font-medium text-fg-muted transition-colors hover:border-red-500 hover:text-danger disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          <Trash2 className="h-3.5 w-3.5" />
          DB leeren
        </button>
      </div>
    </div>
  );
}
