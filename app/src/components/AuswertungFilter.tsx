"use client";

import { Calendar, Coins, Search } from "lucide-react";
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

export default function AuswertungFilter({ state, onChange }: Props) {
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

  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface px-5 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <Calendar className="h-4 w-4 text-fg-subtle" />
        <span className="text-xs font-medium text-fg-muted">Zeitraum:</span>
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => handlePreset(p)}
            className={`rounded-lg border px-3 py-1 text-xs cursor-pointer ${
              state.preset === p
                ? "border-brand bg-brand-soft text-brand"
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
          <Coins className="h-4 w-4 text-fg-subtle" />
          <span className="text-xs font-medium text-fg-muted">Typ:</span>
          {(["alle", "einnahmen", "ausgaben"] as DirectionFilter[]).map((d) => (
            <button
              key={d}
              onClick={() => onChange({ ...state, direction: d })}
              className={`rounded-lg border px-3 py-1 text-xs cursor-pointer ${
                state.direction === d
                  ? "border-border-strong bg-surface-active text-fg"
                  : "border-border bg-surface text-fg-subtle"
              }`}
            >
              {d === "alle" ? "Alle" : d === "einnahmen" ? "Einnahmen" : "Ausgaben"}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-xs text-fg-muted">
          <span>Min-Betrag</span>
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
  );
}
