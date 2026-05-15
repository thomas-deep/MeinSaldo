"use client";

import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { Transaction, CategorySummary } from "../lib/types";
import { categoryPalette, useChartTheme } from "../lib/chart-theme";
import { useTheme } from "./ThemeProvider";

function extractKategorie(payload: unknown): string | null {
  if (
    payload &&
    typeof payload === "object" &&
    "kategorie" in payload &&
    typeof (payload as { kategorie: unknown }).kategorie === "string"
  ) {
    return (payload as { kategorie: string }).kategorie;
  }
  return null;
}

function extractKategoriePercent(
  payload: unknown
): { kategorie: string; prozent: number } | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as { kategorie?: unknown; prozent?: unknown };
  if (typeof p.kategorie === "string" && typeof p.prozent === "number") {
    return { kategorie: p.kategorie, prozent: p.prozent };
  }
  return null;
}

interface CategoryChartProps {
  transactions: Transaction[];
  type: "einnahmen" | "ausgaben";
  onCategoryClick?: (kategorie: string) => void;
  includeUmbuchungen?: boolean;
  comparison?: Transaction[];
  comparisonLabel?: string;
}

interface CategorySummaryWithPrev extends CategorySummary {
  prevBetrag?: number;
}

function aggregateByKategorie(
  transactions: Transaction[],
  type: "einnahmen" | "ausgaben",
  includeUmbuchungen: boolean
): Map<string, number> {
  const operative = includeUmbuchungen
    ? transactions
    : transactions.filter((t) => !t.isUmbuchung);
  const filtered =
    type === "einnahmen"
      ? operative.filter((t) => t.betrag > 0)
      : operative.filter((t) => t.betrag < 0);
  const m = new Map<string, number>();
  for (const t of filtered) {
    m.set(t.kategorie, (m.get(t.kategorie) ?? 0) + Math.abs(t.betrag));
  }
  return m;
}

// Palette wird theme-aware unten via categoryPalette() berechnet.

function CategoryDelta({
  current,
  prev,
  lowerIsBetter,
  title,
}: {
  current: number;
  prev: number;
  lowerIsBetter: boolean;
  title: string;
}) {
  if (prev === 0 && current === 0) return null;
  const diff = current - prev;
  const pct = prev === 0 ? null : (diff / Math.abs(prev)) * 100;
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
    <span
      title={title}
      className={`inline-flex items-center gap-0.5 font-mono tabular-nums text-[10px] ${color}`}
    >
      <Icon className="h-3 w-3" />
      {pct !== null ? `${diff > 0 ? "+" : ""}${pct.toFixed(0)}%` : "neu"}
    </span>
  );
}

function formatEuro(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function CategoryChart({
  transactions,
  type,
  onCategoryClick,
  includeUmbuchungen = false,
  comparison,
  comparisonLabel = "vs. Vorjahr",
}: CategoryChartProps) {
  const [chartType, setChartType] = useState<"bar" | "pie">("bar");
  const chartTheme = useChartTheme();
  const { resolved } = useTheme();
  const COLORS = categoryPalette(resolved);

  const data: CategorySummaryWithPrev[] = useMemo(() => {
    const operative = includeUmbuchungen
      ? transactions
      : transactions.filter((t) => !t.isUmbuchung);
    const filtered =
      type === "einnahmen"
        ? operative.filter((t) => t.betrag > 0)
        : operative.filter((t) => t.betrag < 0);

    const total = filtered.reduce((s, t) => s + Math.abs(t.betrag), 0);
    const prevMap = comparison
      ? aggregateByKategorie(comparison, type, includeUmbuchungen)
      : null;

    const grouped = filtered.reduce<Record<string, { betrag: number; anzahl: number }>>(
      (acc, t) => {
        if (!acc[t.kategorie]) acc[t.kategorie] = { betrag: 0, anzahl: 0 };
        acc[t.kategorie].betrag += Math.abs(t.betrag);
        acc[t.kategorie].anzahl += 1;
        return acc;
      },
      {}
    );

    const all = Object.entries(grouped)
      .map(([kategorie, { betrag, anzahl }]) => ({
        kategorie,
        betrag: Math.round(betrag * 100) / 100,
        anzahl,
        prozent: total > 0 ? Math.round((betrag / total) * 1000) / 10 : 0,
        prevBetrag: prevMap ? prevMap.get(kategorie) ?? 0 : undefined,
      }))
      .sort((a, b) => b.betrag - a.betrag);

    // Kategorien unter 1 % zu 'Übrige Kleinposten' zusammenfassen
    const main = all.filter((c) => c.prozent >= 1);
    const small = all.filter((c) => c.prozent < 1);
    if (small.length <= 1) return all;
    const sumBetrag = small.reduce((s, c) => s + c.betrag, 0);
    const sumAnzahl = small.reduce((s, c) => s + c.anzahl, 0);
    const sumPrev = prevMap
      ? small.reduce((s, c) => s + (prevMap.get(c.kategorie) ?? 0), 0)
      : undefined;
    return [
      ...main,
      {
        kategorie: `Übrige Kleinposten (${small.length})`,
        betrag: Math.round(sumBetrag * 100) / 100,
        anzahl: sumAnzahl,
        prozent: total > 0 ? Math.round((sumBetrag / total) * 1000) / 10 : 0,
        prevBetrag: sumPrev,
      },
    ];
  }, [transactions, type, includeUmbuchungen, comparison]);

  const title = type === "einnahmen" ? "Einnahmen" : "Ausgaben";

  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-fg-faint">
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${type === "einnahmen" ? "bg-positive" : "bg-danger"}`} />
          {title} <span className="text-fg-faint">·</span> nach Kategorie
        </h3>
        <div className="flex gap-0.5 rounded-full border border-border bg-bg-muted p-0.5">
          <button
            onClick={() => setChartType("bar")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
              chartType === "bar"
                ? "bg-fg text-fg-inverse"
                : "text-fg-muted hover:text-fg"
            }`}
          >
            Balken
          </button>
          <button
            onClick={() => setChartType("pie")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
              chartType === "pie"
                ? "bg-fg text-fg-inverse"
                : "text-fg-muted hover:text-fg"
            }`}
          >
            Kreis
          </button>
        </div>
      </div>

      {data.length === 0 ? (
        <p className="py-12 text-center text-sm text-fg-subtle">Keine Daten vorhanden</p>
      ) : chartType === "bar" ? (
        <ResponsiveContainer width="100%" height={Math.max(data.length * 36, 200)}>
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
            <XAxis
              type="number"
              tickFormatter={(v) => formatEuro(v)}
              tick={{ fill: chartTheme.fgMuted, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="kategorie"
              width={150}
              tick={{ fill: chartTheme.fg, fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value) => [formatEuro(Number(value)), "Betrag"]}
              cursor={{ fill: chartTheme.border, opacity: 0.4 }}
              contentStyle={{
                backgroundColor: chartTheme.surface,
                border: `1px solid ${chartTheme.border}`,
                borderRadius: "0.75rem",
                color: chartTheme.fg,
                fontSize: "0.8rem",
                boxShadow: "0 14px 32px -12px rgb(0 0 0 / 0.25)",
              }}
            />
            <Bar
              dataKey="betrag"
              radius={[0, 6, 6, 0]}
              barSize={24}
              cursor={onCategoryClick ? "pointer" : undefined}
              onClick={(d) => {
                const k = extractKategorie(d);
                if (k) onCategoryClick?.(k);
              }}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              dataKey="betrag"
              nameKey="kategorie"
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={120}
              paddingAngle={1}
              stroke={chartTheme.bg}
              strokeWidth={resolved === "dark" ? 1 : 2}
              cursor={onCategoryClick ? "pointer" : undefined}
              onClick={(d) => {
                const k = extractKategorie(d);
                if (k) onCategoryClick?.(k);
              }}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, _name, item) => {
                const p = extractKategoriePercent(item?.payload);
                const betrag = formatEuro(Number(value));
                return p
                  ? [`${betrag} · ${p.prozent}%`, p.kategorie]
                  : [betrag, "Betrag"];
              }}
              contentStyle={{
                backgroundColor: chartTheme.surface,
                border: `1px solid ${chartTheme.border}`,
                borderRadius: "0.75rem",
                color: chartTheme.fg,
                fontSize: "0.8rem",
                boxShadow: "0 14px 32px -12px rgb(0 0 0 / 0.25)",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      )}

      <div className="mt-4 max-h-48 space-y-1 overflow-y-auto">
        {data.map((item, i) => (
          <div
            key={item.kategorie}
            onClick={() => onCategoryClick?.(item.kategorie)}
            className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-xs hover:bg-surface-hover ${onCategoryClick ? "cursor-pointer" : ""}`}
          >
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              <span className="text-fg-soft">{item.kategorie}</span>
              <span className="text-fg-subtle">({item.anzahl}x)</span>
            </div>
            <div className="flex items-center gap-3">
              {item.prevBetrag !== undefined && (
                <CategoryDelta
                  current={item.betrag}
                  prev={item.prevBetrag}
                  lowerIsBetter={type === "ausgaben"}
                  title={`${formatEuro(item.prevBetrag)} ${comparisonLabel}`}
                />
              )}
              <span className="text-fg-muted">{item.prozent}%</span>
              <span className="font-medium text-fg">{formatEuro(item.betrag)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
