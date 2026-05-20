"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Repeat, Calendar } from "lucide-react";
import { RecurringSeries, RecurringInterval } from "../lib/recurring";

const eurFormatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});

function formatDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

const intervalLabel: Record<RecurringInterval, string> = {
  monthly: "monatlich",
  quarterly: "quartalsweise",
  yearly: "jährlich",
};

export default function RecurringView() {
  const [series, setSeries] = useState<RecurringSeries[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/recurring", { signal: ctrl.signal });
        if (!res.ok) throw new Error("Laden fehlgeschlagen");
        const json = await res.json();
        setSeries(json.series as RecurringSeries[]);
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setError((e as Error).message);
        }
      }
    })();
    return () => ctrl.abort();
  }, []);

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-4 text-sm text-red-500">
        {error}
      </div>
    );
  }

  if (!series) {
    return <div className="text-sm text-fg-muted">Lade…</div>;
  }

  if (series.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-8 text-center text-sm text-fg-muted">
        Noch keine wiederkehrenden Buchungen erkannt. Sobald drei oder mehr
        regelmäßige Zahlungen vom selben Empfänger gebucht wurden, erscheinen
        sie hier.
      </div>
    );
  }

  const withChange = series.filter((s) => s.priceChanged);
  const stable = series.filter((s) => !s.priceChanged);

  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between">
        <h2 className="font-editorial text-2xl text-fg">Wiederkehrende Zahlungen</h2>
        <span className="text-sm text-fg-muted">
          {series.length} Serie{series.length === 1 ? "" : "n"}
        </span>
      </header>

      {withChange.length > 0 && (
        <section className="space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-medium text-amber-500">
            <AlertTriangle className="h-4 w-4" />
            Preisänderung erkannt ({withChange.length})
          </h3>
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/5">
            {withChange.map((s) => (
              <SeriesRow key={s.key} series={s} highlight />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-2">
        <h3 className="text-sm font-medium text-fg-muted">
          Stabile Serien ({stable.length})
        </h3>
        <div className="rounded-lg border border-border bg-surface">
          {stable.map((s) => (
            <SeriesRow key={s.key} series={s} />
          ))}
        </div>
      </section>
    </div>
  );
}

function SeriesRow({
  series: s,
  highlight,
}: {
  series: RecurringSeries;
  highlight?: boolean;
}) {
  const delta = s.latestBetrag - s.avgBetrag;
  return (
    <div
      className={`flex items-center gap-4 border-b border-border px-4 py-3 last:border-b-0 ${
        highlight ? "" : ""
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="truncate text-sm font-medium text-fg">{s.name}</div>
        <div className="flex items-center gap-3 text-xs text-fg-muted">
          <span className="flex items-center gap-1">
            <Repeat className="h-3 w-3" />
            {intervalLabel[s.interval]} · {s.occurrences} Buchungen
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            zuletzt {formatDate(s.lastDate)} · nächste ≈ {formatDate(s.nextExpected)}
          </span>
        </div>
      </div>
      <div className="text-right">
        <div
          className={`text-sm tabular-nums ${
            s.latestBetrag < 0 ? "text-red-500" : "text-emerald-500"
          }`}
        >
          {eurFormatter.format(s.latestBetrag)}
        </div>
        {s.priceChanged && (
          <div className="text-xs tabular-nums text-amber-500">
            ø {eurFormatter.format(s.avgBetrag)} ({delta > 0 ? "+" : ""}
            {eurFormatter.format(delta)})
          </div>
        )}
      </div>
    </div>
  );
}
