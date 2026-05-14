"use client";

import { useState } from "react";
import { Calendar, ChevronDown, Filter, Search, X } from "lucide-react";
import {
  DateRange,
  PRESET_LABELS,
  RangePreset,
  rangeFor,
} from "../lib/date-range";
import Toggle from "./Toggle";

export type DirectionFilter = "alle" | "einnahmen" | "ausgaben";

export interface AuswertungFilterState {
  preset: RangePreset;
  range: DateRange;
  direction: DirectionFilter;
  minBetrag: number;
  search: string;
  compareVorjahr: boolean;
}

interface Props {
  state: AuswertungFilterState;
  onChange: (next: AuswertungFilterState) => void;
}

const PRESETS: RangePreset[] = [
  "alle",
  "lfdMonat",
  "vormonat",
  "lfdQuartal",
  "vorquartal",
  "lfdJahr",
  "vorjahr",
  "letzte12Monate",
  "custom",
];

function formatRange(state: AuswertungFilterState): string {
  if (state.preset !== "custom") return PRESET_LABELS[state.preset];
  const fmt = (iso: string | null) => {
    if (!iso) return "";
    const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? `${m[3]}.${m[2]}.${m[1]}` : iso;
  };
  return `${fmt(state.range.from)} – ${fmt(state.range.to)}`;
}

function activeFilterCount(state: AuswertungFilterState): number {
  let n = 0;
  if (state.preset !== "alle") n++;
  if (state.direction !== "alle") n++;
  if (state.minBetrag > 0) n++;
  if (state.search.trim()) n++;
  if (state.compareVorjahr && state.preset !== "alle") n++;
  return n;
}

export default function AuswertungFilter({ state, onChange }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const activeCount = activeFilterCount(state);

  const handlePreset = (preset: RangePreset) => {
    if (preset === "custom") {
      onChange({ ...state, preset, range: state.range });
      return;
    }
    onChange({ ...state, preset, range: rangeFor(preset, new Date()) });
  };

  const setRangeField = (field: "from" | "to", value: string) => {
    onChange({
      ...state,
      preset: "custom",
      range: { ...state.range, [field]: value || null },
    });
  };

  const resetAll = () =>
    onChange({
      preset: "alle",
      range: rangeFor("alle", new Date()),
      direction: "alle",
      minBetrag: 0,
      search: "",
      compareVorjahr: false,
    });

  return (
    <div className="rounded-2xl border border-border bg-surface">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <Filter className="h-4 w-4 text-fg-muted" />
          <span className="text-sm font-medium text-fg">Filter</span>
          <span className="inline-flex items-center gap-1 text-xs text-fg-muted">
            <Calendar className="h-3 w-3" />
            {formatRange(state)}
          </span>
          {state.direction !== "alle" && (
            <span className="text-xs text-fg-muted">
              · {state.direction === "einnahmen" ? "Einnahmen" : "Ausgaben"}
            </span>
          )}
          {state.minBetrag > 0 && (
            <span className="text-xs text-fg-muted">
              · ab {state.minBetrag} €
            </span>
          )}
          {state.search.trim() && (
            <span className="text-xs text-fg-muted">
              · &bdquo;{state.search.trim()}&ldquo;
            </span>
          )}
          {state.compareVorjahr && state.preset !== "alle" && (
            <span className="text-xs text-brand">· Vorjahresvergleich</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <span
              role="button"
              onClick={(e) => {
                e.stopPropagation();
                resetAll();
              }}
              className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] text-fg-muted hover:text-fg cursor-pointer"
              title="Filter zurücksetzen"
            >
              <X className="h-3 w-3" />
              {activeCount} aktiv
            </span>
          )}
          <ChevronDown
            className={`h-4 w-4 text-fg-muted transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {isOpen && (
        <div className="space-y-3 border-t border-border px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-fg-faint">
              Zeitraum
            </span>
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => handlePreset(p)}
                className={`rounded-full border px-3 py-1 text-xs cursor-pointer transition-colors ${
                  state.preset === p
                    ? "border-fg bg-fg text-fg-inverse"
                    : "border-border bg-surface text-fg-muted hover:text-fg"
                }`}
              >
                {PRESET_LABELS[p]}
              </button>
            ))}
          </div>

          {state.preset === "custom" && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-fg-muted">
              <span>von</span>
              <input
                type="date"
                value={state.range.from ?? ""}
                onChange={(e) => setRangeField("from", e.target.value)}
                className="rounded-lg border border-border-strong bg-surface-active px-3 py-1 text-fg"
              />
              <span>bis</span>
              <input
                type="date"
                value={state.range.to ?? ""}
                onChange={(e) => setRangeField("to", e.target.value)}
                className="rounded-lg border border-border-strong bg-surface-active px-3 py-1 text-fg"
              />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-fg-faint">
                Typ
              </span>
              {(["alle", "einnahmen", "ausgaben"] as DirectionFilter[]).map((d) => (
                <button
                  key={d}
                  onClick={() => onChange({ ...state, direction: d })}
                  className={`rounded-full border px-3 py-1 text-xs cursor-pointer transition-colors ${
                    state.direction === d
                      ? "border-fg bg-fg text-fg-inverse"
                      : "border-border bg-surface text-fg-muted hover:text-fg"
                  }`}
                >
                  {d === "alle" ? "Alle" : d === "einnahmen" ? "Einnahmen" : "Ausgaben"}
                </button>
              ))}
            </div>

            <label className="flex items-center gap-2 text-xs text-fg-muted">
              <span className="uppercase tracking-[0.16em] text-fg-faint text-[11px] font-medium">
                Min-Betrag
              </span>
              <input
                type="number"
                min={0}
                step={1}
                value={state.minBetrag || ""}
                onChange={(e) =>
                  onChange({
                    ...state,
                    minBetrag: Number.isFinite(+e.target.value)
                      ? Math.max(0, +e.target.value)
                      : 0,
                  })
                }
                placeholder="0"
                className="w-24 rounded-lg border border-border-strong bg-surface-active px-2 py-1 text-fg"
              />
              <span className="text-fg-subtle">€</span>
            </label>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle" />
              <input
                type="text"
                placeholder="Suche…"
                value={state.search}
                onChange={(e) => onChange({ ...state, search: e.target.value })}
                className="w-48 rounded-lg border border-border-strong bg-surface-active py-1 pl-8 pr-2 text-xs text-fg placeholder:text-fg-subtle"
              />
            </div>

            <div className="flex-1" />

            <Toggle
              checked={state.compareVorjahr && state.preset !== "alle"}
              onChange={(v) => onChange({ ...state, compareVorjahr: v })}
              disabled={state.preset === "alle"}
              title={
                state.preset === "alle"
                  ? "Vorjahresvergleich nur bei eingegrenztem Zeitraum"
                  : "Gleichen Zeitraum im Vorjahr zum Vergleich anzeigen"
              }
              label="Vorjahresvergleich"
            />
          </div>
        </div>
      )}
    </div>
  );
}
