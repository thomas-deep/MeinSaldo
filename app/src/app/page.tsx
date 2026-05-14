"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, LineChart, Database, Settings as SettingsIcon } from "lucide-react";
import CsvUpload from "../components/CsvUpload";
import FieldMappingComponent from "../components/FieldMapping";
import SummaryCards from "../components/SummaryCards";
import CategoryChart from "../components/CategoryChart";
import MonthlyChart from "../components/MonthlyChart";
import TransactionTable from "../components/TransactionTable";
import CategoryDrillDown from "../components/CategoryDrillDown";
import DbStatus from "../components/DbStatus";
import KontogruppeFilter from "../components/KontogruppeFilter";
import SettingsView from "../components/SettingsView";
import AiCategorizeButton from "../components/AiCategorizeButton";
import { FieldMapping, Kontogruppe, PreprocessResult, RawRow, Transaction } from "../lib/types";
import { defaultMapping, bankPresets } from "../lib/field-mapping";
import { parseCsvData, detectCsvHeaders } from "../lib/parse-csv";

interface PresetHooks {
  preprocess?: (rawText: string) => PreprocessResult;
  rowTransform?: (row: RawRow) => RawRow;
}

interface DbStats {
  count: number;
  earliest: string | null;
  latest: string | null;
}

export default function Home() {
  const [csvText, setCsvText] = useState<string | null>(null);
  const [pendingKontogruppeId, setPendingKontogruppeId] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [kontogruppen, setKontogruppen] = useState<Kontogruppe[]>([]);
  const [mapping, setMapping] = useState<FieldMapping>({ ...defaultMapping });
  const [separator, setSeparator] = useState(";");
  const [invertAmount, setInvertAmount] = useState(false);
  const [defaultCurrency, setDefaultCurrency] = useState("EUR");
  const presetHooksRef = useRef<PresetHooks>({});
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"dashboard" | "tabelle">("dashboard");
  const [view, setView] = useState<"auswertung" | "daten" | "einstellungen">("auswertung");
  const [dbStats, setDbStats] = useState<DbStats>({ count: 0, earliest: null, latest: null });
  const [lastImport, setLastImport] = useState<{ inserted: number; skipped: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<number | "all">("all");
  const [drillDown, setDrillDown] = useState<{
    kategorie: string;
    type: "einnahmen" | "ausgaben";
  } | null>(null);

  const loadFromDb = useCallback(async (signal?: AbortSignal) => {
    try {
      const [txRes, kgRes] = await Promise.all([
        fetch("/api/transactions", { signal }),
        fetch("/api/kontogruppen", { signal }),
      ]);
      const txData = await txRes.json();
      const kgData = await kgRes.json();
      if (signal?.aborted) return;
      setTransactions(txData.transactions);
      setDbStats(txData.stats);
      setKontogruppen(kgData.kontogruppen);
    } catch (e) {
      if ((e as { name?: string })?.name === "AbortError") return;
      console.error("Load failed:", e);
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch on mount mit Abort-Cleanup
    loadFromDb(ctrl.signal);
    return () => ctrl.abort();
  }, [loadFromDb]);

  const importToDb = useCallback(
    async (parsed: Transaction[], kontogruppeId: number | null) => {
      try {
        const res = await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transactions: parsed, kontogruppeId }),
        });
        const result = await res.json();
        setLastImport({ inserted: result.inserted, skipped: result.skipped });
        await loadFromDb();
      } catch (e) {
        console.error("Import failed:", e);
      }
    },
    [loadFromDb]
  );

  const applyPreset = useCallback((preset: (typeof bankPresets)[number]) => {
    setMapping({ ...preset.mapping });
    setSeparator(preset.separator);
    setInvertAmount(preset.invertAmount ?? false);
    setDefaultCurrency(preset.defaultCurrency ?? "EUR");
    presetHooksRef.current = {
      preprocess: preset.preprocess,
      rowTransform: preset.rowTransform,
    };
  }, []);

  const handleFileLoaded = useCallback(
    (content: string, _filename: string, kontogruppeId: number | null) => {
      setCsvText(content);
      setPendingKontogruppeId(kontogruppeId);

      let activeMapping = mapping;
      let activeSeparator = separator;
      let activeInvert = invertAmount;
      let activeCurrency = defaultCurrency;
      if (kontogruppeId != null) {
        const kg = kontogruppen.find((k) => k.id === kontogruppeId);
        if (kg?.bank) {
          const preset = bankPresets.find((p) => p.name === kg.bank);
          if (preset) {
            applyPreset(preset);
            activeMapping = preset.mapping;
            activeSeparator = preset.separator;
            activeInvert = preset.invertAmount ?? false;
            activeCurrency = preset.defaultCurrency ?? "EUR";
          }
        }
      }

      const hooks = presetHooksRef.current;
      const headers = detectCsvHeaders(content, activeSeparator, hooks);
      setCsvHeaders(headers);
      const parsed = parseCsvData(content, activeMapping, activeSeparator, {
        invertAmount: activeInvert,
        defaultCurrency: activeCurrency,
        ...hooks,
      });
      importToDb(parsed, kontogruppeId);
    },
    [
      mapping,
      separator,
      invertAmount,
      defaultCurrency,
      importToDb,
      kontogruppen,
      applyPreset,
    ]
  );

  const handleMappingChange = useCallback((newMapping: FieldMapping) => {
    setMapping(newMapping);
  }, []);

  const handleSeparatorChange = useCallback(
    (newSep: string) => {
      setSeparator(newSep);
      if (csvText) {
        const headers = detectCsvHeaders(csvText, newSep, presetHooksRef.current);
        setCsvHeaders(headers);
      }
    },
    [csvText]
  );

  const handlePresetSelect = useCallback(
    (index: number) => {
      const preset = bankPresets[index];
      applyPreset(preset);
      if (csvText) {
        const headers = detectCsvHeaders(csvText, preset.separator, presetHooksRef.current);
        setCsvHeaders(headers);
      }
    },
    [csvText, applyPreset]
  );

  const handleReimport = useCallback(() => {
    if (!csvText) return;
    const parsed = parseCsvData(csvText, mapping, separator, {
      invertAmount,
      defaultCurrency,
      ...presetHooksRef.current,
    });
    importToDb(parsed, pendingKontogruppeId);
  }, [csvText, mapping, separator, invertAmount, defaultCurrency, importToDb, pendingKontogruppeId]);

  const handleUmbuchungToggle = useCallback(
    async (id: string, isUmbuchung: boolean) => {
      setTransactions((prev) =>
        prev.map((t) => (t.id === id ? { ...t, isUmbuchung } : t))
      );
      try {
        await fetch(`/api/transactions/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ umbuchung: isUmbuchung }),
        });
      } catch (e) {
        console.error("Toggle failed:", e);
      }
    },
    []
  );

  const handleCategoryChange = useCallback(async (id: string, kategorie: string) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, kategorie } : t))
    );
    try {
      await fetch(`/api/transactions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kategorie }),
      });
    } catch (e) {
      console.error("Update failed:", e);
    }
  }, []);

  const handleClearDb = useCallback(async () => {
    if (!confirm("Alle gespeicherten Transaktionen löschen?")) return;
    try {
      await fetch("/api/transactions", { method: "DELETE" });
      setLastImport(null);
      await loadFromDb();
    } catch (e) {
      console.error("Clear failed:", e);
    }
  }, [loadFromDb]);

  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = { all: transactions.length, null: 0 };
    for (const tx of transactions) {
      const key = tx.kontogruppeId == null ? "null" : String(tx.kontogruppeId);
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    if (filter === "all") return transactions;
    if (filter === -1) return transactions.filter((t) => t.kontogruppeId == null);
    return transactions.filter((t) => t.kontogruppeId === filter);
  }, [transactions, filter]);

  const hasData = transactions.length > 0;

  const navItems = [
    { id: "auswertung" as const, label: "Auswertung", icon: LineChart },
    { id: "daten" as const, label: "Daten", icon: Database },
    { id: "einstellungen" as const, label: "Einstellungen", icon: SettingsIcon },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-600/20 p-2.5">
            <BarChart3 className="h-6 w-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100">Finanz-Auswertung</h1>
            <p className="text-xs text-slate-500">
              Einnahmen & Ausgaben aus Konto-Exporten
            </p>
          </div>
        </div>

        <nav className="flex gap-1 rounded-xl bg-slate-800/50 p-1 border border-slate-700">
          {navItems.map((n) => {
            const Icon = n.icon;
            const active = view === n.id;
            return (
              <button
                key={n.id}
                onClick={() => setView(n.id)}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium cursor-pointer transition-colors ${
                  active
                    ? "bg-slate-700 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Icon className="h-4 w-4" />
                {n.label}
              </button>
            );
          })}
        </nav>
      </header>

      {view === "einstellungen" && (
        <SettingsView
          kontogruppen={kontogruppen}
          onKontogruppenChange={loadFromDb}
        />
      )}

      {view === "daten" && (
        <div className="space-y-6">
          <CsvUpload kontogruppen={kontogruppen} onFileLoaded={handleFileLoaded} />

          {dbStats.count > 0 && (
            <DbStatus
              count={dbStats.count}
              earliest={dbStats.earliest}
              latest={dbStats.latest}
              lastImport={lastImport}
              onClear={handleClearDb}
            />
          )}

          {csvHeaders.length > 0 && (
            <div className="space-y-3">
              <FieldMappingComponent
                csvHeaders={csvHeaders}
                mapping={mapping}
                separator={separator}
                invertAmount={invertAmount}
                onMappingChange={handleMappingChange}
                onSeparatorChange={handleSeparatorChange}
                onInvertAmountChange={setInvertAmount}
                onPresetSelect={handlePresetSelect}
              />
              <button
                onClick={handleReimport}
                className="text-xs text-blue-400 hover:text-blue-300 cursor-pointer"
              >
                ↻ Mit aktuellem Mapping neu importieren
              </button>
            </div>
          )}

          {!isLoading && !hasData && (
            <p className="py-6 text-center text-sm text-slate-500">
              Noch keine Buchungen importiert. Lade eine CSV-Datei hoch, um zu starten.
            </p>
          )}
        </div>
      )}

      {view === "auswertung" && (
        <div className="space-y-6">
          {isLoading && (
            <p className="py-12 text-center text-sm text-slate-500">Lade...</p>
          )}

          {!isLoading && !hasData && (
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-8 text-center">
              <p className="text-sm text-slate-300">
                Noch keine Daten zum Auswerten vorhanden.
              </p>
              <button
                onClick={() => setView("daten")}
                className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 cursor-pointer"
              >
                Zu Daten wechseln
              </button>
            </div>
          )}

          {!isLoading && hasData && (
            <>
              <AiCategorizeButton onDone={loadFromDb} />

              {kontogruppen.length > 0 && (
                <KontogruppeFilter
                  kontogruppen={kontogruppen}
                  selected={filter}
                  onSelect={setFilter}
                  counts={filterCounts}
                />
              )}

              <SummaryCards transactions={filteredTransactions} />

              <div className="flex gap-1 rounded-xl bg-slate-800/50 p-1 border border-slate-700">
                <button
                  onClick={() => {
                    setActiveTab("dashboard");
                    setDrillDown(null);
                  }}
                  className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                    activeTab === "dashboard"
                      ? "bg-slate-700 text-white"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setActiveTab("tabelle")}
                  className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                    activeTab === "tabelle"
                      ? "bg-slate-700 text-white"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Transaktionen ({filteredTransactions.length})
                </button>
              </div>

              {activeTab === "dashboard" ? (
                drillDown ? (
                  <CategoryDrillDown
                    transactions={filteredTransactions}
                    kategorie={drillDown.kategorie}
                    type={drillDown.type}
                    kontogruppen={kontogruppen}
                    onBack={() => setDrillDown(null)}
                  />
                ) : (
                  <div className="space-y-6">
                    <MonthlyChart transactions={filteredTransactions} />
                    <div className="grid gap-6 lg:grid-cols-2">
                      <CategoryChart
                        transactions={filteredTransactions}
                        type="ausgaben"
                        onCategoryClick={(kategorie) =>
                          setDrillDown({ kategorie, type: "ausgaben" })
                        }
                      />
                      <CategoryChart
                        transactions={filteredTransactions}
                        type="einnahmen"
                        onCategoryClick={(kategorie) =>
                          setDrillDown({ kategorie, type: "einnahmen" })
                        }
                      />
                    </div>
                  </div>
                )
              ) : (
                <TransactionTable
                  transactions={filteredTransactions}
                  kontogruppen={kontogruppen}
                  onCategoryChange={handleCategoryChange}
                  onUmbuchungToggle={handleUmbuchungToggle}
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
