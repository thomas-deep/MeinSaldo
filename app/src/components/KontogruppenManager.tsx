"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2, Users, X, Pencil, Check, Anchor } from "lucide-react";
import { Inhaber, Kontogruppe, KontogruppeArt } from "../lib/types";
import { ICON_KEYS, getIcon } from "../lib/icons";
import { bankPresets } from "../lib/field-mapping";
import SortableList, { DragHandle } from "./SortableList";
import { parseGermanNumber, formatGermanAmount } from "../lib/number-format";

interface KontogruppenManagerProps {
  kontogruppen: Kontogruppe[];
  inhaber: Inhaber[];
  onChange: () => void;
}

const ART_LABELS: Record<KontogruppeArt, string> = {
  girokonto: "Girokonto",
  sparkonto: "Sparkonto",
  kreditkarte: "Kreditkarte",
  depot: "Depot",
  sonstiges: "Sonstiges",
};

const ART_DEFAULT_ICON: Record<KontogruppeArt, string> = {
  girokonto: "wallet",
  sparkonto: "piggybank",
  kreditkarte: "creditcard",
  depot: "trendingup",
  sonstiges: "coins",
};

const ARTS_ORDER: KontogruppeArt[] = [
  "girokonto",
  "sparkonto",
  "kreditkarte",
  "depot",
  "sonstiges",
];

const PRESET_COLORS = [
  "#3B82F6", "#10B981", "#F59E0B", "#EC4899", "#8B5CF6",
  "#06B6D4", "#F97316", "#14B8A6", "#6366F1", "#84CC16",
  "#EF4444", "#A855F7",
];

interface FormState {
  name: string;
  inhaberId: number | "";
  art: KontogruppeArt;
  color: string;
  icon: string;
  bank: string;
}

function FormFields({
  state,
  onChange,
  inhaber,
}: {
  state: FormState;
  onChange: (s: FormState) => void;
  inhaber: Inhaber[];
}) {
  return (
    <div className="space-y-3">
      <input
        type="text"
        placeholder='z.B. "Giro", "Visa", "Tagesgeld"'
        value={state.name}
        onChange={(e) => onChange({ ...state, name: e.target.value })}
        className="w-full rounded-lg border border-border-strong bg-surface-active px-3 py-2 text-sm text-fg placeholder:text-fg-subtle"
        autoFocus
      />
      <div>
        <label className="mb-1.5 block text-xs text-fg-muted">
          Inhaber <span className="text-fg-faint">— wem gehört&apos;s</span>
        </label>
        <select
          value={state.inhaberId === "" ? "" : String(state.inhaberId)}
          onChange={(e) =>
            onChange({
              ...state,
              inhaberId: e.target.value === "" ? "" : Number(e.target.value),
            })
          }
          className="w-full rounded-lg border border-border-strong bg-surface-active px-3 py-2 text-sm text-fg"
        >
          <option value="">— bitte wählen —</option>
          {inhaber.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
        {inhaber.length === 0 && (
          <p className="mt-1 text-xs text-warn">
            Erst einen Inhaber anlegen, dann hier zuordnen.
          </p>
        )}
      </div>
      <div>
        <label className="mb-1.5 block text-xs text-fg-muted">
          Art <span className="text-fg-faint">— Kontoart</span>
        </label>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {ARTS_ORDER.map((a) => (
            <button
              key={a}
              onClick={() =>
                onChange({
                  ...state,
                  art: a,
                  icon:
                    state.icon &&
                    state.icon !== ART_DEFAULT_ICON[state.art]
                      ? state.icon
                      : ART_DEFAULT_ICON[a],
                })
              }
              className={`rounded-lg border px-3 py-1.5 text-xs cursor-pointer ${
                state.art === a
                  ? "border-fg bg-fg text-fg-inverse"
                  : "border-border bg-surface text-fg-muted hover:text-fg"
              }`}
            >
              {ART_LABELS[a]}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-xs text-fg-muted">Farbe</label>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => onChange({ ...state, color: c })}
              className={`h-7 w-7 rounded-md cursor-pointer ${
                state.color === c ? "ring-2 ring-fg ring-offset-2 ring-offset-bg" : ""
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-xs text-fg-muted">Bank / CSV-Format</label>
        <select
          value={state.bank}
          onChange={(e) => onChange({ ...state, bank: e.target.value })}
          className="w-full rounded-lg border border-border-strong bg-surface-active px-3 py-2 text-sm text-fg"
        >
          <option value="">— keine Vorbelegung —</option>
          {bankPresets
            .filter((p) => p.name !== "Benutzerdefiniert")
            .map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
        </select>
        <p className="mt-1 text-xs text-fg-subtle">
          Beim Upload an diese Gruppe wird das passende Bank-Mapping automatisch gewählt.
        </p>
      </div>
      <div>
        <label className="mb-1.5 block text-xs text-fg-muted">Icon</label>
        <div className="grid grid-cols-10 gap-1.5">
          {ICON_KEYS.map((key) => {
            const Icon = getIcon(key);
            const active = state.icon === key;
            return (
              <button
                key={key}
                onClick={() => onChange({ ...state, icon: key })}
                className={`flex h-8 w-8 items-center justify-center rounded-md border cursor-pointer ${
                  active
                    ? "border-brand bg-brand-soft"
                    : "border-border-strong bg-bg-muted hover:border-border-strong"
                }`}
                style={active ? { color: state.color } : { color: "#94A3B8" }}
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AnchorEditor({
  kg,
  onClose,
  onSaved,
}: {
  kg: Kontogruppe;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [date, setDate] = useState(
    kg.anchorDate ?? new Date().toISOString().slice(0, 10)
  );
  const [value, setValue] = useState(
    kg.anchorValue != null ? formatGermanAmount(kg.anchorValue) : ""
  );
  const [busy, setBusy] = useState(false);

  async function save() {
    const v = parseGermanNumber(value);
    if (v === null || !date) return;
    setBusy(true);
    await fetch(`/api/kontogruppen/${kg.id}/anchor`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ date, value: v }),
    });
    setBusy(false);
    onSaved();
    onClose();
  }

  async function clear() {
    setBusy(true);
    await fetch(`/api/kontogruppen/${kg.id}/anchor`, { method: "DELETE" });
    setBusy(false);
    onSaved();
    onClose();
  }

  return (
    <div className="space-y-2 border-t border-border px-3 py-3">
      <p className="text-xs text-fg-muted">
        Bekannter Kontostand zu einem Stichtag. Der Saldo-Verlauf für die
        Vermögensübersicht wird daraus rück- und vorwärts aus den Buchungen
        berechnet — nützlich, wenn die CSV keinen Saldo liefert.
      </p>
      <div className="flex flex-wrap items-center gap-2">
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
          placeholder="Kontostand in EUR"
          className="w-40 rounded border border-border bg-bg px-2 py-1 text-xs text-fg"
        />
        <button
          onClick={save}
          disabled={busy}
          className="rounded bg-brand px-3 py-1 text-xs font-medium text-brand-fg hover:opacity-90 disabled:opacity-50"
        >
          Speichern
        </button>
        {kg.anchorDate && (
          <button
            onClick={clear}
            disabled={busy}
            className="rounded border border-border px-3 py-1 text-xs text-fg-muted hover:text-danger"
          >
            Anker entfernen
          </button>
        )}
        <button
          onClick={onClose}
          className="rounded border border-border px-3 py-1 text-xs text-fg-muted hover:text-fg"
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
}

export default function KontogruppenManager({
  kontogruppen,
  inhaber,
  onChange,
}: KontogruppenManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [anchorEditId, setAnchorEditId] = useState<number | null>(null);
  const defaultInhaberId: number | "" = inhaber[0]?.id ?? "";
  const [form, setForm] = useState<FormState>({
    name: "",
    inhaberId: defaultInhaberId,
    art: "girokonto",
    color: PRESET_COLORS[0],
    icon: ART_DEFAULT_ICON["girokonto"],
    bank: "",
  });

  const grouped = useMemo(() => {
    const byInhaber = new Map<number, Kontogruppe[]>();
    for (const kg of kontogruppen) {
      const list = byInhaber.get(kg.inhaberId) ?? [];
      list.push(kg);
      byInhaber.set(kg.inhaberId, list);
    }
    return inhaber.map((i) => ({
      inhaber: i,
      kontogruppen: byInhaber.get(i.id) ?? [],
    }));
  }, [kontogruppen, inhaber]);

  const resetForm = () => {
    setForm({
      name: "",
      inhaberId: inhaber[0]?.id ?? "",
      art: "girokonto",
      color: PRESET_COLORS[0],
      icon: ART_DEFAULT_ICON["girokonto"],
      bank: "",
    });
    setShowForm(false);
    setEditingId(null);
  };

  const handleCreate = async () => {
    if (!form.name.trim() || form.inhaberId === "") return;
    await fetch("/api/kontogruppen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name.trim(),
        inhaberId: form.inhaberId,
        art: form.art,
        color: form.color,
        icon: form.icon,
        bank: form.bank || null,
      }),
    });
    resetForm();
    onChange();
  };

  const handleUpdate = async () => {
    if (!editingId || !form.name.trim() || form.inhaberId === "") return;
    await fetch(`/api/kontogruppen/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name.trim(),
        inhaberId: form.inhaberId,
        art: form.art,
        color: form.color,
        icon: form.icon,
        bank: form.bank || null,
      }),
    });
    resetForm();
    onChange();
  };

  const handleEdit = (kg: Kontogruppe) => {
    setForm({
      name: kg.name,
      inhaberId: kg.inhaberId,
      art: kg.art,
      color: kg.color,
      icon: kg.icon,
      bank: kg.bank ?? "",
    });
    setEditingId(kg.id);
    setShowForm(false);
  };

  const handleAddForInhaber = (inhaberId: number) => {
    setForm({
      name: "",
      inhaberId,
      art: "girokonto",
      color: PRESET_COLORS[0],
      icon: ART_DEFAULT_ICON["girokonto"],
      bank: "",
    });
    setEditingId(null);
    setShowForm(true);
  };

  const handleReorder = async (inhaberId: number, newOrder: Kontogruppe[]) => {
    // Beim Reorder innerhalb eines Inhabers: globale sort_order so setzen, dass
    // diese Kontogruppen in der neuen Reihenfolge stehen; Konten anderer Inhaber
    // bleiben unverändert.
    const others = kontogruppen.filter((k) => k.inhaberId !== inhaberId);
    const ids = [...others.map((k) => k.id), ...newOrder.map((k) => k.id)];
    await fetch("/api/kontogruppen-reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    onChange();
  };

  const handleDelete = async (id: number) => {
    if (
      !confirm(
        "Kontogruppe löschen? Transaktionen bleiben erhalten, werden aber nicht mehr zugeordnet."
      )
    )
      return;
    await fetch(`/api/kontogruppen/${id}`, { method: "DELETE" });
    onChange();
  };

  return (
    <div className="rounded-2xl border border-border bg-surface">
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-info-soft p-2">
            <Users className="h-5 w-5 text-info" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-fg">
              Kontogruppen
            </h3>
            <p className="text-xs text-fg-subtle">
              Konkrete Konten (Giro, Kreditkarte, Depot…) je Inhaber. Wird
              beim CSV-Import als Upload-Ziel angeboten.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-5 px-5 py-4">
        {inhaber.length === 0 && (
          <p className="rounded-lg border border-warn bg-warn-soft px-3 py-2 text-xs text-warn">
            Erst Inhaber anlegen (Sektion darüber), dann können hier
            Kontogruppen zugeordnet werden.
          </p>
        )}

        {grouped.map(({ inhaber: i, kontogruppen: kgs }) => (
          <div key={i.id} className="space-y-2">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: i.color }}
                />
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-fg-faint">
                  {i.name}
                </span>
                <span className="text-[11px] text-fg-faint">
                  · {kgs.length} Konto{kgs.length === 1 ? "" : "s"}
                </span>
              </div>
              <button
                onClick={() => handleAddForInhaber(i.id)}
                className="flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] text-fg-muted hover:border-border-strong hover:text-fg cursor-pointer"
              >
                <Plus className="h-3 w-3" />
                Konto
              </button>
            </div>

            {kgs.length === 0 && (
              <p className="px-1 text-xs italic text-fg-subtle">
                noch keine Konten für diesen Inhaber
              </p>
            )}

            <SortableList
              items={kgs}
              onReorder={(newOrder) => handleReorder(i.id, newOrder)}
              renderItem={(kg, handle) => {
                const Icon = getIcon(kg.icon);
                const isEditing = editingId === kg.id;
                return (
                  <div className="mb-2 rounded-lg border border-border bg-bg-muted">
                    <div className="flex items-center justify-between px-1 py-2">
                      <div className="flex items-center gap-2">
                        <DragHandle {...handle} />
                        <div
                          className="rounded-md p-1.5"
                          style={{ backgroundColor: kg.color + "33" }}
                        >
                          <Icon
                            className="h-4 w-4"
                            style={{ color: kg.color }}
                          />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-fg">{kg.name}</p>
                          <p className="text-xs text-fg-subtle">
                            {ART_LABELS[kg.art]}
                            {kg.bank ? ` · ${kg.bank}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 pr-2">
                        {!isEditing && (
                          <>
                            <button
                              onClick={() =>
                                setAnchorEditId(
                                  anchorEditId === kg.id ? null : kg.id
                                )
                              }
                              className={`rounded p-1.5 cursor-pointer hover:bg-surface-active ${
                                kg.anchorDate
                                  ? "text-brand"
                                  : "text-fg-subtle hover:text-brand"
                              }`}
                              title={
                                kg.anchorDate
                                  ? "Anker-Wert gesetzt — bearbeiten"
                                  : "Anker-Wert für Saldo-Rekonstruktion setzen"
                              }
                            >
                              <Anchor className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleEdit(kg)}
                              className="rounded p-1.5 text-fg-subtle hover:bg-surface-active hover:text-brand cursor-pointer"
                              title="Bearbeiten"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDelete(kg.id)}
                          className="rounded p-1.5 text-fg-subtle hover:bg-surface-active hover:text-danger cursor-pointer"
                          title="Löschen"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {anchorEditId === kg.id && !isEditing && (
                      <AnchorEditor
                        kg={kg}
                        onClose={() => setAnchorEditId(null)}
                        onSaved={onChange}
                      />
                    )}

                    {isEditing && (
                      <div className="border-t border-border px-3 py-3 space-y-3">
                        <FormFields state={form} onChange={setForm} inhaber={inhaber} />
                        <div className="flex gap-2">
                          <button
                            onClick={resetForm}
                            className="flex-1 rounded-lg border border-border-strong px-3 py-2 text-xs font-medium text-fg-soft hover:bg-surface-active cursor-pointer"
                          >
                            Abbrechen
                          </button>
                          <button
                            onClick={handleUpdate}
                            disabled={!form.name.trim() || form.inhaberId === ""}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-xs font-medium text-brand-fg hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Speichern
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              }}
            />
          </div>
        ))}

        {showForm && (
          <div className="space-y-3 rounded-lg border border-brand bg-brand-soft p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-fg-soft">
                Neue Kontogruppe
              </span>
              <button
                onClick={resetForm}
                className="text-fg-subtle hover:text-fg-soft cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <FormFields state={form} onChange={setForm} inhaber={inhaber} />
            <button
              onClick={handleCreate}
              disabled={!form.name.trim() || form.inhaberId === ""}
              className="w-full rounded-lg bg-brand px-3 py-2 text-sm font-medium text-brand-fg hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              Anlegen
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
