"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CalendarClock } from "lucide-react";
import { RecurringSeries, RecurringInterval } from "../../lib/recurring";
import { useTheme } from "../ThemeProvider";
import { categoryPalette } from "../../lib/chart-theme";
import {
  eur,
  eurSigned,
  formatDate,
  initials,
  paletteIndex,
} from "../../lib/mobile-format";

const INTERVAL_LABEL: Record<RecurringInterval, string> = {
  monthly: "monatlich",
  quarterly: "quartalsweise",
  yearly: "jährlich",
};

const MONTHLY_FACTOR: Record<RecurringInterval, number> = {
  monthly: 1,
  quarterly: 1 / 3,
  yearly: 1 / 12,
};

/** Read-only-Liste der erkannten wiederkehrenden Zahlungen. */
export default function MobileRecurring() {
  const [series, setSeries] = useState<RecurringSeries[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { resolved } = useTheme();
  const palette = categoryPalette(resolved);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/recurring", { signal: ctrl.signal })
      .then((r) => {
        if (!r.ok) throw new Error("Laden fehlgeschlagen");
        return r.json();
      })
      .then((json) => setSeries((json as { series: RecurringSeries[] }).series))
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

  if (!series) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Lade Abos">
        <div className="h-32 animate-pulse rounded-3xl bg-bg-muted" />
        <div className="h-64 animate-pulse rounded-3xl bg-bg-muted" />
      </div>
    );
  }

  if (series.length === 0) {
    return (
      <div className="rounded-3xl border border-border bg-surface p-8 text-center text-sm text-fg-muted">
        Noch keine wiederkehrenden Buchungen erkannt. Sobald drei oder mehr
        regelmäßige Zahlungen vom selben Empfänger gebucht wurden, erscheinen
        sie hier.
      </div>
    );
  }

  const expenses = series.filter((s) => s.avgBetrag < 0);
  const monthlyLoad = expenses.reduce(
    (sum, s) => sum + Math.abs(s.avgBetrag) * MONTHLY_FACTOR[s.interval],
    0
  );
  const sorted = [...series].sort(
    (a, b) => Math.abs(b.avgBetrag) - Math.abs(a.avgBetrag)
  );

  return (
    <div className="space-y-4">
      <section className="rise rise-1 relative overflow-hidden rounded-3xl border border-border bg-surface p-5">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-14 -top-20 h-52 w-52 rounded-full bg-warn-soft opacity-40 blur-3xl"
        />
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-fg-faint">
          Feste Kosten
        </p>
        <p className="mt-2 font-editorial text-[42px] leading-none tracking-tight tabular-nums text-fg">
          {eur.format(monthlyLoad)}
          <span className="ml-2 align-baseline font-sans text-sm font-medium text-fg-subtle">
            / Monat
          </span>
        </p>
        <p className="mt-3 text-xs text-fg-muted">
          {expenses.length} wiederkehrende{" "}
          {expenses.length === 1 ? "Zahlung" : "Zahlungen"}, auf Monatsbasis
          umgerechnet.
        </p>
      </section>

      <ul className="rise rise-2 space-y-3">
        {sorted.map((s) => (
          <li
            key={s.key}
            className="rounded-2xl border border-border bg-surface p-4"
          >
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-fg-inverse"
                style={{
                  background: palette[paletteIndex(s.name, palette.length)],
                }}
              >
                {initials(s.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-fg">
                  {s.name}
                </span>
                <span className="block text-xs text-fg-subtle">
                  {INTERVAL_LABEL[s.interval]} · {s.occurrences}×
                  {s.categories.length > 0 ? ` · ${s.categories[0]}` : ""}
                </span>
              </span>
              <span
                className={`shrink-0 text-sm font-semibold tabular-nums ${
                  s.latestBetrag >= 0 ? "text-positive" : "text-fg"
                }`}
              >
                {eurSigned.format(s.latestBetrag)}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-fg-muted">
              <span className="flex items-center gap-1.5">
                <CalendarClock className="h-3.5 w-3.5 text-fg-subtle" />
                fällig ~{formatDate(s.nextExpected)}
              </span>
              {s.priceChanged && (
                <span className="flex items-center gap-1.5 rounded-full bg-warn-soft px-2 py-0.5 font-medium text-warn">
                  <AlertTriangle className="h-3 w-3" />
                  Preis geändert (ø {eur.format(Math.abs(s.avgBetrag))})
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
