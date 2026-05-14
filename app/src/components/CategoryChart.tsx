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

const COLORS = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
  "#EC4899", "#06B6D4", "#F97316", "#14B8A6", "#6366F1",
  "#84CC16", "#E11D48", "#0EA5E9", "#A855F7", "#22D3EE",
  "#FB923C", "#4ADE80",
];

function formatEuro(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function CategoryChart({ transactions, type, onCategoryClick }: CategoryChartProps) {
  const [chartType, setChartType] = useState<"bar" | "pie">("bar");

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
  const accentColor = type === "einnahmen" ? "text-emerald-400" : "text-red-400";

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className={`text-sm font-semibold ${accentColor}`}>
          {title} nach Kategorie
        </h3>
        <div className="flex gap-1 rounded-lg bg-slate-700/50 p-0.5">
          <button
            onClick={() => setChartType("bar")}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
              chartType === "bar"
                ? "bg-slate-600 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Balken
          </button>
          <button
            onClick={() => setChartType("pie")}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
              chartType === "pie"
                ? "bg-slate-600 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Kreis
          </button>
        </div>
      </div>

      {data.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-500">Keine Daten vorhanden</p>
      ) : chartType === "bar" ? (
        <ResponsiveContainer width="100%" height={Math.max(data.length * 36, 200)}>
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
            <XAxis
              type="number"
              tickFormatter={(v) => formatEuro(v)}
              tick={{ fill: "#94A3B8", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="kategorie"
              width={150}
              tick={{ fill: "#CBD5E1", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value) => [formatEuro(Number(value)), "Betrag"]}
              contentStyle={{
                backgroundColor: "#1E293B",
                border: "1px solid #334155",
                borderRadius: "0.5rem",
                color: "#E2E8F0",
                fontSize: "0.8rem",
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
              labelLine={{ stroke: "#475569" }}
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
                backgroundColor: "#1E293B",
                border: "1px solid #334155",
                borderRadius: "0.5rem",
                color: "#E2E8F0",
                fontSize: "0.8rem",
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
            className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-xs hover:bg-slate-700/30 ${onCategoryClick ? "cursor-pointer" : ""}`}
          >
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              <span className="text-slate-300">{item.kategorie}</span>
              <span className="text-slate-500">({item.anzahl}x)</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-slate-400">{item.prozent}%</span>
              <span className="font-medium text-slate-200">{formatEuro(item.betrag)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
