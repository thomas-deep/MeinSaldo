"use client";

import { useState } from "react";
import { Plus, Trash2, Users, X, Pencil, Check } from "lucide-react";
import { Kontogruppe, KontogruppeType } from "../lib/types";
import { ICON_KEYS, getIcon } from "../lib/icons";
import { bankPresets } from "../lib/field-mapping";

interface KontogruppenManagerProps {
  kontogruppen: Kontogruppe[];
  onChange: () => void;
}

const TYPE_LABELS: Record<KontogruppeType, string> = {
  privat: "Privat",
  gemeinsam: "Gemeinsam",
  firma: "Firma",
  kreditkarte: "Kreditkarte",
};

const TYPE_DEFAULT_ICON: Record<KontogruppeType, string> = {
  privat: "user",
  gemeinsam: "users",
  firma: "briefcase",
  kreditkarte: "creditcard",
};

const TYPES_ORDER: KontogruppeType[] = ["privat", "gemeinsam", "firma", "kreditkarte"];

const PRESET_COLORS = [
  "#3B82F6", "#10B981", "#F59E0B", "#EC4899", "#8B5CF6",
  "#06B6D4", "#F97316", "#14B8A6", "#6366F1", "#84CC16",
  "#EF4444", "#A855F7",
];

interface FormState {
  name: string;
  type: KontogruppeType;
  color: string;
  icon: string;
  bank: string;
}

function FormFields({
  state,
  onChange,
}: {
  state: FormState;
  onChange: (s: FormState) => void;
}) {
  return (
    <div className="space-y-3">
      <input
        type="text"
        placeholder='z.B. "Privat", "Gemeinsam", "Firma A"'
        value={state.name}
        onChange={(e) => onChange({ ...state, name: e.target.value })}
        className="w-full rounded-lg border border-border-strong bg-surface-active px-3 py-2 text-sm text-fg placeholder:text-fg-subtle"
        autoFocus
      />
      <div>
        <label className="mb-1.5 block text-xs text-fg-muted">Typ</label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TYPES_ORDER.map((t) => (
            <button
              key={t}
              onClick={() =>
                onChange({
                  ...state,
                  type: t,
                  icon:
                    ICON_KEYS.includes(state.icon) &&
                    state.icon !== TYPE_DEFAULT_ICON[state.type]
                      ? state.icon
                      : TYPE_DEFAULT_ICON[t],
                })
              }
              className={`rounded-lg border px-3 py-1.5 text-xs cursor-pointer ${
                state.type === t
                  ? "border-brand bg-brand-soft text-brand"
                  : "border-border-strong bg-bg-muted text-fg-muted"
              }`}
            >
              {TYPE_LABELS[t]}
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

export default function KontogruppenManager({
  kontogruppen,
  onChange,
}: KontogruppenManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>({
    name: "",
    type: "privat",
    color: PRESET_COLORS[0],
    icon: "user",
    bank: "",
  });

  const resetForm = () => {
    setForm({ name: "", type: "privat", color: PRESET_COLORS[0], icon: "user", bank: "" });
    setShowForm(false);
    setEditingId(null);
  };

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    await fetch("/api/kontogruppen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name.trim(),
        type: form.type,
        color: form.color,
        icon: form.icon,
        bank: form.bank || null,
      }),
    });
    resetForm();
    onChange();
  };

  const handleUpdate = async () => {
    if (!editingId || !form.name.trim()) return;
    await fetch(`/api/kontogruppen/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name.trim(),
        type: form.type,
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
      type: kg.type,
      color: kg.color,
      icon: kg.icon,
      bank: kg.bank ?? "",
    });
    setEditingId(kg.id);
    setShowForm(false);
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
              Kontoinhaber &amp; Kontogruppen
            </h3>
            <p className="text-xs text-fg-subtle">
              Konten organisieren — z. B. nach Inhaber, Verwendung oder
              Kartentyp. Wird beim CSV-Import als Upload-Ziel angeboten.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3 px-5 py-4">
        {kontogruppen.length === 0 && !showForm && (
            <p className="text-xs text-fg-subtle">
              Noch keine Kontogruppen angelegt. Lege eine an, um Uploads zuordnen zu können.
            </p>
          )}

          {kontogruppen.map((kg) => {
            const Icon = getIcon(kg.icon);
            const isEditing = editingId === kg.id;
            return (
              <div
                key={kg.id}
                className="rounded-lg border border-border bg-bg-muted"
              >
                <div className="flex items-center justify-between px-3 py-2">
                  <div className="flex items-center gap-3">
                    <div
                      className="rounded-md p-1.5"
                      style={{ backgroundColor: kg.color + "33" }}
                    >
                      <Icon className="h-4 w-4" style={{ color: kg.color }} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-fg">{kg.name}</p>
                      <p className="text-xs text-fg-subtle">
                        {TYPE_LABELS[kg.type]}
                        {kg.bank ? ` · ${kg.bank}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!isEditing && (
                      <button
                        onClick={() => handleEdit(kg)}
                        className="rounded p-1.5 text-fg-subtle hover:bg-surface-active hover:text-brand cursor-pointer"
                        title="Bearbeiten"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
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

                {isEditing && (
                  <div className="border-t border-border px-3 py-3 space-y-3">
                    <FormFields state={form} onChange={setForm} />
                    <div className="flex gap-2">
                      <button
                        onClick={resetForm}
                        className="flex-1 rounded-lg border border-border-strong px-3 py-2 text-xs font-medium text-fg-soft hover:bg-surface-active cursor-pointer"
                      >
                        Abbrechen
                      </button>
                      <button
                        onClick={handleUpdate}
                        disabled={!form.name.trim()}
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
          })}

          {showForm ? (
            <div className="space-y-3 rounded-lg border border-border bg-bg-muted p-3">
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
              <FormFields state={form} onChange={setForm} />
              <button
                onClick={handleCreate}
                disabled={!form.name.trim()}
                className="w-full rounded-lg bg-brand px-3 py-2 text-sm font-medium text-brand-fg hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              >
                Anlegen
              </button>
            </div>
          ) : (
            !editingId && (
              <button
                onClick={() => {
                  setForm({
                    name: "",
                    type: "privat",
                    color: PRESET_COLORS[0],
                    icon: "user",
                    bank: "",
                  });
                  setShowForm(true);
                }}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border-strong px-3 py-2 text-xs font-medium text-fg-muted hover:border-brand hover:text-brand cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Kontogruppe anlegen
              </button>
            )
          )}
      </div>
    </div>
  );
}
