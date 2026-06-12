"use client";

import { useMemo, useState } from "react";
import { Search, X, ArrowLeftRight } from "lucide-react";
import { Kontogruppe, Transaction, formatKontogruppe } from "../../lib/types";
import { useTheme } from "../ThemeProvider";
import { categoryPalette } from "../../lib/chart-theme";
import {
  eurSigned,
  formatDayHeading,
  initials,
  paletteIndex,
} from "../../lib/mobile-format";

export interface TxPresetFilter {
  kategorie?: string;
  direction?: "einnahmen" | "ausgaben";
}

type Direction = "alle" | "einnahmen" | "ausgaben";

interface MobileTransactionListProps {
  transactions: Transaction[];
  kontogruppen: Kontogruppe[];
  preset: TxPresetFilter | null;
  onClearPreset: () => void;
  onOpenTx: (t: Transaction) => void;
}

const PAGE_SIZE = 50;

export default function MobileTransactionList({
  transactions,
  kontogruppen,
  preset,
  onClearPreset,
  onOpenTx,
}: MobileTransactionListProps) {
  const { resolved } = useTheme();
  const palette = categoryPalette(resolved);
  const [search, setSearch] = useState("");
  const [direction, setDirection] = useState<Direction>("alle");
  const [limit, setLimit] = useState(PAGE_SIZE);

  const kgById = useMemo(() => {
    const map = new Map<number, Kontogruppe>();
    for (const kg of kontogruppen) map.set(kg.id, kg);
    return map;
  }, [kontogruppen]);

  const effectiveDirection: Direction = preset?.direction ?? direction;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions
      .filter((t) => {
        if (preset?.kategorie && t.kategorie !== preset.kategorie) return false;
        if (effectiveDirection === "einnahmen" && t.betrag <= 0) return false;
        if (effectiveDirection === "ausgaben" && t.betrag >= 0) return false;
        if (q) {
          const hay = (
            t.nameZahlungsbeteiligter +
            " " +
            t.verwendungszweck +
            " " +
            t.kategorie +
            " " +
            t.buchungstext
          ).toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => b.buchungstag.localeCompare(a.buchungstag));
  }, [transactions, preset, effectiveDirection, search]);

  const visible = filtered.slice(0, limit);

  // Gruppierung nach Buchungstag — die Liste ist bereits absteigend sortiert.
  const groups = useMemo(() => {
    const result: { tag: string; items: Transaction[] }[] = [];
    for (const t of visible) {
      const last = result[result.length - 1];
      if (last && last.tag === t.buchungstag) last.items.push(t);
      else result.push({ tag: t.buchungstag, items: [t] });
    }
    return result;
  }, [visible]);

  return (
    <div className="space-y-3">
      {/* Suche */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
        <input
          type="search"
          inputMode="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setLimit(PAGE_SIZE);
          }}
          placeholder="Empfänger, Zweck, Kategorie…"
          aria-label="Buchungen durchsuchen"
          className="min-h-11 w-full rounded-2xl border border-border bg-surface pl-10 pr-4 text-base text-fg placeholder:text-fg-subtle focus:border-border-strong focus:outline-none"
        />
      </div>

      {/* Filter-Chips */}
      <div className="scrollbar-none -mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1">
        {preset?.kategorie && (
          <button
            type="button"
            onClick={onClearPreset}
            aria-label={`Kategorie-Filter ${preset.kategorie} entfernen`}
            className="flex min-h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-fg px-4 text-sm font-medium text-fg-inverse"
          >
            {preset.kategorie}
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        {(["alle", "einnahmen", "ausgaben"] as const).map((d) => {
          const active = effectiveDirection === d;
          return (
            <button
              key={d}
              type="button"
              onClick={() => {
                if (preset?.direction) onClearPreset();
                setDirection(d);
                setLimit(PAGE_SIZE);
              }}
              className={`min-h-10 shrink-0 cursor-pointer rounded-full border px-4 text-sm font-medium transition-colors ${
                active
                  ? "border-fg bg-fg text-fg-inverse"
                  : "border-border bg-surface text-fg-muted active:bg-surface-hover"
              }`}
            >
              {d === "alle" ? "Alle" : d === "einnahmen" ? "Einnahmen" : "Ausgaben"}
            </button>
          );
        })}
        <span className="shrink-0 text-xs tabular-nums text-fg-subtle">
          {filtered.length} Buchungen
        </span>
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-border bg-surface p-8 text-center text-sm text-fg-muted">
          Keine Buchungen für diese Filter gefunden.
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <section key={g.tag}>
              <h2 className="px-1 pb-1 text-[11px] font-medium uppercase tracking-[0.14em] text-fg-faint">
                {formatDayHeading(g.tag)}
              </h2>
              <ul className="divide-y divide-border rounded-2xl border border-border bg-surface px-3">
                {g.items.map((t) => {
                  const kg =
                    t.kontogruppeId != null
                      ? kgById.get(t.kontogruppeId)
                      : undefined;
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => onOpenTx(t)}
                        className="flex min-h-14 w-full cursor-pointer items-center gap-3 py-2.5 text-left active:bg-surface-hover"
                      >
                        <span
                          aria-hidden
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-fg-inverse"
                          style={{
                            background:
                              palette[
                                paletteIndex(
                                  t.nameZahlungsbeteiligter ||
                                    t.verwendungszweck,
                                  palette.length
                                )
                              ],
                          }}
                        >
                          {initials(
                            t.nameZahlungsbeteiligter || t.verwendungszweck
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5 text-sm text-fg">
                            <span className="truncate">
                              {t.nameZahlungsbeteiligter ||
                                t.verwendungszweck ||
                                "—"}
                            </span>
                            {t.isUmbuchung && (
                              <ArrowLeftRight
                                aria-label="Umbuchung"
                                className="h-3 w-3 shrink-0 text-fg-subtle"
                              />
                            )}
                          </span>
                          <span className="block truncate text-xs text-fg-subtle">
                            {t.kategorie}
                            {kg ? ` · ${formatKontogruppe(kg)}` : ""}
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
                  );
                })}
              </ul>
            </section>
          ))}

          {filtered.length > limit && (
            <button
              type="button"
              onClick={() => setLimit((l) => l + 100)}
              className="min-h-11 w-full cursor-pointer rounded-2xl border border-border bg-surface text-sm font-medium text-fg-muted active:bg-surface-hover"
            >
              Mehr anzeigen ({filtered.length - limit} weitere)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
