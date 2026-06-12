"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Database,
  Download,
  HardDriveDownload,
  Loader2,
  Lock,
  RotateCcw,
  Trash2,
  Upload,
} from "lucide-react";
import Toggle from "./Toggle";
import ConfirmDialog from "./ConfirmDialog";
import PasswordPromptDialog from "./PasswordPromptDialog";

interface BackupInfo {
  name: string;
  size: number;
  createdAt: string;
  encrypted: boolean;
}

type RestoreTarget =
  | { kind: "stored"; name: string; encrypted: boolean }
  | { kind: "upload"; file: File };

interface Notice {
  kind: "ok" | "error";
  text: string;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** Lädt einen Blob als Datei herunter (Dateiname aus Content-Disposition). */
async function triggerBlobDownload(res: Response): Promise<void> {
  const blob = await res.blob();
  const cd = res.headers.get("content-disposition") ?? "";
  const m = /filename="([^"]+)"/.exec(cd);
  const name = m?.[1] ?? "meinsaldo-sicherung";
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function DatabaseBackup() {
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [encrypt, setEncrypt] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const [confirmTarget, setConfirmTarget] = useState<RestoreTarget | null>(null);
  const [pwTarget, setPwTarget] = useState<RestoreTarget | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      const res = await fetch("/api/backups", { signal });
      const json = (await res.json()) as { backups: BackupInfo[] };
      if (signal?.aborted) return;
      setBackups(json.backups ?? []);
    } catch (e) {
      if ((e as { name?: string })?.name !== "AbortError") {
        console.error("Backups laden fehlgeschlagen:", e);
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

  /** Validiert die Verschlüsselungs-Eingaben; gibt das Passwort oder null. */
  const resolvePassword = useCallback((): { ok: boolean; password?: string } => {
    if (!encrypt) return { ok: true, password: undefined };
    if (password.length < 4) {
      setNotice({ kind: "error", text: "Passwort muss mindestens 4 Zeichen haben." });
      return { ok: false };
    }
    if (password !== passwordConfirm) {
      setNotice({ kind: "error", text: "Passwörter stimmen nicht überein." });
      return { ok: false };
    }
    return { ok: true, password };
  }, [encrypt, password, passwordConfirm]);

  const handleCreate = useCallback(
    async (store: boolean) => {
      setNotice(null);
      const pw = resolvePassword();
      if (!pw.ok) return;
      setBusy(store ? "store" : "download");
      try {
        const body = JSON.stringify({ encrypt, password: pw.password });
        if (store) {
          const res = await fetch("/api/backups", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error ?? "Fehler beim Anlegen");
          setNotice({ kind: "ok", text: "Sicherung im Speicher abgelegt." });
          setPassword("");
          setPasswordConfirm("");
          await load();
        } else {
          const res = await fetch("/api/backup-download", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
          });
          if (!res.ok) {
            const json = await res.json();
            throw new Error(json.error ?? "Fehler beim Erzeugen");
          }
          await triggerBlobDownload(res);
          setNotice({ kind: "ok", text: "Sicherung heruntergeladen." });
        }
      } catch (e) {
        setNotice({
          kind: "error",
          text: e instanceof Error ? e.message : "Unbekannter Fehler",
        });
      } finally {
        setBusy(null);
      }
    },
    [encrypt, resolvePassword, load]
  );

  const handleDownloadStored = useCallback((name: string) => {
    const a = document.createElement("a");
    a.href = `/api/backups/${encodeURIComponent(name)}`;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, []);

  const handleDelete = useCallback(
    async (name: string) => {
      if (!confirm(`Sicherung „${name}" löschen?`)) return;
      setNotice(null);
      try {
        const res = await fetch(`/api/backups/${encodeURIComponent(name)}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error ?? "Löschen fehlgeschlagen");
        }
        await load();
      } catch (e) {
        setNotice({
          kind: "error",
          text: e instanceof Error ? e.message : "Unbekannter Fehler",
        });
      }
    },
    [load]
  );

  /** Führt den eigentlichen Restore-Request aus und steuert die Dialoge. */
  const doRestore = useCallback(
    async (target: RestoreTarget, pw: string | undefined) => {
      setNotice(null);
      setBusy("restore");
      try {
        let res: Response;
        if (target.kind === "stored") {
          res = await fetch(
            `/api/backups/${encodeURIComponent(target.name)}/restore`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ password: pw }),
            }
          );
        } else {
          const form = new FormData();
          form.append("file", target.file);
          if (pw) form.append("password", pw);
          res = await fetch("/api/backup-restore-upload", {
            method: "POST",
            body: form,
          });
        }

        if (res.ok) {
          setPwTarget(null);
          setNotice({
            kind: "ok",
            text: "Sicherung eingespielt — App wird neu geladen…",
          });
          setTimeout(() => window.location.reload(), 900);
          return;
        }

        const json = (await res.json()) as { error?: string; code?: string };
        if (json.code === "password_required") {
          setPwError(null);
          setPwTarget(target);
        } else if (json.code === "wrong_password") {
          setPwError("Falsches Passwort.");
          setPwTarget(target);
        } else {
          setPwTarget(null);
          setNotice({ kind: "error", text: json.error ?? "Restore fehlgeschlagen" });
        }
      } catch (e) {
        setPwTarget(null);
        setNotice({
          kind: "error",
          text: e instanceof Error ? e.message : "Unbekannter Fehler",
        });
      } finally {
        setBusy(null);
      }
    },
    []
  );

  const onConfirmRestore = useCallback(() => {
    const target = confirmTarget;
    setConfirmTarget(null);
    if (!target) return;
    if (target.kind === "stored" && target.encrypted) {
      setPwError(null);
      setPwTarget(target);
    } else {
      void doRestore(target, undefined);
    }
  }, [confirmTarget, doRestore]);

  const restoreBusy = busy === "restore";

  return (
    <div className="space-y-6">
      {/* Sicherung erstellen */}
      <div className="rounded-2xl border border-border bg-surface">
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <div className="rounded-lg bg-brand-soft p-2">
            <Database className="h-5 w-5 text-brand" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-fg">Sicherung erstellen</h3>
            <p className="text-xs text-fg-subtle">
              Schreibt die komplette Datenbank (Buchungen, Konten, Kategorien,
              Vermögen, Einstellungen) in eine Datei.
            </p>
          </div>
        </div>

        <div className="space-y-4 px-5 py-4">
          <Toggle
            checked={encrypt}
            onChange={setEncrypt}
            label={<span className="text-sm text-fg">Verschlüsseln</span>}
            hint="AES-256 — ohne Passwort später nicht wiederherstellbar"
          />

          {encrypt && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs text-fg-muted">Passwort</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-border-strong bg-surface-active px-3 py-2 text-sm text-fg"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-fg-muted">
                  Passwort bestätigen
                </label>
                <input
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  className="w-full rounded-lg border border-border-strong bg-surface-active px-3 py-2 text-sm text-fg"
                />
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleCreate(true)}
              disabled={busy !== null}
              className="flex items-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-brand-fg hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              {busy === "store" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <HardDriveDownload className="h-4 w-4" />
              )}
              Im Speicher ablegen
            </button>
            <button
              onClick={() => handleCreate(false)}
              disabled={busy !== null}
              className="flex items-center gap-2 rounded-lg border border-border-strong bg-bg-muted px-3 py-2 text-sm font-medium text-fg hover:border-border-strong hover:text-fg disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              {busy === "download" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Herunterladen
            </button>
          </div>

          {notice && (
            <p
              className={`text-xs ${
                notice.kind === "ok" ? "text-positive" : "text-danger"
              }`}
            >
              {notice.text}
            </p>
          )}
        </div>
      </div>

      {/* Abgelegte Sicherungen */}
      <div className="rounded-2xl border border-border bg-surface">
        <div className="border-b border-border px-5 py-4">
          <h3 className="text-sm font-medium text-fg">Abgelegte Sicherungen</h3>
          <p className="text-xs text-fg-subtle">
            Liegen unter <code className="font-mono">data/backups/</code> — im
            Docker-Setup auf dem persistenten Volume.
          </p>
        </div>

        {loading ? (
          <p className="py-10 text-center text-sm text-fg-subtle">Lade…</p>
        ) : backups.length === 0 ? (
          <p className="py-10 text-center text-sm text-fg-subtle">
            Noch keine Sicherungen abgelegt.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {backups.map((b) => (
              <li
                key={b.name}
                className="flex flex-wrap items-center gap-3 px-5 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {b.encrypted ? (
                      <Lock className="h-3.5 w-3.5 flex-shrink-0 text-warn" />
                    ) : (
                      <Database className="h-3.5 w-3.5 flex-shrink-0 text-fg-subtle" />
                    )}
                    <span className="truncate font-mono text-xs text-fg">
                      {b.name}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-fg-subtle">
                    {formatDateTime(b.createdAt)} · {formatBytes(b.size)}
                    {b.encrypted ? " · verschlüsselt" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleDownloadStored(b.name)}
                    title="Herunterladen"
                    className="rounded-lg border border-border p-1.5 text-fg-soft hover:border-border-strong cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() =>
                      setConfirmTarget({
                        kind: "stored",
                        name: b.name,
                        encrypted: b.encrypted,
                      })
                    }
                    disabled={busy !== null}
                    title="Wiederherstellen"
                    className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-fg-soft hover:border-border-strong disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Wiederherstellen
                  </button>
                  <button
                    onClick={() => handleDelete(b.name)}
                    disabled={busy !== null}
                    title="Löschen"
                    className="rounded-lg border border-border p-1.5 text-fg-muted hover:border-red-500 hover:text-danger disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Aus Datei wiederherstellen */}
      <div className="rounded-2xl border border-border bg-surface">
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <div className="rounded-lg bg-bg-muted p-2">
            <Upload className="h-5 w-5 text-fg-muted" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-fg">
              Aus Datei wiederherstellen
            </h3>
            <p className="text-xs text-fg-subtle">
              Eine zuvor heruntergeladene <code className="font-mono">.db</code>-
              oder <code className="font-mono">.msbak</code>-Datei einspielen.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 px-5 py-4">
          <input
            type="file"
            accept=".db,.msbak,.sqlite"
            onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
            className="block max-w-full text-xs text-fg-soft file:mr-3 file:cursor-pointer file:rounded-lg file:border file:border-border-strong file:bg-bg-muted file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-fg"
          />
          <button
            onClick={() =>
              uploadFile && setConfirmTarget({ kind: "upload", file: uploadFile })
            }
            disabled={!uploadFile || busy !== null}
            className="flex items-center gap-2 rounded-lg border border-border-strong bg-bg-muted px-3 py-2 text-sm font-medium text-fg hover:text-fg disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" />
            Wiederherstellen
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmTarget !== null}
        destructive
        title="Datenbank wiederherstellen?"
        message="Die aktuelle Datenbank wird vollständig ersetzt. Direkt davor wird automatisch eine Schutz-Sicherung des jetzigen Standes angelegt."
        confirmLabel="Wiederherstellen"
        onConfirm={onConfirmRestore}
        onCancel={() => setConfirmTarget(null)}
      />

      <PasswordPromptDialog
        key={
          pwTarget
            ? pwTarget.kind === "stored"
              ? pwTarget.name
              : "upload"
            : "closed"
        }
        open={pwTarget !== null}
        title="Passwort eingeben"
        message="Diese Sicherung ist verschlüsselt. Bitte das beim Erstellen vergebene Passwort eingeben."
        error={pwError}
        busy={restoreBusy}
        onSubmit={(pw) => pwTarget && void doRestore(pwTarget, pw)}
        onCancel={() => {
          setPwTarget(null);
          setPwError(null);
        }}
      />
    </div>
  );
}
