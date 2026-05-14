"use client";

import { Kontogruppe } from "../lib/types";

type FilterValue = number | "all";

interface KontogruppeFilterProps {
  kontogruppen: Kontogruppe[];
  selected: FilterValue;
  onSelect: (id: FilterValue) => void;
  counts: Record<string, number>;
}

export default function KontogruppeFilter({
  kontogruppen,
  selected,
  onSelect,
  counts,
}: KontogruppeFilterProps) {
  if (kontogruppen.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onSelect("all")}
        className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium cursor-pointer ${
          selected === "all"
            ? "border-blue-500 bg-blue-500/10 text-blue-300"
            : "border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600"
        }`}
      >
        Gesamt
        <span className="text-slate-500">({counts["all"] ?? 0})</span>
      </button>
      {kontogruppen.map((kg) => (
        <button
          key={kg.id}
          onClick={() => onSelect(kg.id)}
          className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium cursor-pointer ${
            selected === kg.id
              ? "bg-slate-700 text-white"
              : "border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600"
          }`}
          style={
            selected === kg.id
              ? { borderColor: kg.color, backgroundColor: kg.color + "22", color: kg.color }
              : undefined
          }
        >
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: kg.color }}
          />
          {kg.name}
          <span className="text-slate-500">({counts[kg.id] ?? 0})</span>
        </button>
      ))}
      {counts["null"] > 0 && (
        <button
          onClick={() => onSelect(-1)}
          className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium cursor-pointer ${
            selected === -1
              ? "border-slate-400 bg-slate-700 text-slate-200"
              : "border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600"
          }`}
        >
          Nicht zugeordnet
          <span className="text-slate-500">({counts["null"]})</span>
        </button>
      )}
    </div>
  );
}
