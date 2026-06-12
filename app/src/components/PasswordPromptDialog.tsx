"use client";

import { useEffect, useState } from "react";
import { KeyRound } from "lucide-react";

interface Props {
  open: boolean;
  title: string;
  message?: string;
  error?: string | null;
  busy?: boolean;
  confirmLabel?: string;
  onSubmit: (password: string) => void;
  onCancel: () => void;
}

/**
 * Kleiner Modal-Dialog zur Passwort-Eingabe — z.B. beim Wiederherstellen einer
 * verschlüsselten Sicherung. Hält das Eingabefeld selbst, setzt es bei jedem
 * Öffnen zurück.
 */
export default function PasswordPromptDialog({
  open,
  title,
  message,
  error,
  busy = false,
  confirmLabel = "Wiederherstellen",
  onSubmit,
  onCancel,
}: Props) {
  // Wird beim Öffnen über einen wechselnden `key` im Parent frisch gemountet,
  // sodass das Feld pro Öffnen leer startet (bei falschem Passwort bleibt die
  // Instanz erhalten → Eingabe bleibt stehen).
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  if (!open) return null;

  const submit = () => {
    if (busy || password.length === 0) return;
    onSubmit(password);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-sm rounded-2xl border border-border bg-surface p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-bg-muted p-2">
            <KeyRound className="h-5 w-5 text-fg-muted" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-fg">{title}</h3>
            {message && <p className="mt-1 text-sm text-fg-muted">{message}</p>}
          </div>
        </div>

        <input
          type="password"
          autoFocus
          value={password}
          disabled={busy}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder="Passwort"
          className="mt-4 w-full rounded-lg border border-border-strong bg-surface-active px-3 py-2 text-sm text-fg placeholder:text-fg-subtle"
        />

        {error && <p className="mt-2 text-xs text-danger">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-fg-muted hover:text-fg"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy || password.length === 0}
            className="rounded-lg bg-fg px-3 py-1.5 text-sm font-medium text-fg-inverse hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
