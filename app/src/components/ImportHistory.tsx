"use client";

import { useCallback, useEffect, useState } from "react";
import { Clock, RefreshCw, Trash2, Wallet } from "lucide-react";
import { Kontogruppe, formatKontogruppe } from "../lib/types";

interface ImportBatch {
  importedAt: string;
  count: number;
  kontogruppen: {
    id: number | null;
    name: string | null;
    inhaberName: string | null;
  }[];
  dateFrom: string | null;
  dateTo: string | null;
}

interface Props {
  kontogruppen: Kontogruppe[];
  onChange: () => void | Promise<void>;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : iso;
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const sec = Math.round(diffMs / 1000);
  if (sec < 60) return "gerade eben";
  const min = Math.round(sec / 60);
  if (min < 60) return `vor ${min} Min.`;
  const h = Math.round(min / 60);
  if (h < 24) return `vor ${h} Std.`;
  const days = Math.round(h / 24);
  if (days < 30) return `vor ${days} Tag${days === 1 ? "" : "en"}`;
  return formatDateTime(iso);
}

export default function ImportHistory({ kontogruppen, onChange }: Props) {
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const res = await fetch("/api/imports", { signal });
      const json = (await res.json()) as { imports: ImportBatch[] };
      if (signal?.aborted) return;
      setBatches(json.imports);
    } catch (e) {
      if ((e as { name?: string })?.name !== "AbortError") {
        console.error("Imports load failed:", e);
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

  const handleReassign = useCallback(
    async (importedAt: string, kontogruppeId: number | null) => {
      setBusy(importedAt);
      try {
        await fetch("/api/imports", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ importedAt, kontogruppeId }),
        });
        await load();
        await onChange();
      } finally {
        setBusy(null);
      }
    },
    [load, onChange]
  );

  const handleDelete = useCallback(
    async (importedAt: string, count: number) => {
      if (
        !confirm(
          `Diesen Import wirklich löschen?\n${count} Buchung${count === 1 ? "" : "en"} werden aus der Datenbank entfernt.`
        )
      )
        return;
      setBusy(importedAt);
      try {
        await fetch("/api/imports", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ importedAt }),
        });
        await load();
        await onChange();
      } finally {
        setBusy(null);
      }
    },
    [load, onChange]
  );

  if (!loading && batches.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-surface">
      <div className="flex items-center gap-3 border-b border-border px-5 py-4">
        <div className="rounded-lg bg-bg-muted p-2">
          <Clock className="h-5 w-5 text-fg-muted" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-fg">Import-Historie</h3>
          <p className="text-xs text-fg-subtle">
            Jeder Eintrag fasst die Buchungen eines Imports zusammen — falsche
            Konto-Zuordnung verschieben oder den ganzen Import wieder löschen.
          </p>
        </div>
        <button
          onClick={() => load()}
          className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-fg-soft hover:border-border-strong cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Aktualisieren
        </button>
      </div>

      <ul className="divide-y divide-border">
        {batches.map((b) => {
          const isBusy = busy === b.importedAt;
          const kgLabel =
            b.kontogruppen.length === 0
              ? "—"
              : b.kontogruppen
                  .map((k) =>
                    k.name === null
                      ? "(keine Zuordnung)"
                      : k.inhaberName
                        ? `${k.inhaberName} · ${k.name}`
                        : k.name
                  )
                  .join(", ");
          return (
            <li
              key={b.importedAt}
              className="flex flex-wrap items-center gap-3 px-5 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm text-fg">
                  <span className="font-mono tabular-nums">{b.count}</span>{" "}
                  Buchung{b.count === 1 ? "" : "en"}{" "}
                  <span className="text-fg-subtle">·</span>{" "}
                  <span className="text-fg-muted">{relativeTime(b.importedAt)}</span>
                </p>
                <p className="text-xs text-fg-subtle">
                  Zeitraum {formatDate(b.dateFrom)} – {formatDate(b.dateTo)}{" "}
                  <span className="text-fg-faint">·</span> Konto:{" "}
                  <span className="text-fg-muted">{kgLabel}</span>
                </p>
              </div>

              <div className="flex items-center gap-1.5 rounded-lg border border-border bg-bg-muted pl-2.5 pr-1 py-0.5">
                <Wallet className="h-3.5 w-3.5 text-fg-muted" />
                <select
                  value=""
                  disabled={isBusy || kontogruppen.length === 0}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "") return;
                    const kgId = v === "null" ? null : Number(v);
                    void handleReassign(b.importedAt, kgId);
                    e.target.value = "";
                  }}
                  className="border-none bg-transparent py-1 text-xs text-fg outline-none cursor-pointer"
                >
                  <option value="">Konto wechseln…</option>
                  {kontogruppen.map((k) => (
                    <option key={k.id} value={k.id}>
                      {formatKontogruppe(k)}
                    </option>
                  ))}
                  <option value="null">(keine Zuordnung)</option>
                </select>
              </div>

              <button
                onClick={() => handleDelete(b.importedAt, b.count)}
                disabled={isBusy}
                className="flex items-center gap-1.5 rounded-lg border border-danger/40 bg-danger-soft px-2.5 py-1.5 text-xs font-medium text-danger hover:bg-danger/15 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Import löschen
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
