"use client";

import { useCallback, useEffect, useState } from "react";
import { Trash2, Plus } from "lucide-react";
import { Tag } from "../lib/types";

const DEFAULT_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#6b7280",
];

export default function TagManager() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(DEFAULT_COLORS[0]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/tags");
    const json = await res.json();
    setTags(json.tags as Tag[]);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initialer Fetch der Tag-Liste
    void load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const name = newName.trim();
    if (!name) return;
    const res = await fetch("/api/tags", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, color: newColor }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error || "Anlegen fehlgeschlagen");
      return;
    }
    setNewName("");
    await load();
  }

  async function handleDelete(id: number) {
    if (!confirm("Tag löschen? Verknüpfungen zu Transaktionen werden entfernt.")) {
      return;
    }
    await fetch(`/api/tags/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <section className="space-y-4">
      <header>
        <h2 className="font-editorial text-xl text-fg">Tags</h2>
        <p className="text-sm text-fg-muted">
          Frei vergebbare Labels quer zu Kategorien — z.&nbsp;B. &bdquo;urlaub-2025&ldquo;,
          &bdquo;renovierung&ldquo;.
        </p>
      </header>

      <form onSubmit={handleCreate} className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Neuer Tag…"
          maxLength={32}
          className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-fg outline-none focus:border-fg"
        />
        <div className="flex gap-1">
          {DEFAULT_COLORS.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => setNewColor(c)}
              aria-label={`Farbe ${c}`}
              className={`h-6 w-6 rounded-full border-2 ${
                newColor === c ? "border-fg" : "border-transparent"
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <button
          type="submit"
          className="flex items-center gap-1 rounded-md border border-border bg-fg px-3 py-1.5 text-sm font-medium text-fg-inverse hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" />
          Anlegen
        </button>
      </form>

      {error && (
        <div className="rounded border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-500">
          {error}
        </div>
      )}

      {tags.length === 0 ? (
        <div className="text-sm text-fg-muted">Noch keine Tags angelegt.</div>
      ) : (
        <ul className="space-y-1">
          {tags.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between rounded border border-border bg-surface px-3 py-2"
            >
              <span
                className="inline-flex items-center gap-2 rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{
                  backgroundColor: `${t.color}22`,
                  color: t.color,
                  border: `1px solid ${t.color}66`,
                }}
              >
                {t.name}
              </span>
              <button
                onClick={() => handleDelete(t.id)}
                aria-label="Tag löschen"
                className="text-fg-muted hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
