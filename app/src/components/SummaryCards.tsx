"use client";

import { ArrowDownLeft, ArrowUpRight, TrendingUp, Wallet } from "lucide-react";
import { Transaction } from "../lib/types";

interface SummaryCardsProps {
  transactions: Transaction[];
}

function formatEuro(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export default function SummaryCards({ transactions }: SummaryCardsProps) {
  const operative = transactions.filter((t) => !t.isUmbuchung);
  const umbuchungen = transactions.filter((t) => t.isUmbuchung);

  const einnahmen = operative
    .filter((t) => t.betrag > 0)
    .reduce((sum, t) => sum + t.betrag, 0);

  const ausgaben = operative
    .filter((t) => t.betrag < 0)
    .reduce((sum, t) => sum + Math.abs(t.betrag), 0);

  const saldo = einnahmen - ausgaben;
  const sparquote = einnahmen > 0 ? ((saldo / einnahmen) * 100) : 0;

  const cards = [
    {
      label: "Einnahmen",
      value: formatEuro(einnahmen),
      icon: ArrowDownLeft,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Ausgaben",
      value: formatEuro(ausgaben),
      icon: ArrowUpRight,
      color: "text-red-400",
      bg: "bg-red-500/10",
    },
    {
      label: "Saldo",
      value: formatEuro(saldo),
      icon: Wallet,
      color: saldo >= 0 ? "text-emerald-400" : "text-red-400",
      bg: saldo >= 0 ? "bg-emerald-500/10" : "bg-red-500/10",
    },
    {
      label: "Sparquote",
      value: `${sparquote.toFixed(1)} %`,
      icon: TrendingUp,
      color: sparquote >= 0 ? "text-blue-400" : "text-red-400",
      bg: "bg-blue-500/10",
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
          <p className={`mt-3 text-xl font-semibold ${card.color}`}>{card.value}</p>
        </div>
      ))}
    </div>
    {umbuchungen.length > 0 && (
      <p className="text-xs text-slate-500">
        {umbuchungen.length} Umbuchungen zwischen eigenen Konten erkannt und aus Summen ausgeschlossen
        ({formatEuro(umbuchungen.reduce((s, t) => s + Math.abs(t.betrag), 0))} Volumen)
      </p>
    )}
    </div>
  );
}
