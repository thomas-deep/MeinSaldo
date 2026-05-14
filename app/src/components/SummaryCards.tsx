"use client";

import { ArrowDownLeft, ArrowUpRight, TrendingUp, Wallet } from "lucide-react";
import { Transaction } from "../lib/types";

interface SummaryCardsProps {
  transactions: Transaction[];
  comparison?: Transaction[];
  comparisonLabel?: string;
}

function formatEuro(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
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

function aggregate(transactions: Transaction[]): Aggregate {
  const operative = transactions.filter((t) => !t.isUmbuchung);
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

interface DeltaBadgeProps {
  label: string;
  current: number;
  prev: number;
  /** Bei Ausgaben ist "weniger" gut → invertierte Färbung */
  lowerIsBetter?: boolean;
  format: (v: number) => string;
}

function DeltaBadge({ label, current, prev, lowerIsBetter, format }: DeltaBadgeProps) {
  const diff = current - prev;
  const pct = deltaPct(current, prev);
  const isImprovement = lowerIsBetter ? diff < 0 : diff > 0;
  const isWorse = lowerIsBetter ? diff > 0 : diff < 0;
  const color =
    diff === 0
      ? "text-slate-500"
      : isImprovement
        ? "text-emerald-400"
        : isWorse
          ? "text-red-400"
          : "text-slate-400";
  return (
    <p className={`mt-2 text-[11px] ${color}`}>
      {label}: {format(prev)}
      {pct !== null && (
        <span className="ml-1.5">
          ({diff > 0 ? "+" : ""}
          {pct.toFixed(1)} %)
        </span>
      )}
    </p>
  );
}

export default function SummaryCards({
  transactions,
  comparison,
  comparisonLabel = "Vorjahr",
}: SummaryCardsProps) {
  const cur = aggregate(transactions);
  const prev = comparison ? aggregate(comparison) : null;

  const cards = [
    {
      label: "Einnahmen",
      value: formatEuro(cur.einnahmen),
      icon: ArrowDownLeft,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      delta: prev
        ? { current: cur.einnahmen, prev: prev.einnahmen, lowerIsBetter: false }
        : null,
    },
    {
      label: "Ausgaben",
      value: formatEuro(cur.ausgaben),
      icon: ArrowUpRight,
      color: "text-red-400",
      bg: "bg-red-500/10",
      delta: prev
        ? { current: cur.ausgaben, prev: prev.ausgaben, lowerIsBetter: true }
        : null,
    },
    {
      label: "Saldo",
      value: formatEuro(cur.saldo),
      icon: Wallet,
      color: cur.saldo >= 0 ? "text-emerald-400" : "text-red-400",
      bg: cur.saldo >= 0 ? "bg-emerald-500/10" : "bg-red-500/10",
      delta: prev
        ? { current: cur.saldo, prev: prev.saldo, lowerIsBetter: false }
        : null,
    },
    {
      label: "Sparquote",
      value: `${cur.sparquote.toFixed(1)} %`,
      icon: TrendingUp,
      color: cur.sparquote >= 0 ? "text-blue-400" : "text-red-400",
      bg: "bg-blue-500/10",
      delta: prev
        ? { current: cur.sparquote, prev: prev.sparquote, lowerIsBetter: false }
        : null,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-slate-700 bg-slate-800/50 p-5"
          >
            <div className="flex items-center gap-3">
              <div className={`rounded-lg p-2 ${card.bg}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <span className="text-xs font-medium text-slate-400">{card.label}</span>
            </div>
            <p className={`mt-3 text-xl font-semibold ${card.color}`}>
              {card.value}
            </p>
            {card.delta && (
              <DeltaBadge
                label={comparisonLabel}
                current={card.delta.current}
                prev={card.delta.prev}
                lowerIsBetter={card.delta.lowerIsBetter}
                format={
                  card.label === "Sparquote"
                    ? (v) => `${v.toFixed(1)} %`
                    : formatEuro
                }
              />
            )}
          </div>
        ))}
      </div>
      {cur.umbuchungenCount > 0 && (
        <p className="text-xs text-slate-500">
          {cur.umbuchungenCount} Umbuchungen zwischen eigenen Konten erkannt und
          aus Summen ausgeschlossen ({formatEuro(cur.umbuchungenVolume)} Volumen)
        </p>
      )}
    </div>
  );
}
