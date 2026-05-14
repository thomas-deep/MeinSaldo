"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Tag,
  Plus,
  Trash2,
  X,
  Loader2,
  Save,
  RefreshCw,
} from "lucide-react";

interface KategorieRule {
  id: number;
  name: string;
  ruleOrder: number;
  keywords: string[];
  namePatterns: string[];
  isFallback: boolean;
}

interface KategorienResponse {
  kategorien: KategorieRule[];
}

interface DraftRule {
  name: string;
  keywords: string[];
  namePatterns: string[];
}

function ChipList({
  items,
  onRemove,
  className,
}: {
  items: string[];
  onRemove: (idx: number) => void;
  className?: string;
}) {
  if (items.length === 0) {
    return (
      <p className="text-xs italic text-fg-subtle">noch keine Einträge</p>
    );
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((v, i) => (
        <span
          key={`${v}-${i}`}
          className={`group inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs ${
            className ?? "bg-bg-muted text-fg-soft"
          }`}
        >
          {v}
          <button
            onClick={() => onRemove(i)}
            className="ml-0.5 opacity-50 hover:opacity-100 cursor-pointer"
            title="Eintrag entfernen"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
    </div>
  );
}

function AddChipInput({
  placeholder,
  onAdd,
}: {
  placeholder: string;
  onAdd: (value: string) => void;
}) {
  const [value, setValue] = useState("");
  const submit = () => {
    const v = value.trim();
    if (!v) return;
    onAdd(v);
    setValue("");
  };
  return (
    <div className="flex items-center gap-1.5">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={placeholder}
        className="flex-1 rounded border border-border-strong bg-surface-active px-2 py-1 text-xs text-fg placeholder:text-fg-subtle"
      />
      <button
        onClick={submit}
        disabled={!value.trim()}
        className="flex items-center gap-1 rounded border border-border-strong px-2 py-1 text-xs text-fg-soft hover:border-border-strong disabled:opacity-40 cursor-pointer"
      >
        <Plus className="h-3 w-3" />
        Hinzufügen
      </button>
    </div>
  );
}

interface RuleEditorProps {
  rule: KategorieRule;
  onSave: (id: number, draft: DraftRule) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

function RuleEditor({ rule, onSave, onDelete }: RuleEditorProps) {
  const [draft, setDraft] = useState<DraftRule>({
    name: rule.name,
    keywords: [...rule.keywords],
    namePatterns: [...rule.namePatterns],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Editor-Reset bei externem Rule-Wechsel
    setDraft({
      name: rule.name,
      keywords: [...rule.keywords],
      namePatterns: [...rule.namePatterns],
    });
  }, [rule]);

  const dirty =
    draft.name !== rule.name ||
    JSON.stringify(draft.keywords) !== JSON.stringify(rule.keywords) ||
    JSON.stringify(draft.namePatterns) !== JSON.stringify(rule.namePatterns);

  const handleSave = async () => {
    if (!dirty) return;
    setSaving(true);
    try {
      await onSave(rule.id, draft);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 bg-bg-muted px-5 py-4">
      {!rule.isFallback && (
        <div>
          <label className="mb-1 block text-xs font-medium text-fg-muted">
            Name
          </label>
          <input
            type="text"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            className="w-full max-w-md rounded border border-border-strong bg-surface-active px-2 py-1 text-sm text-fg"
          />
        </div>
      )}

      {!rule.isFallback && (
        <>
          <div>
            <p className="mb-1.5 text-xs font-medium text-fg-muted">
              Keywords (Treffer im Verwendungszweck/Namen/Buchungstext, case-insensitive)
            </p>
            <ChipList
              items={draft.keywords}
              onRemove={(i) =>
                setDraft({
                  ...draft,
                  keywords: draft.keywords.filter((_, idx) => idx !== i),
                })
              }
            />
            <div className="mt-2">
              <AddChipInput
                placeholder="z. B. miete, lebensmittel, abo"
                onAdd={(v) =>
                  setDraft({ ...draft, keywords: [...draft.keywords, v] })
                }
              />
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium text-fg-muted">
              Namens-Patterns (Treffer im Empfänger/Sender)
            </p>
            <ChipList
              items={draft.namePatterns}
              onRemove={(i) =>
                setDraft({
                  ...draft,
                  namePatterns: draft.namePatterns.filter(
                    (_, idx) => idx !== i
                  ),
                })
              }
              className="bg-brand-soft text-brand"
            />
            <div className="mt-2">
              <AddChipInput
                placeholder="z. B. edeka, telekom, allianz"
                onAdd={(v) =>
                  setDraft({
                    ...draft,
                    namePatterns: [...draft.namePatterns, v],
                  })
                }
              />
            </div>
          </div>
        </>
      )}

      {rule.isFallback && (
        <p className="text-xs italic text-fg-subtle">
          Fallback-Kategorie. Wird automatisch zugewiesen, wenn keine Regel
          greift — Name und Regeln sind nicht editierbar.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-3">
        {!rule.isFallback && (
          <button
            onClick={() => {
              if (
                confirm(
                  `Kategorie '${rule.name}' wirklich löschen? Zugeordnete Buchungen werden auf 'Sonstiges' gesetzt.`
                )
              ) {
                void onDelete(rule.id);
              }
            }}
            className="flex items-center gap-1.5 rounded-lg border border-danger bg-danger-soft px-2.5 py-1.5 text-xs text-danger hover:bg-danger-soft cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Löschen
          </button>
        )}
        <div className="flex-1" />
        <button
          onClick={handleSave}
          disabled={!dirty || saving || rule.isFallback}
          className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-brand-fg hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          Speichern
        </button>
      </div>
    </div>
  );
}

export default function CategoriesView() {
  const [rules, setRules] = useState<KategorieRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newDraft, setNewDraft] = useState<DraftRule>({
    name: "",
    keywords: [],
    namePatterns: [],
  });
  const [creating, setCreating] = useState(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const res = await fetch("/api/kategorien", { signal });
      const json = (await res.json()) as KategorienResponse;
      if (signal?.aborted) return;
      setRules(json.kategorien);
    } catch (e) {
      if ((e as { name?: string })?.name !== "AbortError") {
        console.error("Kategorien load failed:", e);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch on mount mit Abort-Cleanup
    load(ctrl.signal);
    return () => ctrl.abort();
  }, [load]);

  const handleSaveRule = useCallback(
    async (id: number, draft: DraftRule) => {
      const res = await fetch(`/api/kategorien/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name,
          keywords: draft.keywords,
          namePatterns: draft.namePatterns,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(`Fehler: ${err.error ?? res.statusText}`);
        return;
      }
      await load();
    },
    [load]
  );

  const handleDeleteRule = useCallback(
    async (id: number) => {
      const res = await fetch(`/api/kategorien/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(`Fehler: ${err.error ?? res.statusText}`);
        return;
      }
      await load();
    },
    [load]
  );

  const handleCreate = useCallback(async () => {
    if (!newDraft.name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/kategorien", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newDraft),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(`Fehler: ${err.error ?? res.statusText}`);
        return;
      }
      setNewDraft({ name: "", keywords: [], namePatterns: [] });
      setShowNewForm(false);
      await load();
    } finally {
      setCreating(false);
    }
  }, [newDraft, load]);

  return (
    <div className="rounded-xl border border-border bg-surface">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
        <Tag className="h-5 w-5 text-fg-muted" />
        <div>
          <h3 className="text-sm font-medium text-fg">
            Kategorisierungs-Regeln ({rules.length})
          </h3>
          <p className="text-xs text-fg-subtle">
            Regeln werden auf Verwendungszweck, Zahlungsbeteiligten und
            Buchungstext angewendet (case-insensitive). Reihenfolge entscheidet:
            erste passende Regel gewinnt.
          </p>
        </div>
        <div className="flex-1" />
        <button
          onClick={() => load()}
          className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-fg-soft hover:border-border-strong cursor-pointer"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
          />
          Aktualisieren
        </button>
        <button
          onClick={() => setShowNewForm((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-brand-fg hover:opacity-90 cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          Neue Kategorie
        </button>
      </div>

      {showNewForm && (
        <div className="space-y-3 border-b border-border bg-brand-soft px-5 py-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-fg-muted">
              Name
            </label>
            <input
              type="text"
              value={newDraft.name}
              onChange={(e) =>
                setNewDraft({ ...newDraft, name: e.target.value })
              }
              placeholder="z. B. Hobby & Freizeit"
              className="w-full max-w-md rounded border border-border-strong bg-surface-active px-2 py-1 text-sm text-fg placeholder:text-fg-subtle"
            />
          </div>
          <div>
            <p className="mb-1.5 text-xs font-medium text-fg-muted">
              Keywords
            </p>
            <ChipList
              items={newDraft.keywords}
              onRemove={(i) =>
                setNewDraft({
                  ...newDraft,
                  keywords: newDraft.keywords.filter((_, idx) => idx !== i),
                })
              }
            />
            <div className="mt-2">
              <AddChipInput
                placeholder="z. B. kletterhalle, sauna"
                onAdd={(v) =>
                  setNewDraft({
                    ...newDraft,
                    keywords: [...newDraft.keywords, v],
                  })
                }
              />
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-medium text-fg-muted">
              Namens-Patterns
            </p>
            <ChipList
              items={newDraft.namePatterns}
              onRemove={(i) =>
                setNewDraft({
                  ...newDraft,
                  namePatterns: newDraft.namePatterns.filter(
                    (_, idx) => idx !== i
                  ),
                })
              }
              className="bg-brand-soft text-brand"
            />
            <div className="mt-2">
              <AddChipInput
                placeholder="z. B. boulderhalle berlin"
                onAdd={(v) =>
                  setNewDraft({
                    ...newDraft,
                    namePatterns: [...newDraft.namePatterns, v],
                  })
                }
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => {
                setShowNewForm(false);
                setNewDraft({ name: "", keywords: [], namePatterns: [] });
              }}
              className="rounded-lg border border-border px-3 py-1.5 text-xs text-fg-soft hover:border-border-strong cursor-pointer"
            >
              Abbrechen
            </button>
            <button
              onClick={handleCreate}
              disabled={!newDraft.name.trim() || creating}
              className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-brand-fg hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              {creating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Kategorie anlegen
            </button>
          </div>
        </div>
      )}

      <div className="divide-y divide-border">
        {rules.length === 0 && !loading && (
          <p className="py-8 text-center text-sm text-fg-subtle">
            Noch keine Kategorien
          </p>
        )}
        {rules.map((rule) => {
          const isOpen = expanded === rule.id;
          const total = rule.keywords.length + rule.namePatterns.length;
          return (
            <div key={rule.id}>
              <button
                onClick={() => setExpanded(isOpen ? null : rule.id)}
                className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-surface-hover cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-fg-subtle" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-fg-subtle" />
                  )}
                  <span className="text-sm font-medium text-fg">
                    {rule.name}
                  </span>
                  {rule.isFallback && (
                    <span className="rounded bg-bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-fg-muted">
                      Fallback
                    </span>
                  )}
                </div>
                <span className="text-xs text-fg-subtle">
                  {rule.isFallback ? "—" : `${total} Einträge`}
                </span>
              </button>
              {isOpen && (
                <RuleEditor
                  rule={rule}
                  onSave={handleSaveRule}
                  onDelete={handleDeleteRule}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
