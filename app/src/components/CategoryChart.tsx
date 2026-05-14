"use client";

import { useMemo, useState } from "react";
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
}

// Palette wird theme-aware unten via categoryPalette() berechnet.

function formatEuro(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function CategoryChart({ transactions, type, onCategoryClick }: CategoryChartProps) {
  const [chartType, setChartType] = useState<"bar" | "pie">("bar");
  const chartTheme = useChartTheme();
  const { resolved } = useTheme();
  const COLORS = categoryPalette(resolved);

  const data: CategorySummary[] = useMemo(() => {
    const operative = transactions.filter((t) => !t.isUmbuchung);
    const filtered =
      type === "einnahmen"
        ? operative.filter((t) => t.betrag > 0)
        : operative.filter((t) => t.betrag < 0);

    const total = filtered.reduce((s, t) => s + Math.abs(t.betrag), 0);

    const grouped = filtered.reduce<Record<string, { betrag: number; anzahl: number }>>(
      (acc, t) => {
        if (!acc[t.kategorie]) acc[t.kategorie] = { betrag: 0, anzahl: 0 };
        acc[t.kategorie].betrag += Math.abs(t.betrag);
        acc[t.kategorie].anzahl += 1;
        return acc;
      },
      {}
    );

    return Object.entries(grouped)
      .map(([kategorie, { betrag, anzahl }]) => ({
        kategorie,
        betrag: Math.round(betrag * 100) / 100,
        anzahl,
        prozent: total > 0 ? Math.round((betrag / total) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.betrag - a.betrag);
  }, [transactions, type]);

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
              innerRadius={60}
              outerRadius={110}
              paddingAngle={2}
              label={(props) => {
                const p = extractKategoriePercent(props);
                return p ? `${p.kategorie} (${p.prozent}%)` : "";
              }}
              labelLine={{ stroke: chartTheme.border }}
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
              formatter={(value) => [formatEuro(Number(value)), "Betrag"]}
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
              <span className="text-fg-muted">{item.prozent}%</span>
              <span className="font-medium text-fg">{formatEuro(item.betrag)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
