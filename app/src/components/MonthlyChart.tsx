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
import { useChartTheme } from "../lib/chart-theme";

interface MonthlyChartProps {
  transactions: Transaction[];
  onMonthClick?: (yearMonth: string) => void;
  includeUmbuchungen?: boolean;
}

function formatEuro(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

interface MonthlyEntry extends MonthlyData {
  monthKey: string;
}

function extractMonthKey(payload: unknown): string | null {
  if (
    payload &&
    typeof payload === "object" &&
    "monthKey" in payload &&
    typeof (payload as { monthKey: unknown }).monthKey === "string"
  ) {
    return (payload as { monthKey: string }).monthKey;
  }
  return null;
}

export default function MonthlyChart({
  transactions,
  onMonthClick,
  includeUmbuchungen = false,
}: MonthlyChartProps) {
  const ct = useChartTheme();

  const data: MonthlyEntry[] = useMemo(() => {
    const grouped: Record<string, { einnahmen: number; ausgaben: number }> = {};

    for (const tx of transactions) {
      if (!tx.buchungstag) continue;
      if (!includeUmbuchungen && tx.isUmbuchung) continue;
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
          monthKey: key,
          monat: monatLabel,
          einnahmen: Math.round(einnahmen * 100) / 100,
          ausgaben: Math.round(ausgaben * 100) / 100,
          saldo: Math.round((einnahmen - ausgaben) * 100) / 100,
        };
      });
  }, [transactions, includeUmbuchungen]);

  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6">
        <p className="py-12 text-center text-sm text-fg-subtle">
          Keine monatlichen Daten
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-xs font-medium uppercase tracking-[0.18em] text-fg-faint">
          Monatliche Übersicht
        </h3>
        <div className="flex items-center gap-4 text-[11px] text-fg-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-sm bg-positive" />
            Einnahmen
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-sm bg-danger" />
            Ausgaben
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <BarChart
          data={data}
          margin={{ left: 8, right: 8 }}
        >
          <XAxis
            dataKey="monat"
            tick={{ fill: ct.fgMuted, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            dy={6}
          />
          <YAxis
            tickFormatter={(v) => formatEuro(v)}
            tick={{ fill: ct.fgMuted, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={70}
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
            cursor={{ fill: ct.border, opacity: 0.35 }}
            contentStyle={{
              backgroundColor: ct.surface,
              border: `1px solid ${ct.border}`,
              borderRadius: "0.75rem",
              color: ct.fg,
              fontSize: "0.8rem",
              boxShadow: "0 14px 32px -12px rgb(0 0 0 / 0.25)",
            }}
          />
          <Legend wrapperStyle={{ display: "none" }} />
          <ReferenceLine y={0} stroke={ct.border} />
          <Bar
            dataKey="einnahmen"
            fill={ct.positive}
            radius={[3, 3, 0, 0]}
            maxBarSize={36}
            cursor={onMonthClick ? "pointer" : undefined}
            onClick={(d) => {
              const key = extractMonthKey(d);
              if (key) onMonthClick?.(key);
            }}
          />
          <Bar
            dataKey="ausgaben"
            fill={ct.danger}
            radius={[3, 3, 0, 0]}
            maxBarSize={36}
            cursor={onMonthClick ? "pointer" : undefined}
            onClick={(d) => {
              const key = extractMonthKey(d);
              if (key) onMonthClick?.(key);
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
