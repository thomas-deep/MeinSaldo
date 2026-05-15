"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Transaction } from "../lib/types";

interface SummaryCardsProps {
  transactions: Transaction[];
  comparison?: Transaction[];
  comparisonLabel?: string;
  includeUmbuchungen?: boolean;
}

function formatEuro(value: number, opts?: { sign?: boolean }): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    signDisplay: opts?.sign ? "exceptZero" : "auto",
  }).format(value);
}

interface Aggregate {
  einnahmen: number;
  ausgaben: number;
  saldo: number;
  sparquote: number;
  umbuchungenCount: number;
  umbuchungenVolume: number;
}

function aggregate(
  transactions: Transaction[],
  includeUmbuchungen: boolean
): Aggregate {
  const operative = includeUmbuchungen
    ? transactions
    : transactions.filter((t) => !t.isUmbuchung);
  const umbuchungen = transactions.filter((t) => t.isUmbuchung);
  const einnahmen = operative
    .filter((t) => t.betrag > 0)
    .reduce((sum, t) => sum + t.betrag, 0);
  const ausgaben = operative
    .filter((t) => t.betrag < 0)
    .reduce((sum, t) => sum + Math.abs(t.betrag), 0);
  const saldo = einnahmen - ausgaben;
  const sparquote = einnahmen > 0 ? (saldo / einnahmen) * 100 : 0;
  return {
    einnahmen,
    ausgaben,
    saldo,
    sparquote,
    umbuchungenCount: umbuchungen.length,
    umbuchungenVolume: umbuchungen.reduce((s, t) => s + Math.abs(t.betrag), 0),
  };
}

function deltaPct(current: number, prev: number): number | null {
  if (prev === 0) return null;
  return ((current - prev) / Math.abs(prev)) * 100;
}

interface DeltaProps {
  label: string;
  current: number;
  prev: number;
  lowerIsBetter?: boolean;
  format: (v: number) => string;
}

function Delta({ label, current, prev, lowerIsBetter, format }: DeltaProps) {
  const diff = current - prev;
  const pct = deltaPct(current, prev);
  const isImprovement = lowerIsBetter ? diff < 0 : diff > 0;
  const isWorse = lowerIsBetter ? diff > 0 : diff < 0;
  const color =
    diff === 0
      ? "text-fg-subtle"
      : isImprovement
        ? "text-positive"
        : isWorse
          ? "text-danger"
          : "text-fg-muted";
  const Icon = diff === 0 ? Minus : diff > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3 text-[11px]">
      <span className="uppercase tracking-[0.16em] text-fg-faint">{label}</span>
      <span className={`inline-flex items-center gap-1 font-mono tabular-nums ${color}`}>
        <Icon className="h-3 w-3" />
        {pct !== null
          ? `${diff > 0 ? "+" : ""}${pct.toFixed(1)} %`
          : "—"}
        <span className="ml-1 text-fg-subtle">{format(prev)}</span>
      </span>
    </div>
  );
}

interface CardProps {
  label: string;
  value: string;
  valueColor?: string;
  caption?: string;
  delta?: { current: number; prev: number; lowerIsBetter?: boolean };
  comparisonLabel: string;
  formatDelta: (v: number) => string;
}

function StatCard({
  label,
  value,
  valueColor = "text-fg",
  caption,
  delta,
  comparisonLabel,
  formatDelta,
}: CardProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-6 transition-shadow hover:shadow-[var(--shadow-md)]">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-fg-faint">
        {label}
      </p>
      <p
        className={`mt-3 font-editorial text-[44px] leading-[0.95] tracking-tight ${valueColor}`}
      >
        <span className="tabular-nums">{value}</span>
      </p>
      {caption && (
        <p className="mt-2 text-xs text-fg-muted">{caption}</p>
      )}
      {delta && (
        <Delta
          label={comparisonLabel}
          current={delta.current}
          prev={delta.prev}
          lowerIsBetter={delta.lowerIsBetter}
          format={formatDelta}
        />
      )}
    </div>
  );
}

export default function SummaryCards({
  transactions,
  comparison,
  comparisonLabel = "vs. Vorjahr",
  includeUmbuchungen = false,
}: SummaryCardsProps) {
  const cur = aggregate(transactions, includeUmbuchungen);
  const prev = comparison ? aggregate(comparison, includeUmbuchungen) : null;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Einnahmen"
          value={formatEuro(cur.einnahmen)}
          valueColor="text-positive"
          comparisonLabel={comparisonLabel}
          delta={
            prev
              ? { current: cur.einnahmen, prev: prev.einnahmen }
              : undefined
          }
          formatDelta={formatEuro}
        />
        <StatCard
          label="Ausgaben"
          value={formatEuro(cur.ausgaben)}
          valueColor="text-danger"
          comparisonLabel={comparisonLabel}
          delta={
            prev
              ? {
                  current: cur.ausgaben,
                  prev: prev.ausgaben,
                  lowerIsBetter: true,
                }
              : undefined
          }
          formatDelta={formatEuro}
        />
        <StatCard
          label="Saldo"
          value={formatEuro(cur.saldo, { sign: true })}
          valueColor={cur.saldo >= 0 ? "text-positive" : "text-danger"}
          comparisonLabel={comparisonLabel}
          delta={
            prev ? { current: cur.saldo, prev: prev.saldo } : undefined
          }
          formatDelta={(v) => formatEuro(v, { sign: true })}
        />
        <StatCard
          label="Sparquote"
          value={`${cur.sparquote.toFixed(1)} %`}
          valueColor={cur.sparquote >= 0 ? "text-fg" : "text-danger"}
          comparisonLabel={comparisonLabel}
          delta={
            prev
              ? { current: cur.sparquote, prev: prev.sparquote }
              : undefined
          }
          formatDelta={(v) => `${v.toFixed(1)} %`}
        />
      </div>
      {cur.umbuchungenCount > 0 && (
        <p className="text-xs text-fg-subtle">
          <span className="font-medium text-fg-muted">
            {cur.umbuchungenCount}
          </span>{" "}
          Umbuchungen zwischen eigenen Konten —{" "}
          {includeUmbuchungen
            ? "in Summen einbezogen"
            : "aus Summen ausgeschlossen"}{" "}
          (
          <span className="font-mono tabular-nums">
            {formatEuro(cur.umbuchungenVolume)}
          </span>{" "}
          Volumen)
        </p>
      )}
    </div>
  );
}
