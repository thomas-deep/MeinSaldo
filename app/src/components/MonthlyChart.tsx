"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import { Transaction, MonthlyData } from "../lib/types";
import { format, parse } from "date-fns";
import { de } from "date-fns/locale";

interface MonthlyChartProps {
  transactions: Transaction[];
}

function formatEuro(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function MonthlyChart({ transactions }: MonthlyChartProps) {
  const data: MonthlyData[] = useMemo(() => {
    const grouped: Record<string, { einnahmen: number; ausgaben: number }> = {};

    for (const tx of transactions) {
      if (!tx.buchungstag || tx.isUmbuchung) continue;
      const monthKey = tx.buchungstag.substring(0, 7);
      if (!grouped[monthKey]) grouped[monthKey] = { einnahmen: 0, ausgaben: 0 };
      if (tx.betrag > 0) grouped[monthKey].einnahmen += tx.betrag;
      else grouped[monthKey].ausgaben += Math.abs(tx.betrag);
    }

    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, { einnahmen, ausgaben }]) => {
        let monatLabel: string;
        try {
          const date = parse(key, "yyyy-MM", new Date());
          monatLabel = format(date, "MMM yy", { locale: de });
        } catch {
          monatLabel = key;
        }
        return {
          monat: monatLabel,
          einnahmen: Math.round(einnahmen * 100) / 100,
          ausgaben: Math.round(ausgaben * 100) / 100,
          saldo: Math.round((einnahmen - ausgaben) * 100) / 100,
        };
      });
  }, [transactions]);

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-5">
        <p className="py-12 text-center text-sm text-slate-500">Keine monatlichen Daten</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-5">
      <h3 className="mb-4 text-sm font-semibold text-blue-400">
        Monatliche Übersicht
      </h3>

      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data} margin={{ left: 8, right: 8 }}>
          <XAxis
            dataKey="monat"
            tick={{ fill: "#94A3B8", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => formatEuro(v)}
            tick={{ fill: "#94A3B8", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value, name) => [
              formatEuro(Number(value)),
              name === "einnahmen"
                ? "Einnahmen"
                : name === "ausgaben"
                  ? "Ausgaben"
                  : "Saldo",
            ]}
            contentStyle={{
              backgroundColor: "#1E293B",
              border: "1px solid #334155",
              borderRadius: "0.5rem",
              color: "#E2E8F0",
              fontSize: "0.8rem",
            }}
          />
          <Legend
            formatter={(value) =>
              value === "einnahmen"
                ? "Einnahmen"
                : value === "ausgaben"
                  ? "Ausgaben"
                  : "Saldo"
            }
            wrapperStyle={{ fontSize: "0.75rem", color: "#94A3B8" }}
          />
          <ReferenceLine y={0} stroke="#475569" />
          <Bar dataKey="einnahmen" fill="#10B981" radius={[4, 4, 0, 0]} />
          <Bar dataKey="ausgaben" fill="#EF4444" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
