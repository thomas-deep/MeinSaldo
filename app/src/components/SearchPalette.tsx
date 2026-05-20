"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { Transaction } from "../lib/types";

const eurFormatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});

function formatDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (transaction: Transaction) => void;
}

export default function SearchPalette({ open, onClose, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset bei Öffnen der Palette
      setQuery("");
      setResults([]);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    if (!query.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- leere Query → leere Ergebnisse + Ladeanzeige aus
      setResults([]);
      setLoading(false);
      return;
    }
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(query)}&limit=50`,
          { signal: ctrl.signal }
        );
        if (!res.ok) throw new Error("search failed");
        const json = await res.json();
        setResults(json.transactions as Transaction[]);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setResults([]);
      } finally {
        setLoading(false);
      }
    }, 150);
    return () => {
      window.clearTimeout(timer);
      ctrl.abort();
    };
  }, [query, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 pt-24 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 text-fg-muted" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Verwendungszweck, Empfänger, Buchungstext…"
            className="flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-fg-muted"
          />
          <button
            onClick={onClose}
            aria-label="Schließen"
            className="rounded p-1 text-fg-muted hover:text-fg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {loading && (
            <div className="px-4 py-6 text-center text-sm text-fg-muted">
              Suche…
            </div>
          )}
          {!loading && query.trim() && results.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-fg-muted">
              Keine Treffer
            </div>
          )}
          {!loading && !query.trim() && (
            <div className="px-4 py-6 text-center text-sm text-fg-muted">
              Tippen für Volltextsuche über alle Transaktionen
            </div>
          )}
          {results.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                onSelect(t);
                onClose();
              }}
              className="flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left hover:bg-bg"
            >
              <div className="min-w-[80px] text-xs text-fg-muted">
                {formatDate(t.buchungstag)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="truncate text-sm font-medium text-fg">
                  {t.nameZahlungsbeteiligter || "—"}
                </div>
                <div className="truncate text-xs text-fg-muted">
                  {t.verwendungszweck || t.buchungstext}
                </div>
              </div>
              <div
                className={`min-w-[100px] text-right text-sm tabular-nums ${
                  t.betrag < 0 ? "text-red-500" : "text-emerald-500"
                }`}
              >
                {eurFormatter.format(t.betrag)}
              </div>
            </button>
          ))}
        </div>

        <div className="border-t border-border px-4 py-2 text-xs text-fg-muted">
          <kbd className="rounded border border-border bg-bg px-1.5 py-0.5">
            Esc
          </kbd>{" "}
          schließen ·{" "}
          <kbd className="rounded border border-border bg-bg px-1.5 py-0.5">
            ⌘K
          </kbd>{" "}
          öffnen
        </div>
      </div>
    </div>
  );
}
