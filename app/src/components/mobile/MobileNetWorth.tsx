"use client";

import { useEffect, useId, useState } from "react";
import {
  NetWorthEntry,
  NetWorthHistoryPoint,
} from "../../lib/types";
import { eur, eurCompact, formatDate, monthLabel } from "../../lib/mobile-format";

interface NetWorthData {
  assets: NetWorthEntry[];
  liabilities: NetWorthEntry[];
  history: NetWorthHistoryPoint[];
  totals: { assets: number; liabilities: number; net: number };
}

/**
 * Read-only-Vermögensübersicht für Mobile. Posten anlegen und Snapshots
 * pflegen bleibt Desktop-Aufgabe (NetWorthView).
 */
export default function MobileNetWorth() {
  const [data, setData] = useState<NetWorthData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/networth", { signal: ctrl.signal })
      .then((r) => {
        if (!r.ok) throw new Error("Laden fehlgeschlagen");
        return r.json();
      })
      .then((json) => setData(json as NetWorthData))
      .catch((e) => {
        if ((e as Error).name !== "AbortError") setError((e as Error).message);
      });
    return () => ctrl.abort();
  }, []);

  if (error) {
    return (
      <div className="rounded-3xl border border-danger/30 bg-danger-soft p-5 text-sm text-danger">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Lade Vermögen">
        <div className="h-44 animate-pulse rounded-3xl bg-bg-muted" />
        <div className="h-56 animate-pulse rounded-3xl bg-bg-muted" />
      </div>
    );
  }

  const { assets, liabilities, history, totals } = data;
  const hasAny = assets.length > 0 || liabilities.length > 0;

  return (
    <div className="space-y-4">
      <section className="rise rise-1 relative overflow-hidden rounded-3xl border border-border bg-surface p-5">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-14 -top-20 h-52 w-52 rounded-full bg-accent-soft opacity-50 blur-3xl"
        />
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-fg-faint">
          Nettovermögen
        </p>
        <p
          className={`mt-2 font-editorial text-[42px] leading-none tracking-tight tabular-nums ${
            totals.net >= 0 ? "text-fg" : "text-danger"
          }`}
        >
          {eur.format(totals.net)}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-fg-faint">
              Vermögen
            </p>
            <p className="mt-0.5 text-base font-semibold tabular-nums text-positive">
              {eur.format(totals.assets)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-fg-faint">
              Verbindlichkeiten
            </p>
            <p className="mt-0.5 text-base font-semibold tabular-nums text-danger">
              {eur.format(totals.liabilities)}
            </p>
          </div>
        </div>
      </section>

      {history.length >= 2 && <NetSparkline history={history} />}

      {!hasAny && (
        <div className="rounded-3xl border border-border bg-surface p-8 text-center text-sm text-fg-muted">
          Noch keine Vermögensposten. Konten zählen automatisch, sobald
          Buchungen importiert sind; manuelle Posten legst du in der
          Desktop-Ansicht an.
        </div>
      )}

      {assets.length > 0 && (
        <EntryList title="Vermögen" entries={assets} valueColor="text-fg" />
      )}
      {liabilities.length > 0 && (
        <EntryList
          title="Verbindlichkeiten"
          entries={liabilities}
          valueColor="text-danger"
        />
      )}
    </div>
  );
}

function NetSparkline({ history }: { history: NetWorthHistoryPoint[] }) {
  const gradientId = useId();
  const values = history.map((h) => h.net);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const W = 100;
  const H = 36;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    // 2px Innenabstand oben/unten, damit die Linie nicht am Rand klebt
    const y = H - 2 - ((v - min) / span) * (H - 4);
    return [x, y] as const;
  });
  const line = pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const area = `0,${H} ${line} ${W},${H}`;
  const first = history[0];
  const last = history[history.length - 1];

  return (
    <section className="rise rise-2 rounded-3xl border border-border bg-surface p-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-fg-faint">
          Verlauf
        </p>
        <p className="text-xs tabular-nums text-fg-subtle">
          {monthLabel(first.date.slice(0, 7))} – {monthLabel(last.date.slice(0, 7))}
        </p>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="mt-3 h-24 w-full"
        role="img"
        aria-label={`Nettovermögen von ${eurCompact.format(first.net)} auf ${eurCompact.format(last.net)}`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={area} fill={`url(#${gradientId})`} />
        <polyline
          points={line}
          fill="none"
          stroke="var(--brand)"
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="mt-2 flex items-baseline justify-between text-xs tabular-nums">
        <span className="text-fg-subtle">{eurCompact.format(min)}</span>
        <span className="font-medium text-fg-soft">
          aktuell {eurCompact.format(last.net)}
        </span>
        <span className="text-fg-subtle">{eurCompact.format(max)}</span>
      </div>
    </section>
  );
}

function EntryList({
  title,
  entries,
  valueColor,
}: {
  title: string;
  entries: NetWorthEntry[];
  valueColor: string;
}) {
  return (
    <section className="rise rise-3 rounded-3xl border border-border bg-surface p-5">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-fg-faint">
        {title}
      </p>
      <ul className="mt-2 divide-y divide-border">
        {entries.map((e) => (
          <li
            key={`${e.source}-${e.id}`}
            className="flex min-h-13 items-center justify-between gap-3 py-2.5"
          >
            <span className="min-w-0">
              <span className="block truncate text-sm text-fg">
                {e.displayPrefix ?? e.name}
              </span>
              <span className="block text-xs text-fg-subtle">
                {e.source === "konto" ? "Konto" : e.kind}
                {e.latestDate ? ` · Stand ${formatDate(e.latestDate)}` : ""}
              </span>
            </span>
            <span className={`shrink-0 text-sm font-semibold tabular-nums ${valueColor}`}>
              {e.latestValue != null ? eur.format(e.latestValue) : "—"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
