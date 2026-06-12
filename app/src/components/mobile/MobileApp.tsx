"use client";

import { useCallback, useState } from "react";
import { LineChart, ReceiptText, Wallet, Repeat } from "lucide-react";
import ThemeToggle from "../ThemeToggle";
import MobileDashboard from "./MobileDashboard";
import MobileTransactionList, {
  TxPresetFilter,
} from "./MobileTransactionList";
import MobileTransactionSheet from "./MobileTransactionSheet";
import MobileNetWorth from "./MobileNetWorth";
import MobileRecurring from "./MobileRecurring";
import { Kontogruppe, Transaction } from "../../lib/types";

type MobileTab = "uebersicht" | "buchungen" | "vermoegen" | "abos";

interface MobileAppProps {
  transactions: Transaction[];
  kontogruppen: Kontogruppe[];
  kategorien: string[];
  isLoading: boolean;
  onCategoryChange: (id: string, kategorie: string) => Promise<void> | void;
}

const TABS: { id: MobileTab; label: string; icon: typeof LineChart }[] = [
  { id: "uebersicht", label: "Übersicht", icon: LineChart },
  { id: "buchungen", label: "Buchungen", icon: ReceiptText },
  { id: "vermoegen", label: "Vermögen", icon: Wallet },
  { id: "abos", label: "Abos", icon: Repeat },
];

/**
 * Smartphone-Shell: kompakter Header, Tab-Inhalte und eine fixe
 * Bottom-Navigation mit Safe-Area-Polster. Das Transaktions-Detail-Sheet
 * lebt hier, damit Übersicht und Buchungsliste es gemeinsam nutzen.
 */
export default function MobileApp({
  transactions,
  kontogruppen,
  kategorien,
  isLoading,
  onCategoryChange,
}: MobileAppProps) {
  const [tab, setTab] = useState<MobileTab>("uebersicht");
  const [txPreset, setTxPreset] = useState<TxPresetFilter | null>(null);
  const [sheetTxId, setSheetTxId] = useState<string | null>(null);

  const sheetTx = sheetTxId
    ? (transactions.find((t) => t.id === sheetTxId) ?? null)
    : null;

  const openTransactions = useCallback((preset: TxPresetFilter | null) => {
    setTxPreset(preset);
    setTab("buchungen");
  }, []);

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-border bg-bg/85 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="flex h-13 items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span
              aria-hidden
              className="inline-block h-3.5 w-1 translate-y-[2px] bg-fg"
            />
            <h1 className="font-editorial text-xl font-medium tracking-tight text-fg">
              <span className="font-editorial-italic">Mein</span>Saldo
            </h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="px-4 pb-[calc(84px+env(safe-area-inset-bottom))] pt-4">
        {tab === "uebersicht" && (
          <MobileDashboard
            transactions={transactions}
            isLoading={isLoading}
            onCategoryTap={(kategorie, type) =>
              openTransactions({ kategorie, direction: type })
            }
            onShowAll={() => openTransactions(null)}
            onOpenTx={(t) => setSheetTxId(t.id)}
          />
        )}

        {tab === "buchungen" && (
          <MobileTransactionList
            transactions={transactions}
            kontogruppen={kontogruppen}
            preset={txPreset}
            onClearPreset={() => setTxPreset(null)}
            onOpenTx={(t) => setSheetTxId(t.id)}
          />
        )}

        {tab === "vermoegen" && <MobileNetWorth />}

        {tab === "abos" && <MobileRecurring />}
      </main>

      <nav
        aria-label="Hauptnavigation"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
      >
        <div className="mx-auto flex max-w-md items-stretch justify-around">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTab(t.id);
                  if (t.id !== "buchungen") setTxPreset(null);
                  window.scrollTo({ top: 0 });
                }}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-16 min-w-16 flex-1 cursor-pointer flex-col items-center justify-center gap-1 transition-colors ${
                  active ? "text-fg" : "text-fg-subtle active:text-fg-muted"
                }`}
              >
                <span
                  className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${
                    active ? "bg-surface-active" : "bg-transparent"
                  }`}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.2 : 1.8} />
                </span>
                <span className={`text-[10px] ${active ? "font-semibold" : "font-medium"}`}>
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {sheetTx && (
        <MobileTransactionSheet
          transaction={sheetTx}
          kontogruppen={kontogruppen}
          kategorien={kategorien}
          onCategoryChange={onCategoryChange}
          onClose={() => setSheetTxId(null)}
        />
      )}
    </div>
  );
}
