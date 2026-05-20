"use client";

import { useCallback, useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { Plus, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { NetWorthEntry, NetWorthHistoryPoint } from "../lib/types";

const eur = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});
const eurCompact = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

function formatDate(iso: string | null): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

interface NetWorthData {
  assets: NetWorthEntry[];
  liabilities: NetWorthEntry[];
  history: NetWorthHistoryPoint[];
  totals: { assets: number; liabilities: number; net: number };
}

export default function NetWorthView() {
  const [data, setData] = useState<NetWorthData | null>(null);
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [showAddLiability, setShowAddLiability] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/networth");
    const json = await res.json();
    setData(json as NetWorthData);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initialer Fetch
    void load();
  }, [load]);

  if (!data) return <div className="text-sm text-fg-muted">Lade…</div>;

  const { assets, liabilities, history, totals } = data;

  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between">
        <h2 className="font-editorial text-2xl text-fg">Vermögen</h2>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Vermögen" value={totals.assets} positive />
        <SummaryCard label="Verbindlichkeiten" value={totals.liabilities} negative />
        <SummaryCard label="Net Worth" value={totals.net} primary />
      </section>

      {history.length > 0 && (
        <section className="rounded-lg border border-border bg-surface p-4">
          <h3 className="mb-3 text-sm font-medium text-fg-muted">
            Monatlicher Verlauf
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid stroke="currentColor" strokeOpacity={0.1} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "currentColor" }}
                  tickFormatter={(s: string) => s.slice(0, 7)}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "currentColor" }}
                  tickFormatter={(v: number) => eurCompact.format(v)}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    fontSize: 12,
                  }}
                  formatter={(v) => (typeof v === "number" ? eur.format(v) : String(v))}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="assets"
                  name="Vermögen"
                  stroke="#10b981"
                  dot={false}
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="liabilities"
                  name="Verbindlichkeiten"
                  stroke="#ef4444"
                  dot={false}
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="net"
                  name="Netto"
                  stroke="currentColor"
                  dot={false}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <section className="grid gap-6 md:grid-cols-2">
        <EntryList
          title="Vermögen"
          entries={assets}
          onAddClick={() => setShowAddAsset(true)}
          onReload={load}
          kind="asset"
        />
        <EntryList
          title="Verbindlichkeiten"
          entries={liabilities}
          onAddClick={() => setShowAddLiability(true)}
          onReload={load}
          kind="liability"
        />
      </section>

      {showAddAsset && (
        <AddEntryModal
          kind="asset"
          onClose={() => setShowAddAsset(false)}
          onCreated={load}
        />
      )}
      {showAddLiability && (
        <AddEntryModal
          kind="liability"
          onClose={() => setShowAddLiability(false)}
          onCreated={load}
        />
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  positive,
  negative,
  primary,
}: {
  label: string;
  value: number;
  positive?: boolean;
  negative?: boolean;
  primary?: boolean;
}) {
  const Icon = value >= 0 ? TrendingUp : TrendingDown;
  const color = primary
    ? value >= 0
      ? "text-emerald-500"
      : "text-red-500"
    : positive
    ? "text-emerald-500"
    : negative
    ? "text-red-500"
    : "text-fg";
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center justify-between text-xs text-fg-muted">
        {label}
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <div className={`mt-1 font-editorial text-2xl tabular-nums ${color}`}>
        {eur.format(value)}
      </div>
    </div>
  );
}

function EntryList({
  title,
  entries,
  onAddClick,
  onReload,
  kind,
}: {
  title: string;
  entries: NetWorthEntry[];
  onAddClick: () => void;
  onReload: () => void;
  kind: "asset" | "liability";
}) {
  return (
    <div className="rounded-lg border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <h3 className="text-sm font-medium text-fg">{title}</h3>
        <button
          onClick={onAddClick}
          className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-fg-muted hover:text-fg"
        >
          <Plus className="h-3 w-3" />
          Hinzufügen
        </button>
      </div>
      {entries.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-fg-muted">
          Noch nichts erfasst.
        </div>
      ) : (
        <ul>
          {entries.map((e) => (
            <EntryRow key={`${e.source}-${e.id}`} entry={e} onReload={onReload} kind={kind} />
          ))}
        </ul>
      )}
    </div>
  );
}

function EntryRow({
  entry: e,
  onReload,
  kind,
}: {
  entry: NetWorthEntry;
  onReload: () => void;
  kind: "asset" | "liability";
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const isManual = e.source === "manual";

  async function handleSave() {
    const v = parseFloat(value.replace(",", "."));
    if (!isFinite(v)) return;
    const path = kind === "asset" ? "assets" : "liabilities";
    await fetch(`/api/${path}/${e.id}/snapshots`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ date, value: v }),
    });
    setEditing(false);
    setValue("");
    onReload();
  }

  async function handleDelete() {
    if (!confirm(`„${e.name}" löschen?`)) return;
    const path = kind === "asset" ? "assets" : "liabilities";
    await fetch(`/api/${path}/${e.id}`, { method: "DELETE" });
    onReload();
  }

  return (
    <li className="border-b border-border px-4 py-3 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-fg">
              {e.displayPrefix ? `${e.displayPrefix} · ` : ""}
              {e.name}
            </span>
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                isManual
                  ? "bg-surface text-fg-muted border border-border"
                  : "bg-emerald-500/10 text-emerald-500"
              }`}
            >
              {isManual ? e.kind : "aus Konto"}
            </span>
          </div>
          <div className="text-xs text-fg-muted">
            {e.latestValue !== null
              ? `${formatDate(e.latestDate)}`
              : "kein Wert"}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm tabular-nums text-fg">
            {e.latestValue !== null ? eur.format(e.latestValue) : "—"}
          </div>
          <div className="mt-1 flex items-center gap-1 justify-end">
            {isManual && (
              <>
                <button
                  onClick={() => setEditing((v) => !v)}
                  className="rounded border border-border px-1.5 py-0.5 text-[10px] text-fg-muted hover:text-fg"
                >
                  Wert
                </button>
                <button
                  onClick={handleDelete}
                  aria-label="Löschen"
                  className="text-fg-muted hover:text-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      {editing && isManual && (
        <div className="mt-2 flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded border border-border bg-bg px-2 py-1 text-xs text-fg"
          />
          <input
            type="text"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Wert in EUR"
            className="flex-1 rounded border border-border bg-bg px-2 py-1 text-xs text-fg"
          />
          <button
            onClick={handleSave}
            className="rounded bg-fg px-2 py-1 text-xs text-fg-inverse"
          >
            Speichern
          </button>
        </div>
      )}
    </li>
  );
}

function AddEntryModal({
  kind,
  onClose,
  onCreated,
}: {
  kind: "asset" | "liability";
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState(kind === "asset" ? "depot" : "kredit");
  const [note, setNote] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const path = kind === "asset" ? "assets" : "liabilities";
    await fetch(`/api/${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: name.trim(), kind: type, note: note.trim() || null }),
    });
    onCreated();
    onClose();
  }

  const types =
    kind === "asset"
      ? ["depot", "immobilie", "bargeld", "sonstiges"]
      : ["hypothek", "kredit", "sonstiges"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <form
        onSubmit={handleCreate}
        className="w-full max-w-md space-y-3 rounded-lg border border-border bg-surface p-5"
      >
        <h3 className="font-editorial text-lg text-fg">
          {kind === "asset" ? "Vermögen hinzufügen" : "Verbindlichkeit hinzufügen"}
        </h3>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name (z. B. Depot ING)"
          maxLength={64}
          className="w-full rounded border border-border bg-bg px-3 py-2 text-sm text-fg"
          autoFocus
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full rounded border border-border bg-bg px-3 py-2 text-sm text-fg"
        >
          {types.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Notiz (optional)"
          maxLength={500}
          className="w-full rounded border border-border bg-bg px-3 py-2 text-sm text-fg"
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-border px-3 py-1.5 text-sm text-fg-muted"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            className="rounded bg-fg px-3 py-1.5 text-sm text-fg-inverse"
          >
            Anlegen
          </button>
        </div>
      </form>
    </div>
  );
}
