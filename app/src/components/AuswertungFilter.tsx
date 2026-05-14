"use client";

import { Calendar, Coins, Search } from "lucide-react";
import {
  DateRange,
  PRESET_LABELS,
  RangePreset,
  rangeFor,
} from "../lib/date-range";

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
    <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-800/50 px-5 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <Calendar className="h-4 w-4 text-slate-500" />
        <span className="text-xs font-medium text-slate-400">Zeitraum:</span>
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => handlePreset(p)}
            className={`rounded-lg border px-3 py-1 text-xs cursor-pointer ${
              state.preset === p
                ? "border-blue-500 bg-blue-500/10 text-blue-300"
                : "border-slate-700 bg-slate-800/50 text-slate-400 hover:text-slate-200"
            }`}
          >
            {PRESET_LABELS[p]}
          </button>
        ))}
      </div>

      {state.preset === "custom" && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <span>von</span>
          <input
            type="date"
            value={state.range.from ?? ""}
            onChange={(e) => setRangeField("from", e.target.value)}
            className="rounded-lg border border-slate-600 bg-slate-700 px-3 py-1 text-slate-200"
          />
          <span>bis</span>
          <input
            type="date"
            value={state.range.to ?? ""}
            onChange={(e) => setRangeField("to", e.target.value)}
            className="rounded-lg border border-slate-600 bg-slate-700 px-3 py-1 text-slate-200"
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4 text-slate-500" />
          <span className="text-xs font-medium text-slate-400">Typ:</span>
          {(["alle", "einnahmen", "ausgaben"] as DirectionFilter[]).map((d) => (
            <button
              key={d}
              onClick={() => onChange({ ...state, direction: d })}
              className={`rounded-lg border px-3 py-1 text-xs cursor-pointer ${
                state.direction === d
                  ? "border-slate-500 bg-slate-700 text-slate-200"
                  : "border-slate-700 bg-slate-800/50 text-slate-500"
              }`}
            >
              {d === "alle" ? "Alle" : d === "einnahmen" ? "Einnahmen" : "Ausgaben"}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-xs text-slate-400">
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
            className="w-24 rounded-lg border border-slate-600 bg-slate-700 px-2 py-1 text-slate-200"
          />
          <span className="text-slate-500">€</span>
        </label>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Suche…"
            value={state.search}
            onChange={(e) => onChange({ ...state, search: e.target.value })}
            className="w-48 rounded-lg border border-slate-600 bg-slate-700 py-1 pl-8 pr-2 text-xs text-slate-200 placeholder-slate-500"
          />
        </div>

        <label
          className={`flex items-center gap-2 text-xs cursor-pointer ${
            state.preset === "alle" ? "opacity-40 cursor-not-allowed" : "text-slate-300"
          }`}
          title={
            state.preset === "alle"
              ? "Vorjahresvergleich nur bei eingegrenztem Zeitraum"
              : "Gleichen Zeitraum im Vorjahr zum Vergleich anzeigen"
          }
        >
          <input
            type="checkbox"
            checked={state.compareVorjahr && state.preset !== "alle"}
            disabled={state.preset === "alle"}
            onChange={(e) => onChange({ ...state, compareVorjahr: e.target.checked })}
            className="h-3.5 w-3.5 accent-blue-500 cursor-pointer disabled:cursor-not-allowed"
          />
          Vorjahresvergleich
        </label>
      </div>
    </div>
  );
}
