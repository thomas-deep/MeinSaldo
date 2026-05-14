"use client";

import { useState, useMemo } from "react";
import { Search, ChevronDown, ChevronUp, Filter, ArrowLeftRight } from "lucide-react";
import { Kontogruppe, Transaction } from "../lib/types";
import { categoryRules } from "../lib/categories";

interface TransactionTableProps {
  transactions: Transaction[];
  kontogruppen: Kontogruppe[];
  onCategoryChange: (id: string, kategorie: string) => void;
  onUmbuchungToggle: (id: string, isUmbuchung: boolean) => void;
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

type SortKey = "buchungstag" | "betrag" | "kategorie" | "nameZahlungsbeteiligter";

const allCategories = [
  ...categoryRules.map((r) => r.kategorie),
  "Sonstige Einnahmen",
  "Sonstiges",
];

export default function TransactionTable({
  transactions,
  kontogruppen,
  onCategoryChange,
  onUmbuchungToggle,
}: TransactionTableProps) {
  const kontogruppenById = useMemo(
    () => Object.fromEntries(kontogruppen.map((k) => [k.id, k])),
    [kontogruppen]
  );
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("buchungstag");
  const [sortDesc, setSortDesc] = useState(true);
  const [filterKategorie, setFilterKategorie] = useState("");
  const [filterType, setFilterType] = useState<"alle" | "einnahmen" | "ausgaben">("alle");

  const filtered = useMemo(() => {
    let result = [...transactions];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.nameZahlungsbeteiligter.toLowerCase().includes(q) ||
          t.verwendungszweck.toLowerCase().includes(q) ||
          t.kategorie.toLowerCase().includes(q) ||
          t.buchungstext.toLowerCase().includes(q)
      );
    }

    if (filterKategorie) {
      result = result.filter((t) => t.kategorie === filterKategorie);
    }

    if (filterType === "einnahmen") result = result.filter((t) => t.betrag > 0);
    if (filterType === "ausgaben") result = result.filter((t) => t.betrag < 0);

    result.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "betrag") cmp = a.betrag - b.betrag;
      else cmp = (a[sortKey] || "").localeCompare(b[sortKey] || "");
      return sortDesc ? -cmp : cmp;
    });

    return result;
  }, [transactions, search, sortKey, sortDesc, filterKategorie, filterType]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDesc(!sortDesc);
    else {
      setSortKey(key);
      setSortDesc(true);
    }
  };

  const renderSortIcon = (column: SortKey) => {
    if (sortKey !== column) return null;
    return sortDesc ? (
      <ChevronDown className="inline h-3.5 w-3.5" />
    ) : (
      <ChevronUp className="inline h-3.5 w-3.5" />
    );
  };

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/50">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-700 px-5 py-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-600 bg-slate-700 py-2 pl-10 pr-3 text-sm text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-500" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as typeof filterType)}
            className="rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-xs text-slate-200"
          >
            <option value="alle">Alle</option>
            <option value="einnahmen">Einnahmen</option>
            <option value="ausgaben">Ausgaben</option>
          </select>

          <select
            value={filterKategorie}
            onChange={(e) => setFilterKategorie(e.target.value)}
            className="rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-xs text-slate-200"
          >
            <option value="">Alle Kategorien</option>
            {allCategories.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>

        <span className="text-xs text-slate-500">
          {filtered.length} von {transactions.length}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-left text-xs text-slate-400">
              <th
                className="cursor-pointer px-5 py-3 hover:text-slate-200"
                onClick={() => handleSort("buchungstag")}
              >
                Datum {renderSortIcon("buchungstag")}
              </th>
              <th
                className="cursor-pointer px-5 py-3 hover:text-slate-200"
                onClick={() => handleSort("nameZahlungsbeteiligter")}
              >
                Zahlungsbeteiligter {renderSortIcon("nameZahlungsbeteiligter")}
              </th>
              <th className="px-5 py-3">Verwendungszweck</th>
              <th className="px-5 py-3">Gruppe</th>
              <th
                className="cursor-pointer px-5 py-3 hover:text-slate-200"
                onClick={() => handleSort("kategorie")}
              >
                Kategorie {renderSortIcon("kategorie")}
              </th>
              <th
                className="cursor-pointer px-5 py-3 text-right hover:text-slate-200"
                onClick={() => handleSort("betrag")}
              >
                Betrag {renderSortIcon("betrag")}
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 200).map((tx) => (
              <tr
                key={tx.id}
                className="border-b border-slate-700/50 transition-colors hover:bg-slate-700/20"
              >
                <td className="whitespace-nowrap px-5 py-3 text-slate-400">
                  {formatDate(tx.buchungstag)}
                </td>
                <td className="max-w-[200px] truncate px-5 py-3 text-slate-200">
                  {tx.nameZahlungsbeteiligter}
                </td>
                <td className="max-w-[280px] truncate px-5 py-3 text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onUmbuchungToggle(tx.id, !tx.isUmbuchung);
                      }}
                      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium cursor-pointer transition-colors ${
                        tx.isUmbuchung
                          ? "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                          : "border border-slate-700 text-slate-600 hover:border-amber-500/50 hover:text-amber-500"
                      }`}
                      title={
                        tx.isUmbuchung
                          ? "Als Umbuchung markiert (klicken zum Aufheben)"
                          : "Als Umbuchung markieren"
                      }
                    >
                      <ArrowLeftRight className="h-3 w-3" />
                      {tx.isUmbuchung ? "Umbuchung" : "Umbuchen?"}
                    </button>
                    <span className="truncate">{tx.verwendungszweck}</span>
                  </div>
                </td>
                <td className="px-5 py-3">
                  {tx.kontogruppeId && kontogruppenById[tx.kontogruppeId] ? (
                    <span
                      className="inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs"
                      style={{
                        backgroundColor: kontogruppenById[tx.kontogruppeId].color + "22",
                        color: kontogruppenById[tx.kontogruppeId].color,
                      }}
                    >
                      <span
                        className="inline-block h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: kontogruppenById[tx.kontogruppeId].color }}
                      />
                      {kontogruppenById[tx.kontogruppeId].name}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-600">–</span>
                  )}
                </td>
                <td className="px-5 py-3">
                  <select
                    value={tx.kategorie}
                    onChange={(e) => onCategoryChange(tx.id, e.target.value)}
                    className="rounded border border-slate-600 bg-slate-700 px-2 py-1 text-xs text-slate-300"
                  >
                    {allCategories.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </td>
                <td
                  className={`whitespace-nowrap px-5 py-3 text-right font-medium ${
                    tx.betrag >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {formatEuro(tx.betrag)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length > 200 && (
        <p className="border-t border-slate-700 px-5 py-3 text-center text-xs text-slate-500">
          Zeige 200 von {filtered.length} Transaktionen
        </p>
      )}
    </div>
  );
}
