"use client";

import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { Transaction } from "../../lib/types";
import { useTheme } from "../ThemeProvider";
import { categoryPalette } from "../../lib/chart-theme";
import {
  eur,
  eurSigned,
  monthLabel,
  monthLabelLong,
  initials,
  paletteIndex,
  formatDayHeading,
} from "../../lib/mobile-format";

type Period = "alle" | string; // "alle" oder "YYYY-MM"
type CatDirection = "ausgaben" | "einnahmen";

interface MobileDashboardProps {
  transactions: Transaction[];
  isLoading: boolean;
  onCategoryTap: (kategorie: string, type: CatDirection) => void;
  onShowAll: () => void;
  onOpenTx: (t: Transaction) => void;
}

const MONTHS_SHORT = [
  "Jan", "Feb", "Mär", "Apr", "Mai", "Jun",
  "Jul", "Aug", "Sep", "Okt", "Nov", "Dez",
];

function shortMonth(yyyyMm: string): string {
  return MONTHS_SHORT[parseInt(yyyyMm.slice(5), 10) - 1] ?? yyyyMm;
}

export default function MobileDashboard({
  transactions,
  isLoading,
  onCategoryTap,
  onShowAll,
  onOpenTx,
}: MobileDashboardProps) {
  const { resolved } = useTheme();
  const palette = categoryPalette(resolved);
  const [periodChoice, setPeriodChoice] = useState<Period | null>(null);
  const [catDirection, setCatDirection] = useState<CatDirection>("ausgaben");

  const months = useMemo(() => {
    const set = new Set<string>();
    for (const t of transactions) set.add(t.buchungstag.slice(0, 7));
    return [...set].sort().reverse();
  }, [transactions]);

  // Default: aktuellster Monat mit Daten; User-Wahl überschreibt.
  const period: Period = periodChoice ?? months[0] ?? "alle";

  const periodTx = useMemo(
    () =>
      period === "alle"
        ? transactions
        : transactions.filter((t) => t.buchungstag.startsWith(period)),
    [transactions, period]
  );

  const ops = useMemo(
    () => periodTx.filter((t) => !t.isUmbuchung),
    [periodTx]
  );

  const summary = useMemo(() => {
    let einnahmen = 0;
    let ausgaben = 0;
    for (const t of ops) {
      if (t.betrag > 0) einnahmen += t.betrag;
      else ausgaben += -t.betrag;
    }
    const saldo = einnahmen - ausgaben;
    const sparquote = einnahmen > 0 ? (saldo / einnahmen) * 100 : 0;
    return { einnahmen, ausgaben, saldo, sparquote };
  }, [ops]);

  // Monats-Cashflow über die letzten 12 Monate mit Daten (unabhängig vom Zeitraum-Filter)
  const flow = useMemo(() => {
    const map = new Map<string, { einnahmen: number; ausgaben: number }>();
    for (const t of transactions) {
      if (t.isUmbuchung) continue;
      const m = t.buchungstag.slice(0, 7);
      const entry = map.get(m) ?? { einnahmen: 0, ausgaben: 0 };
      if (t.betrag > 0) entry.einnahmen += t.betrag;
      else entry.ausgaben += -t.betrag;
      map.set(m, entry);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([monat, v]) => ({ monat, ...v }));
  }, [transactions]);

  const flowMax = useMemo(
    () =>
      Math.max(1, ...flow.map((m) => Math.max(m.einnahmen, m.ausgaben))),
    [flow]
  );

  const categories = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of ops) {
      const isAusgabe = t.betrag < 0;
      if (catDirection === "ausgaben" ? !isAusgabe : isAusgabe) continue;
      map.set(t.kategorie, (map.get(t.kategorie) ?? 0) + Math.abs(t.betrag));
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [ops, catDirection]);

  const topCategories = categories.slice(0, 6);
  const restSum = categories.slice(6).reduce((s, [, v]) => s + v, 0);
  const catMax = topCategories[0]?.[1] ?? 1;
  const catTotal = categories.reduce((s, [, v]) => s + v, 0);

  const recent = useMemo(
    () =>
      [...periodTx]
        .sort((a, b) => b.buchungstag.localeCompare(a.buchungstag))
        .slice(0, 5),
    [periodTx]
  );

  if (isLoading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Lade Daten">
        <div className="h-10 animate-pulse rounded-full bg-bg-muted" />
        <div className="h-44 animate-pulse rounded-3xl bg-bg-muted" />
        <div className="h-40 animate-pulse rounded-3xl bg-bg-muted" />
        <div className="h-56 animate-pulse rounded-3xl bg-bg-muted" />
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="rounded-3xl border border-border bg-surface p-8 text-center">
        <p className="font-editorial text-2xl text-fg">Noch keine Daten</p>
        <p className="mt-3 text-sm leading-relaxed text-fg-muted">
          Importiere zuerst einen Bank-CSV-Export. Der Import ist in der
          Desktop-Ansicht unter „Daten“ verfügbar.
        </p>
      </div>
    );
  }

  const periodTitle =
    period === "alle" ? "Gesamter Zeitraum" : monthLabelLong(period);
  const eShare =
    summary.einnahmen + summary.ausgaben > 0
      ? (summary.einnahmen / (summary.einnahmen + summary.ausgaben)) * 100
      : 50;

  return (
    <div className="space-y-4">
      {/* Zeitraum-Chips */}
      <div
        className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
        role="tablist"
        aria-label="Zeitraum wählen"
      >
        <PeriodChip
          label="Alle"
          active={period === "alle"}
          onTap={() => setPeriodChoice("alle")}
        />
        {months.slice(0, 18).map((m) => (
          <PeriodChip
            key={m}
            label={monthLabel(m)}
            active={period === m}
            onTap={() => setPeriodChoice(m)}
          />
        ))}
      </div>

      {/* Hero: Saldo des Zeitraums */}
      <section className="rise rise-1 relative overflow-hidden rounded-3xl border border-border bg-surface p-5">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-14 -top-20 h-52 w-52 rounded-full bg-brand-soft opacity-50 blur-3xl"
        />
        <div className="flex items-start justify-between gap-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-fg-faint">
            Saldo · {periodTitle}
          </p>
          {summary.einnahmen > 0 && (
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums ${
                summary.sparquote >= 0
                  ? "bg-positive-soft text-positive"
                  : "bg-danger-soft text-danger"
              }`}
            >
              {summary.sparquote >= 0
                ? `${summary.sparquote.toFixed(0)} % gespart`
                : `${Math.abs(summary.sparquote).toFixed(0)} % Defizit`}
            </span>
          )}
        </div>
        <p
          className={`mt-2 font-editorial text-[42px] leading-none tracking-tight tabular-nums ${
            summary.saldo >= 0 ? "text-positive" : "text-danger"
          }`}
        >
          {eurSigned.format(summary.saldo)}
        </p>

        <div className="mt-5 flex h-1.5 overflow-hidden rounded-full bg-bg-muted">
          <div className="bg-positive" style={{ width: `${eShare}%` }} />
          <div className="bg-danger" style={{ width: `${100 - eShare}%` }} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-fg-faint">
              Einnahmen
            </p>
            <p className="mt-0.5 text-base font-semibold tabular-nums text-positive">
              {eur.format(summary.einnahmen)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-fg-faint">
              Ausgaben
            </p>
            <p className="mt-0.5 text-base font-semibold tabular-nums text-danger">
              {eur.format(summary.ausgaben)}
            </p>
          </div>
        </div>
      </section>

      {/* Monats-Cashflow */}
      {flow.length > 1 && (
        <section className="rise rise-2 rounded-3xl border border-border bg-surface p-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-fg-faint">
            Monatsverlauf
          </p>
          <div className="mt-4 flex items-stretch gap-1">
            {flow.map((m) => {
              const selected = period === m.monat;
              return (
                <button
                  key={m.monat}
                  type="button"
                  onClick={() =>
                    setPeriodChoice(selected ? "alle" : m.monat)
                  }
                  aria-label={`${monthLabelLong(m.monat)}: Einnahmen ${eur.format(m.einnahmen)}, Ausgaben ${eur.format(m.ausgaben)}`}
                  aria-pressed={selected}
                  className="group flex min-w-0 flex-1 cursor-pointer flex-col items-center"
                >
                  <div className="flex h-11 w-full items-end justify-center border-b border-border">
                    <div
                      className={`w-1/2 max-w-[14px] rounded-t-[3px] transition-colors ${
                        selected ? "bg-positive" : "bg-positive/40 group-active:bg-positive/70"
                      }`}
                      style={{
                        height:
                          m.einnahmen > 0
                            ? `max(2px, ${(m.einnahmen / flowMax) * 100}%)`
                            : "0",
                      }}
                    />
                  </div>
                  <div className="flex h-11 w-full items-start justify-center">
                    <div
                      className={`w-1/2 max-w-[14px] rounded-b-[3px] transition-colors ${
                        selected ? "bg-danger" : "bg-danger/40 group-active:bg-danger/70"
                      }`}
                      style={{
                        height:
                          m.ausgaben > 0
                            ? `max(2px, ${(m.ausgaben / flowMax) * 100}%)`
                            : "0",
                      }}
                    />
                  </div>
                  <span
                    className={`mt-1.5 text-[9px] tabular-nums ${
                      selected ? "font-semibold text-fg" : "text-fg-subtle"
                    }`}
                  >
                    {shortMonth(m.monat)}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Kategorien */}
      <section className="rise rise-3 rounded-3xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-fg-faint">
            Kategorien
          </p>
          <div className="flex rounded-full border border-border bg-bg p-0.5">
            {(["ausgaben", "einnahmen"] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setCatDirection(d)}
                className={`min-h-8 cursor-pointer rounded-full px-3 text-xs font-medium transition-colors ${
                  catDirection === d
                    ? "bg-fg text-fg-inverse"
                    : "text-fg-muted"
                }`}
              >
                {d === "ausgaben" ? "Ausgaben" : "Einnahmen"}
              </button>
            ))}
          </div>
        </div>

        {topCategories.length === 0 ? (
          <p className="mt-4 text-sm text-fg-subtle">
            Keine {catDirection === "ausgaben" ? "Ausgaben" : "Einnahmen"} im
            Zeitraum.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {topCategories.map(([name, value], i) => (
              <li key={name}>
                <button
                  type="button"
                  onClick={() => onCategoryTap(name, catDirection)}
                  className="block w-full cursor-pointer text-left"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2 text-sm text-fg">
                      <span
                        aria-hidden
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: palette[i % palette.length] }}
                      />
                      <span className="truncate">{name}</span>
                    </span>
                    <span className="shrink-0 text-sm font-medium tabular-nums text-fg-soft">
                      {eur.format(value)}
                      <span className="ml-1.5 text-[10px] text-fg-subtle">
                        {catTotal > 0
                          ? `${Math.round((value / catTotal) * 100)} %`
                          : ""}
                      </span>
                    </span>
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(value / catMax) * 100}%`,
                        background: palette[i % palette.length],
                      }}
                    />
                  </div>
                </button>
              </li>
            ))}
            {restSum > 0 && (
              <li className="flex items-baseline justify-between pt-1 text-xs text-fg-subtle">
                <span>
                  {categories.length - topCategories.length} weitere Kategorien
                </span>
                <span className="tabular-nums">{eur.format(restSum)}</span>
              </li>
            )}
          </ul>
        )}
      </section>

      {/* Letzte Buchungen */}
      <section className="rise rise-4 rounded-3xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-fg-faint">
            Letzte Buchungen
          </p>
          <button
            type="button"
            onClick={onShowAll}
            className="flex min-h-8 cursor-pointer items-center gap-0.5 text-xs font-medium text-fg-muted active:text-fg"
          >
            Alle
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <ul className="mt-2 divide-y divide-border">
          {recent.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => onOpenTx(t)}
                className="flex min-h-14 w-full cursor-pointer items-center gap-3 py-2.5 text-left"
              >
                <span
                  aria-hidden
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-fg-inverse"
                  style={{
                    background:
                      palette[
                        paletteIndex(
                          t.nameZahlungsbeteiligter || t.verwendungszweck,
                          palette.length
                        )
                      ],
                  }}
                >
                  {initials(t.nameZahlungsbeteiligter || t.verwendungszweck)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-fg">
                    {t.nameZahlungsbeteiligter || t.verwendungszweck || "—"}
                  </span>
                  <span className="block truncate text-xs text-fg-subtle">
                    {formatDayHeading(t.buchungstag)} · {t.kategorie}
                  </span>
                </span>
                <span
                  className={`shrink-0 text-sm font-semibold tabular-nums ${
                    t.betrag >= 0 ? "text-positive" : "text-fg"
                  }`}
                >
                  {eurSigned.format(t.betrag)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function PeriodChip({
  label,
  active,
  onTap,
}: {
  label: string;
  active: boolean;
  onTap: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onTap}
      className={`min-h-10 shrink-0 cursor-pointer rounded-full border px-4 text-sm font-medium transition-colors ${
        active
          ? "border-fg bg-fg text-fg-inverse"
          : "border-border bg-surface text-fg-muted active:bg-surface-hover"
      }`}
    >
      {label}
    </button>
  );
}
