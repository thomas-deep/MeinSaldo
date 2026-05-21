"use client";

import { useCallback, useState } from "react";
import { Plus, Trash2, Pencil, X, Check, UserRound } from "lucide-react";
import { Inhaber, InhaberType } from "../lib/types";
import SortableList, { DragHandle } from "./SortableList";

const TYPE_LABELS: Record<InhaberType, string> = {
  privat: "Privat",
  gemeinsam: "Gemeinsam",
  firma: "Firma",
};

const TYPES_ORDER: InhaberType[] = ["privat", "gemeinsam", "firma"];

const PRESET_COLORS = [
  "#3B82F6", "#10B981", "#F59E0B", "#EC4899", "#8B5CF6",
  "#06B6D4", "#F97316", "#14B8A6", "#6366F1", "#84CC16",
  "#EF4444", "#A855F7",
];

interface Props {
  inhaber: Inhaber[];
  onChange: () => void;
}

interface FormState {
  name: string;
  type: InhaberType;
  color: string;
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
        value={state.name}
        onChange={(e) => onChange({ ...state, name: e.target.value })}
        placeholder='z. B. "Thomas", "Gemeinsam", "Firma X"'
        className="w-full rounded-lg border border-border-strong bg-surface-active px-3 py-2 text-sm text-fg placeholder:text-fg-subtle"
        autoFocus
      />
      <div>
        <label className="mb-1.5 block text-xs text-fg-muted">
          Typ <span className="text-fg-faint">— wem gehört&apos;s</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {TYPES_ORDER.map((t) => (
            <button
              key={t}
              onClick={() => onChange({ ...state, type: t })}
              className={`rounded-lg border px-3 py-1.5 text-xs cursor-pointer ${
                state.type === t
                  ? "border-fg bg-fg text-fg-inverse"
                  : "border-border bg-surface text-fg-muted hover:text-fg"
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
                state.color === c
                  ? "ring-2 ring-fg ring-offset-2 ring-offset-bg"
                  : ""
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function InhaberManager({ inhaber, onChange }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>({
    name: "",
    type: "privat",
    color: PRESET_COLORS[0],
  });
  const [error, setError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setForm({ name: "", type: "privat", color: PRESET_COLORS[0] });
    setShowForm(false);
    setEditingId(null);
    setError(null);
  }, []);

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    const res = await fetch("/api/inhaber", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name.trim(),
        type: form.type,
        color: form.color,
      }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      setError(e.error ?? "Fehler beim Anlegen");
      return;
    }
    resetForm();
    onChange();
  };

  const handleUpdate = async () => {
    if (!editingId || !form.name.trim()) return;
    await fetch(`/api/inhaber/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name.trim(),
        type: form.type,
        color: form.color,
      }),
    });
    resetForm();
    onChange();
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Inhaber „${name}" löschen?`)) return;
    const res = await fetch(`/api/inhaber/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      alert(e.error ?? "Löschen fehlgeschlagen");
      return;
    }
    onChange();
  };

  const handleReorder = async (newOrder: Inhaber[]) => {
    const ids = newOrder.map((i) => i.id);
    await fetch("/api/inhaber-reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    onChange();
  };

  const handleEdit = (i: Inhaber) => {
    setForm({ name: i.name, type: i.type, color: i.color });
    setEditingId(i.id);
    setShowForm(false);
    setError(null);
  };

  return (
    <div className="rounded-2xl border border-border bg-surface">
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-brand-soft p-2">
            <UserRound className="h-5 w-5 text-brand" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-fg">Inhaber</h3>
            <p className="text-xs text-fg-subtle">
              Personen oder Organisationen, denen Konten zugeordnet werden.
              Einem Inhaber können mehrere Kontogruppen (Giro, Kreditkarte,
              Depot…) gehören.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3 px-5 py-4">
        {inhaber.length === 0 && !showForm && (
          <p className="text-xs text-fg-subtle">
            Noch keine Inhaber angelegt — Kontogruppen brauchen einen Inhaber.
          </p>
        )}

        <SortableList
          items={inhaber}
          onReorder={handleReorder}
          renderItem={(i, handle) => {
            const isEditing = editingId === i.id;
            return (
              <div className="mb-3 rounded-lg border border-border bg-bg-muted">
                <div className="flex items-center justify-between px-1 py-2">
                  <div className="flex items-center gap-2">
                    <DragHandle {...handle} />
                    <div
                      className="h-8 w-8 rounded-md flex items-center justify-center"
                      style={{ backgroundColor: i.color + "33" }}
                    >
                      <UserRound
                        className="h-4 w-4"
                        style={{ color: i.color }}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-fg">{i.name}</p>
                      <p className="text-xs text-fg-subtle">
                        {TYPE_LABELS[i.type]}
                      </p>
                    </div>
                  </div>
                  {!isEditing && (
                    <div className="flex items-center gap-1 pr-2">
                      <button
                        onClick={() => handleEdit(i)}
                        className="rounded p-1.5 text-fg-muted hover:bg-surface hover:text-fg cursor-pointer"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(i.id, i.name)}
                        className="rounded p-1.5 text-fg-muted hover:bg-danger-soft hover:text-danger cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                {isEditing && (
                  <div className="space-y-3 border-t border-border bg-surface px-3 py-3">
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
          }}
        />

        {showForm ? (
          <div className="space-y-3 rounded-lg border border-brand bg-brand-soft p-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-fg">Neuer Inhaber</h4>
              <button
                onClick={resetForm}
                className="rounded p-1 text-fg-muted hover:text-fg cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <FormFields state={form} onChange={setForm} />
            {error && (
              <p className="rounded-md border border-danger/30 bg-danger-soft px-2 py-1 text-xs text-danger">
                {error}
              </p>
            )}
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
                setForm({ name: "", type: "privat", color: PRESET_COLORS[0] });
                setShowForm(true);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border-strong px-3 py-2 text-xs font-medium text-fg-muted hover:border-brand hover:text-brand cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Inhaber anlegen
            </button>
          )
        )}
      </div>
    </div>
  );
}
