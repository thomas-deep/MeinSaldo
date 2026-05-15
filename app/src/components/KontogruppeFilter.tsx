"use client";

import { useMemo } from "react";
import { Inhaber, Kontogruppe } from "../lib/types";

export interface KontogruppeFilterValue {
  inhaberIds: number[];
  kontogruppeIds: number[];
  includeNone: boolean;
}

export const EMPTY_FILTER: KontogruppeFilterValue = {
  inhaberIds: [],
  kontogruppeIds: [],
  includeNone: false,
};

export function isFilterEmpty(v: KontogruppeFilterValue): boolean {
  return (
    v.inhaberIds.length === 0 &&
    v.kontogruppeIds.length === 0 &&
    !v.includeNone
  );
}

interface KontogruppeFilterProps {
  kontogruppen: Kontogruppe[];
  inhaber: Inhaber[];
  selected: KontogruppeFilterValue;
  onSelect: (v: KontogruppeFilterValue) => void;
  /** Anzahl pro kontogruppe.id (number) und "none" für nicht zugeordnete */
  counts: {
    total: number;
    perKontogruppe: Record<number, number>;
    none: number;
  };
}

function toggleId(list: number[], id: number): number[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

export default function KontogruppeFilter({
  kontogruppen,
  inhaber,
  selected,
  onSelect,
  counts,
}: KontogruppeFilterProps) {
  const grouped = useMemo(() => {
    const map = new Map<number, Kontogruppe[]>();
    for (const kg of kontogruppen) {
      const list = map.get(kg.inhaberId) ?? [];
      list.push(kg);
      map.set(kg.inhaberId, list);
    }
    return inhaber
      .map((i) => ({
        inhaber: i,
        kontogruppen: map.get(i.id) ?? [],
        sum: (map.get(i.id) ?? []).reduce(
          (s, kg) => s + (counts.perKontogruppe[kg.id] ?? 0),
          0
        ),
      }))
      .filter((g) => g.kontogruppen.length > 0);
  }, [inhaber, kontogruppen, counts.perKontogruppe]);

  if (kontogruppen.length === 0) return null;

  const isAll = isFilterEmpty(selected);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={() => onSelect(EMPTY_FILTER)}
        className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors ${
          isAll
            ? "border-fg bg-fg text-fg-inverse"
            : "border-border bg-surface text-fg-muted hover:text-fg"
        }`}
        title="Alle Filter aufheben"
      >
        Gesamt
        <span className={isAll ? "opacity-70" : "text-fg-subtle"}>
          ({counts.total})
        </span>
      </button>

      {grouped.map(({ inhaber: i, kontogruppen: kgs, sum }) => {
        const inhaberActive = selected.inhaberIds.includes(i.id);
        return (
          <div
            key={i.id}
            className="flex items-center gap-1 rounded-full border border-border bg-surface p-0.5"
          >
            <button
              onClick={() =>
                onSelect({
                  ...selected,
                  inhaberIds: toggleId(selected.inhaberIds, i.id),
                })
              }
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium cursor-pointer transition-colors ${
                inhaberActive
                  ? "bg-fg text-fg-inverse"
                  : "text-fg hover:bg-bg-muted"
              }`}
              title={`Alle Konten von ${i.name} ein-/ausblenden`}
            >
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: i.color }}
              />
              {i.name}
              <span className={inhaberActive ? "opacity-70" : "text-fg-subtle"}>
                ({sum})
              </span>
            </button>
            {kgs.map((kg) => {
              const active = selected.kontogruppeIds.includes(kg.id);
              return (
                <button
                  key={kg.id}
                  onClick={() =>
                    onSelect({
                      ...selected,
                      kontogruppeIds: toggleId(selected.kontogruppeIds, kg.id),
                    })
                  }
                  className="flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium cursor-pointer transition-colors"
                  style={
                    active
                      ? {
                          backgroundColor: kg.color + "22",
                          color: kg.color,
                          borderColor: kg.color,
                        }
                      : undefined
                  }
                  title={`${i.name} · ${kg.name}`}
                >
                  <span
                    className={`inline-block h-1.5 w-1.5 rounded-full ${active ? "" : "opacity-60"}`}
                    style={{ backgroundColor: kg.color }}
                  />
                  <span className={active ? "" : "text-fg-muted"}>
                    {kg.name}
                  </span>
                  <span
                    className={active ? "opacity-70" : "text-fg-subtle"}
                  >
                    ({counts.perKontogruppe[kg.id] ?? 0})
                  </span>
                </button>
              );
            })}
          </div>
        );
      })}

      {counts.none > 0 && (
        <button
          onClick={() =>
            onSelect({ ...selected, includeNone: !selected.includeNone })
          }
          className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors ${
            selected.includeNone
              ? "border-fg bg-fg text-fg-inverse"
              : "border-border bg-surface text-fg-muted hover:text-fg"
          }`}
        >
          Nicht zugeordnet
          <span
            className={selected.includeNone ? "opacity-70" : "text-fg-subtle"}
          >
            ({counts.none})
          </span>
        </button>
      )}
    </div>
  );
}
