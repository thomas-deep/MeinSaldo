"use client";

import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  ArrowLeftRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { format, parse } from "date-fns";
import { de } from "date-fns/locale";
import { Kontogruppe, Transaction } from "../lib/types";

interface CategoryDrillDownProps {
  transactions: Transaction[];
  kategorie: string;
  type: "einnahmen" | "ausgaben";
  kontogruppen: Kontogruppe[];
  onBack: () => void;
}

interface CounterpartyGroup {
  key: string;
  name: string;
  iban: string;
  count: number;
  sum: number;
  avg: number;
  first: string;
  last: string;
  transactions: Transaction[];
}

function formatEuro(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const [y, m, d] = dateStr.split("-");
    return `${d}.${m}.${y}`;
  } catch {
    return dateStr;
  }
}

type SortKey = "sum" | "count" | "name" | "last";

export default function CategoryDrillDown({
  transactions,
  kategorie,
  type,
  kontogruppen,
  onBack,
}: CategoryDrillDownProps) {
  const [sortKey, setSortKey] = useState<SortKey>("sum");
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const kontogruppenById = useMemo(
    () => Object.fromEntries(kontogruppen.map((k) => [k.id, k])),
    [kontogruppen]
  );

  const categoryTx = useMemo(() => {
    return transactions.filter((t) => {
      if (t.isUmbuchung) return false;
      if (t.kategorie !== kategorie) return false;
      return type === "einnahmen" ? t.betrag > 0 : t.betrag < 0;
    });
  }, [transactions, kategorie, type]);

  const stats = useMemo(() => {
    const sum = categoryTx.reduce((s, t) => s + Math.abs(t.betrag), 0);
    const count = categoryTx.length;
    const avg = count > 0 ? sum / count : 0;
    return { sum, count, avg };
  }, [categoryTx]);

  const counterparties: CounterpartyGroup[] = useMemo(() => {
    const groups: Record<string, CounterpartyGroup> = {};
    for (const t of categoryTx) {
      const name = t.nameZahlungsbeteiligter || "(unbekannt)";
      const iban = t.ibanZahlungsbeteiligter || "";
      const key = `${name}|${iban}`;
      if (!groups[key]) {
        groups[key] = {
          key,
          name,
          iban,
          count: 0,
          sum: 0,
          avg: 0,
          first: t.buchungstag,
          last: t.buchungstag,
          transactions: [],
        };
      }
      const g = groups[key];
      g.count += 1;
      g.sum += Math.abs(t.betrag);
      g.transactions.push(t);
      if (t.buchungstag < g.first) g.first = t.buchungstag;
      if (t.buchungstag > g.last) g.last = t.buchungstag;
    }
    const list = Object.values(groups).map((g) => ({
      ...g,
      avg: g.count > 0 ? g.sum / g.count : 0,
      transactions: g.transactions.sort((a, b) =>
        b.buchungstag.localeCompare(a.buchungstag)
      ),
    }));
    list.sort((a, b) => {
      if (sortKey === "sum") return b.sum - a.sum;
      if (sortKey === "count") return b.count - a.count;
      if (sortKey === "last") return b.last.localeCompare(a.last);
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [categoryTx, sortKey]);

  const monthly = useMemo(() => {
    const grouped: Record<string, number> = {};
    for (const t of categoryTx) {
      const key = t.buchungstag.substring(0, 7);
      grouped[key] = (grouped[key] ?? 0) + Math.abs(t.betrag);
    }
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => {
        let label: string;
        try {
          label = format(parse(key, "yyyy-MM", new Date()), "MMM yy", { locale: de });
        } catch {
          label = key;
        }
        return { monat: label, betrag: Math.round(val * 100) / 100 };
      });
  }, [categoryTx]);

  const accentColor = type === "einnahmen" ? "text-positive" : "text-danger";
  const barColor = type === "einnahmen" ? "#10B981" : "#EF4444";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-fg-soft hover:border-border-strong hover:text-white cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" />
          Zurück zum Dashboard
        </button>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-fg-subtle">Dashboard</span>
          <ChevronRight className="h-3 w-3 text-fg-faint" />
          <span className="text-fg-muted">
            {type === "einnahmen" ? "Einnahmen" : "Ausgaben"}
          </span>
          <ChevronRight className="h-3 w-3 text-fg-faint" />
          <span className={`font-medium ${accentColor}`}>{kategorie}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="text-xs font-medium text-fg-muted">Summe</p>
          <p className={`mt-2 text-xl font-semibold ${accentColor}`}>
            {formatEuro(stats.sum)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="text-xs font-medium text-fg-muted">Buchungen</p>
          <p className="mt-2 text-xl font-semibold text-fg">{stats.count}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="text-xs font-medium text-fg-muted">Ø pro Buchung</p>
          <p className="mt-2 text-xl font-semibold text-fg">
            {formatEuro(stats.avg)}
          </p>
        </div>
      </div>

      {monthly.length > 1 && (
        <div className="rounded-xl border border-border bg-surface p-5">
          <h3 className="mb-4 text-sm font-semibold text-fg-soft">
            Monatsverlauf
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthly} margin={{ left: 8, right: 8 }}>
              <XAxis
                dataKey="monat"
                tick={{ fill: "#94A3B8", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) =>
                  new Intl.NumberFormat("de-DE", {
                    style: "currency",
                    currency: "EUR",
                    maximumFractionDigits: 0,
                  }).format(v)
                }
                tick={{ fill: "#94A3B8", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(v) => [formatEuro(Number(v)), "Betrag"]}
                contentStyle={{
                  backgroundColor: "#1E293B",
                  border: "1px solid #334155",
                  borderRadius: "0.5rem",
                  color: "#E2E8F0",
                  fontSize: "0.8rem",
                }}
              />
              <ReferenceLine y={0} stroke="#475569" />
              <Bar dataKey="betrag" fill={barColor} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="rounded-xl border border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
          <h3 className="text-sm font-semibold text-fg-soft">
            {type === "einnahmen" ? "Absender" : "Empfänger"} ({counterparties.length})
          </h3>
          <div className="flex gap-1 rounded-lg bg-bg-muted p-0.5 text-xs">
            {(["sum", "count", "last", "name"] as SortKey[]).map((k) => (
              <button
                key={k}
                onClick={() => setSortKey(k)}
                className={`rounded px-2.5 py-1 cursor-pointer ${
                  sortKey === k
                    ? "bg-fg text-fg-inverse"
                    : "text-fg-muted hover:text-fg"
                }`}
              >
                {k === "sum"
                  ? "Summe"
                  : k === "count"
                    ? "Anzahl"
                    : k === "last"
                      ? "Zuletzt"
                      : "Name"}
              </button>
            ))}
          </div>
        </div>

        {counterparties.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-fg-subtle">
            Keine Buchungen in dieser Kategorie
          </p>
        ) : (
          <div className="divide-y divide-border">
            {counterparties.map((cp) => {
              const isExpanded = expandedKey === cp.key;
              const share = stats.sum > 0 ? (cp.sum / stats.sum) * 100 : 0;
              return (
                <div key={cp.key}>
                  <button
                    onClick={() => setExpandedKey(isExpanded ? null : cp.key)}
                    className="flex w-full items-center justify-between px-5 py-3 text-left transition-colors hover:bg-surface-hover cursor-pointer"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 flex-shrink-0 text-fg-subtle" />
                      ) : (
                        <ChevronRight className="h-4 w-4 flex-shrink-0 text-fg-subtle" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-fg">
                          {cp.name}
                        </p>
                        <p className="truncate text-xs text-fg-subtle font-mono">
                          {cp.iban || "—"} · {cp.count}x · zuletzt {formatDate(cp.last)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-4 pl-4">
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${accentColor}`}>
                          {formatEuro(cp.sum)}
                        </p>
                        <p className="text-xs text-fg-subtle">{share.toFixed(1)}%</p>
                      </div>
                      <div className="hidden h-8 w-24 overflow-hidden rounded bg-surface-hover sm:block">
                        <div
                          className="h-full"
                          style={{
                            width: `${share}%`,
                            backgroundColor: barColor + "55",
                          }}
                        />
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="bg-bg-muted px-5 py-3">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-left text-fg-subtle">
                            <th className="py-1.5 font-medium">Datum</th>
                            <th className="py-1.5 font-medium">Verwendungszweck</th>
                            <th className="py-1.5 font-medium">Gruppe</th>
                            <th className="py-1.5 text-right font-medium">Betrag</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {cp.transactions.map((tx) => {
                            const kg = tx.kontogruppeId
                              ? kontogruppenById[tx.kontogruppeId]
                              : null;
                            return (
                              <tr key={tx.id}>
                                <td className="whitespace-nowrap py-1.5 text-fg-muted">
                                  {formatDate(tx.buchungstag)}
                                </td>
                                <td className="py-1.5 text-fg-soft">
                                  <div className="flex items-center gap-2">
                                    {tx.isUmbuchung && (
                                      <span className="inline-flex items-center gap-1 rounded bg-warn-soft px-1.5 py-0.5 text-[10px] text-warn">
                                        <ArrowLeftRight className="h-3 w-3" />
                                        Umbuchung
                                      </span>
                                    )}
                                    <span className="truncate">{tx.verwendungszweck}</span>
                                  </div>
                                </td>
                                <td className="py-1.5">
                                  {kg ? (
                                    <span
                                      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5"
                                      style={{
                                        backgroundColor: kg.color + "22",
                                        color: kg.color,
                                      }}
                                    >
                                      <span
                                        className="inline-block h-1.5 w-1.5 rounded-full"
                                        style={{ backgroundColor: kg.color }}
                                      />
                                      {kg.name}
                                    </span>
                                  ) : (
                                    <span className="text-fg-faint">–</span>
                                  )}
                                </td>
                                <td
                                  className={`whitespace-nowrap py-1.5 text-right font-medium ${
                                    tx.betrag >= 0
                                      ? "text-positive"
                                      : "text-danger"
                                  }`}
                                >
                                  {formatEuro(tx.betrag)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
