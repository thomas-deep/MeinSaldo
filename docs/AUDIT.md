# Audit-Report

Stand: Initial-Commit. Durchführung: zwei unabhängige Analysepässe (frischer Subagent + manuelle Verifikation).

## Stärken

- **Dedup-Architektur** (`db.ts:77-89`, `:226-259`): Inhaltsbasierter SHA256-Hash + `INSERT OR IGNORE` in einer einzigen Transaction. Robust gegen versehentliche Mehrfach-Importe.
- **Bank-Preset-System** (`field-mapping.ts:17-90`): `preprocess`/`rowTransform`-Hooks erlauben neue Banken ohne Eingriff in den Parser-Kern.
- **Tristate Umbuchungs-Override** (`db.ts:134-143`): NULL/0/1 unterscheidet Automatik vs. manuell explizit gesetzt — gutes Audit-Pattern.
- **WAL-Mode + Indizes** (`db.ts:30, 59-60`) und Singleton-DB-Connection.
- **Atomare Sub-Operationen** wie `deleteKontogruppe` mit FK-Nulling in einer Transaction (`db.ts:395-400`).

## Offensichtliche Bugs (verifiziert)

1. **Dup-Bug durch `kontogruppeId` im Hash** (`db.ts:86`)
   Wird derselbe Umsatz zweimal mit unterschiedlicher Kontogruppe importiert (Workflow: erst „nachfragen" gewählt, dann anders zugeordnet), entsteht ein Duplikat. Fix: Kontogruppe aus dem Hash nehmen, dafür beim Re-Import nur die `kontogruppe_id` der bestehenden Zeile updaten.

2. **CSV-Encoding hartkodiert** (`CsvUpload.tsx:26`)
   `readAsText(file, "utf-8")`. Sparkasse/Volksbank exportieren regelmäßig `windows-1252`. Umlaute brechen, Kategorisierungs-Patterns (`ärzte`, `württembergische`) matchen nicht. `field-mapping.ts:97` deklariert `encoding`, wird aber nie genutzt.

3. **AI-Klassifikation blockiert sich selbst** (`db.ts:268` + `:324`)
   `updateCategory` setzt `is_manual_override=1` — wird sowohl bei manuellen Edits als auch bei AI-Treffern aufgerufen. `getUncategorizedIds` filtert `is_manual_override=0`. Folge: AI hat eine Buchung einmal angefasst → bei nächstem KI-Lauf nicht mehr berücksichtigt, auch wenn das Modell wechselt. Fix: separates Flag `ai_classified` oder `categorization_source` ENUM.

4. **API-Routes ohne Try/Catch um `req.json()`** (`api/transactions/route.ts:17`, `api/settings/route.ts:14` u.a.)
   Invalides JSON wirft → 500 statt 400.

5. **`localeCompare` ohne Locale** (`TransactionTable.tsx:80`)
   Sortierung mit Umlauten plattformabhängig (ä einmal vor a, einmal nach z).

6. **DKB-Preprocess sucht nur 20 Zeilen** (`field-mapping.ts:22, 63`)
   Längere Header-Sektionen führen zu still verworfenen Files.

7. **Tabelle zeigt nur 200 Zeilen, ohne Paginierung** (`TransactionTable.tsx:182`)
   `slice(0, 200)` — alles darüber unsichtbar, kein Hinweis dass mehr existiert.

## Architektur- & Design-Risiken

- **Kategorien als String-Spalte ohne FK** (`db.ts:46`). Umbenennen einer Kategorie in `categories.ts` macht DB-Werte zu Leichen.
- **CSV-Parsing im Client** (`page.tsx:131`): bei 10k+ Buchungen unnötig speicherlastig, keine Server-Validierung. Besser: Multipart-Upload, Server parst.
- **`isUmbuchung` zur Lese-Zeit berechnet** (`db.ts:147-159`): nicht cachebar, nicht indizierbar. Sollte beim Insert materialisiert werden, override-bar bleiben.
- **`ensureColumn`-Migrationen ohne Versionierung** (`db.ts:11-21`): keine Datenmigration möglich, kein Rollback, skaliert nicht über wenige Spalten.
- **Settings-Schreiben ohne URL-Validierung** (`api/settings/route.ts:18-22`): `ollama_url` wird in `api/ai/categorize/route.ts:21` direkt für `fetch` benutzt. **SSRF-Risiko**, sobald die App nicht mehr nur localhost-only ist. Auch lokal: ein versehentlich gespeichertes `http://192.168.x.x` schickt jede Sonstiges-Buchung dorthin.

## Security-Beobachtungen

- **Kein CSRF-Schutz** auf den mutierenden API-Routes. Aktuell egal (Single-User, kein Login), aber wenn jemals exposed: jeder Browser-Tab könnte DELETE auf `/api/transactions` ablegen.
- **Kein Path-Traversal-Risk** — DB-Path ist hardcoded unter `process.cwd()/data/`.
- **Kein SQL-Injection-Risk** — alle Statements via `prepare()` mit Parameter-Binding.
- **`getTransactionsByIds`** (`db.ts:308-317`) baut Placeholders dynamisch, aber Parameter werden korrekt gebunden — safe.
- **React XSS** — kein `dangerouslySetInnerHTML` im Code, alle Werte werden via JSX gerendert (auto-escape).
- **Kein Rate-Limit** auf `/api/ai/categorize` — bei sehr großen Listen läuft Ollama Minuten ohne Timeout, Request kann nicht abgebrochen werden.

## TypeScript-Qualität

- API-Bodies werden ohne Validierung gecastet (`api/*/route.ts`). Kein Zod/Valibot. Ein fehlerhafter Client-Build schreibt Müll in die DB.
- `as unknown as` in `CategoryChart.tsx:139, 162, 168` — Workaround für Recharts-Typen statt eigene Wrapper-Typen.
- `eslint-disable`s in `useEffect` (`page.tsx:72`, `AiCategorizeButton.tsx:29`, `AiSettings.tsx:29`) — Symptom, kein Fix. Fetch-on-mount sollte AbortController + Cleanup haben.

## Tests

Kein einziger automatisierter Test. Verifikation rein manuell im Browser. Bei der Komplexität der CSV-Parser-Heuristiken (Datums-/Zahlen-/Encoding-/Counterparty-Logik) wäre Unit-Test-Coverage auf `lib/parse-csv.ts`, `lib/categories.ts`, `lib/field-mapping.ts` der mit Abstand höchste Hebel.

---

## Priorisierung für Fix-Sprint

1. Dup-Bug (`kontogruppeId` aus Hash entfernen)
2. CSV-Encoding-Option pro Preset + UI-Override
3. AI-Override-Flag trennen
4. Zod-Validierung auf API-Routes
5. Unit-Tests für Parser-Heuristiken
