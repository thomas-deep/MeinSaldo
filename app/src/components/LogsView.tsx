"use client";

import { useCallback, useEffect, useState } from "react";
import {
  RefreshCw,
  Trash2,
  ChevronRight,
  Info,
  AlertTriangle,
  XCircle,
  ScrollText,
} from "lucide-react";

interface LogEntry {
  id: number;
  createdAt: string;
  level: "info" | "warn" | "error";
  event: string;
  message: string;
  details: string | null;
}

interface LogsResponse {
  logs: LogEntry[];
  total: number;
  limit: number;
  offset: number;
}

const EVENT_LABELS: Record<string, string> = {
  "ai.classify": "KI-Klassifikation",
  "ai.run": "KI-Lauf",
  import: "Import",
  "db.clear": "DB-Löschung",
  settings: "Settings",
  "logs.clear": "Logs-Löschung",
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(d);
}

function LevelBadge({ level }: { level: LogEntry["level"] }) {
  if (level === "error") {
    return (
      <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-danger bg-danger-soft">
        <XCircle className="h-3 w-3" />
        Error
      </span>
    );
  }
  if (level === "warn") {
    return (
      <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-warn bg-warn-soft">
        <AlertTriangle className="h-3 w-3" />
        Warn
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-fg-muted bg-bg-muted">
      <Info className="h-3 w-3" />
      Info
    </span>
  );
}

export default function LogsView() {
  const [data, setData] = useState<LogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [eventFilter, setEventFilter] = useState<string>("");

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      const res = await fetch("/api/logs?limit=500", { signal });
      const json = (await res.json()) as LogsResponse;
      if (signal?.aborted) return;
      setData(json);
    } catch (e) {
      if ((e as { name?: string })?.name !== "AbortError") {
        console.error("Logs load failed:", e);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch on mount mit Abort-Cleanup
    load(ctrl.signal);
    return () => ctrl.abort();
  }, [load]);

  const handleClear = useCallback(async () => {
    if (!confirm("Alle Logs löschen?")) return;
    await fetch("/api/logs", { method: "DELETE" });
    await load();
  }, [load]);

  const toggleRow = useCallback((id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const logs = data?.logs ?? [];
  const events = Array.from(new Set(logs.map((l) => l.event))).sort();
  const filtered = eventFilter
    ? logs.filter((l) => l.event === eventFilter)
    : logs;

  return (
    <div className="rounded-2xl border border-border bg-surface">
      <div className="border-b border-border px-5 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-lg bg-bg-muted p-2">
            <ScrollText className="h-5 w-5 text-fg-muted" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-medium text-fg">Logs</h3>
            <p className="text-xs text-fg-subtle">
              {data ? `${data.total} Einträge gesamt` : "lade…"} — KI-Prompts,
              Imports, DB-Operationen, Settings-Änderungen
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              className="rounded-lg border border-border-strong bg-surface-active px-3 py-1.5 text-xs text-fg"
            >
              <option value="">Alle Events</option>
              {events.map((ev) => (
                <option key={ev} value={ev}>
                  {EVENT_LABELS[ev] ?? ev}
                </option>
              ))}
            </select>
            <button
              onClick={() => load()}
              className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-fg-soft hover:border-border-strong cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Aktualisieren
            </button>
            <button
              onClick={handleClear}
              disabled={!data || data.total === 0}
              className="flex items-center gap-1.5 rounded-lg border border-danger/40 bg-danger-soft px-2.5 py-1.5 text-xs text-danger hover:bg-danger/15 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Logs löschen
            </button>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-fg-subtle">
          {loading ? "Lade Logs…" : "Keine Logs vorhanden"}
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {filtered.map((log) => {
            const isExpanded = expanded.has(log.id);
            return (
              <li key={log.id}>
                <button
                  onClick={() => toggleRow(log.id)}
                  className="flex w-full items-start gap-3 px-5 py-2.5 text-left hover:bg-surface-hover cursor-pointer"
                >
                  <ChevronRight
                    className={`mt-1 h-3.5 w-3.5 flex-shrink-0 text-fg-subtle transition-transform ${
                      isExpanded ? "rotate-90" : ""
                    } ${!log.details ? "invisible" : ""}`}
                  />
                  <span className="w-40 flex-shrink-0 font-mono text-[11px] text-fg-subtle">
                    {formatTime(log.createdAt)}
                  </span>
                  <LevelBadge level={log.level} />
                  <span className="w-32 flex-shrink-0 font-mono text-[11px] text-fg-muted">
                    {EVENT_LABELS[log.event] ?? log.event}
                  </span>
                  <span className="flex-1 text-xs text-fg-soft">
                    {log.message}
                  </span>
                </button>
                {isExpanded && log.details && (
                  <pre className="max-h-96 overflow-auto border-t border-border bg-bg-muted px-5 py-3 font-mono text-[11px] leading-relaxed text-fg-soft">
                    {(() => {
                      try {
                        return JSON.stringify(JSON.parse(log.details), null, 2);
                      } catch {
                        return log.details;
                      }
                    })()}
                  </pre>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
