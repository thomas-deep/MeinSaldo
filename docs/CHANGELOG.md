# Changelog

Reverse-chronologisch — neueste zuerst.

## Unveröffentlicht

## v0.6.0 — Menge × Preis für Vermögensposten (2026-09-01)

### Vermögen

- **Menge × Preis-Erfassung** für manuelle Vermögensposten, gedacht für
  Edelmetalle (z. B. Gold in oz × Tageskurs): Das „Wert"-Formular hat einen
  Umschalter **Betrag | Menge × Preis**; im zweiten Modus berechnet der
  Server `value = quantity × unitPrice` (auf Cent gerundet) und speichert
  die Aufschlüsselung mit (`asset_snapshots.quantity`/`unit_price`,
  Migration v12, nullable). Live-Vorschau des Produkts im Formular; der
  Werteverlauf zeigt die Aufschlüsselung neben dem EUR-Wert.
- **Vorbefüllung**: Beim Öffnen des Formulars wird die Menge aus dem letzten
  Snapshot übernommen und der Modus automatisch gewählt — für laufende
  Kurs-Updates genügen Datum + neuer Preis.
- Plain-Value- und Bulk-Upserts am selben Datum setzen die Aufschlüsselung
  zurück, damit keine veralteten Menge/Preis-Angaben stehen bleiben.
  Verbindlichkeiten und Bulk-Import bleiben unverändert value-only.
- **Fehler-Feedback** beim Speichern und Anlegen im Vermögensbereich:
  ungültige Eingaben, Server-Fehler (`res.ok`) und Netzwerkfehler zeigen
  jetzt eine Meldung statt still zu scheitern; Formular/Modal bleiben offen.
- 10 neue Vitest-Tests (Schema, DB-Upsert, Route); insgesamt **229 grün**.

### Website

- Landing-Page: Mobile-Sektion mit iPhone-Karten-Stack, aktualisierte
  iPhone-Bilder für Dashboard und Drilldown, Layout-Fixes.

## v0.5.0 — Smartphone-Ansicht (2026-06-12)

### Mobile

- **Eigene Smartphone-Oberfläche** für Viewports < 768px statt eines
  responsiven Umbaus: `useIsMobile()` schaltet in `page.tsx` zwischen der
  unveränderten Desktop-Ansicht und einer neuen Mobile-Shell um; Datenladung
  und Mutations-Handler werden geteilt.
- **Bottom-Tab-Navigation** (Übersicht · Buchungen · Vermögen · Abos) mit
  Safe-Area-Unterstützung (`viewport-fit=cover`, `themeColor` je Farbschema).
- **Übersicht**: Monats-Chips als Zeitraumwahl, Hero-Saldo mit
  Sparquote/Defizit-Pill, tippbarer 12-Monats-Cashflow-Chart (reine
  CSS-Balken, kein Recharts auf Mobile), Kategorie-Ranking mit Drilldown in
  die Buchungsliste, letzte Buchungen.
- **Buchungen**: Volltextsuche, Einnahmen/Ausgaben-Chips, Gruppierung nach
  Buchungstag, Paging; Detail-Bottom-Sheet mit Kategorie-Wechsel.
- **Vermögen** (read-only): Nettovermögen, SVG-Sparkline des Verlaufs,
  Posten-Listen. **Abos** (read-only): Fixkosten-Hochrechnung pro Monat,
  Serien mit Preisänderungs-Alert.
- CSV-Import, Einstellungen und Bulk-Operationen bleiben bewusst Desktop-only.

## v0.3.0 — Datenbank-Sicherung + Docker-Images (2026-06-12)

### Datenbank-Sicherung (Backup & Restore)

- **Neue Einstellungen-Sektion „Datenbank"**: vollständige Sicherungen der DB
  (alle Tabellen inkl. `settings`) anlegen, herunterladen, hochladen,
  wiederherstellen und löschen.
- **Optionale Verschlüsselung** der Sicherung: AES-256-GCM, Schlüssel via
  `scrypt` aus einem Passwort. Container-Format `.msbak`
  (`MAGIC | salt | iv | authTag | ciphertext`); authenticated → falsches
  Passwort/Manipulation scheitern sauber. Passwort wird nie gespeichert und
  beim Wiederherstellen abgefragt. Unverschlüsselte Sicherungen sind rohe
  `.db`-Dateien (mit jedem SQLite-Tool lesbar).
- **Zwei Wege beim Erstellen**: im Speicher ablegen (`data/backups/`, im Docker
  auf dem persistenten Volume) oder direkt herunterladen ohne Ablage.
- **Restore** validiert die Datei (`quick_check` + Schema), legt **automatisch
  eine Schutz-Sicherung** des aktuellen Standes an und tauscht dann die DB-Datei
  atomar unter der laufenden Verbindung (`closeDb` mit WAL-Checkpoint →
  `rename`). Eine ältere Sicherung wird beim Öffnen automatisch aufs aktuelle
  Schema migriert. Schutz-Sicherung auch vor „DB leeren".
- Snapshots via `VACUUM INTO` (konsistent, kompakt, ohne WAL-Sidecar). Pfad-
  Sicherheit gegen Traversal; In-Memory-Lock serialisiert Backup/Restore (409).
- Neue Module `lib/backup-crypto.ts`, `lib/backup.ts`, `lib/backup-response.ts`,
  Komponenten `DatabaseBackup` + `PasswordPromptDialog`; Routen `/api/backups`,
  `/api/backups/[name]`, `/api/backups/[name]/restore`, `/api/backup-download`,
  `/api/backup-restore-upload` (Download/Upload als Geschwister-Routen, um den
  Next-16-Konflikt mit `[name]` zu vermeiden).
- 20 neue Vitest-Tests (Crypto-Round-Trip, falsches Passwort, Restore-Swap,
  Path-Traversal); insgesamt **219 grün**.

> **Hinweis:** Die laufende Datenbank liegt weiterhin **unverschlüsselt** auf
> der Platte — eine DB-Verschlüsselung im Betrieb ist bewusst nicht eingebaut.
> Schutz bei Bedarf über Datenträger-/Ordner-Verschlüsselung. Die
> Backup-Verschlüsselung schützt nur die Sicherungsdateien.

### Docker & Distribution

- **GHCR-Publishing-Pipeline + Standalone-Image**: Multi-Arch-Image
  (`linux/amd64`, `linux/arm64`) auf Basis von Next.js `output: "standalone"`,
  lauffähig auf NAS-Geräten (Synology, UGreen). `docker compose up -d` zieht das
  fertige Image; DB unter `/data` per Volume persistiert.

### Vermögen

- **Werteverlauf-Chart auch für konto-basierte Posten**: Mini-Chart/Verlauf
  jetzt ebenfalls für die automatisch aus Kontogruppen abgeleiteten
  Vermögens-/Verbindlichkeits-Einträge (rekonstruierte Monats-Snapshots).
- **Bulk-Paste für Asset/Liability-Snapshots**: mehrere Werteverlaufs-Einträge
  auf einmal einfügen (Bulk-Upsert je `(entity, date)`).

### CSV-Import

- **Encoding-Auto-Detect** (UTF-8 vs. windows-1252) — robustere Erkennung beim
  Einlesen statt fester Preset-Vorgabe.

### Fixes & Doku

- Lokalisierte Sortierung durchgängig auf `de-DE` / `Intl.Collator`;
  Override-Trennung getestet.
- README: Screenshots aus der Landing-Page eingebunden, Featureblock kompakter;
  erledigte „Bekannte Bugs" aus ROADMAP/CLAUDE entfernt.

## v0.2.0 — IBAN-Auto-Match + Filter-Presets (2026-05-24)

### IBAN-basierte Auto-Konto-Zuordnung beim CSV-Import

- Kontogruppen haben jetzt ein optionales IBAN-Feld (Migration v10, mit
  Partial Unique Index auf nicht-NULL-Werten). Verwaltung in den
  Einstellungen → Kontogruppen.
- Beim CSV-Import liest `detectIbanFromCsv` die `IBAN Auftragskonto` aus
  der ersten Datenzeile, normalisiert sie (uppercase, ohne Whitespace) und
  matched gegen die gepflegten IBANs. Treffer → Kontogruppe wird im
  KontoPicker automatisch vorausgewählt mit dezentem Hinweis
  „Automatisch erkannt anhand IBAN DE••3000".
- Pure IBAN-Utilities in `lib/iban.ts` (`normalizeIban`,
  `formatIbanForDisplay`, `maskIban`); 409 bei doppelter IBAN.

### Speicherbare Filter-Presets

- Neue Tabelle `filter_presets` (Migration v11) mit eindeutigem Namen,
  payload als JSON-Snapshot (Auswertung-Filter + Kontogruppen-Filter),
  automatischer `sort_order`.
- Neue Komponente `FilterPresetMenu` als Dropdown in der collapsed
  Filter-Leiste — ohne Aufklappen erreichbar. Zeigt das aktive Preset
  hervorgehoben, bietet Anwenden + Löschen pro Eintrag und blendet das
  Speichern-Feld nur ein, wenn die aktuelle Kombination noch keinem
  Preset entspricht.
- API: `/api/filter-presets` GET/POST + `[id]` PATCH/DELETE mit
  409-Handling bei doppeltem Namen.

### Filter-Header zeigt Konto-Auswahl

- Die collapsed Filter-Bar ergänzt jetzt einen Status-Schnipsel wie
  „· 2 Konten" / „· 1 Inhaber" / „· inkl. ohne Zuordnung", damit klar
  ist, dass die Kontogruppen-Selektion Teil des aktiven Filters ist.
- Der „X aktiv"-Counter zählt die Konto-Dimensionen mit. Klick auf den
  Counter resettet jetzt auch den Konto-Filter.

### Tests + Stack

- 168 Vitest-Tests grün (neu: `iban.ts`, IBAN-API-409,
  `detectIbanFromCsv`, Filter-Preset-CRUD).
- Default-Preview-Server zeigt jetzt auf die Demo-DB (`dev:demo`); echte
  DB-Variante als `finanz-app-real` benannt, um versehentliche Eingriffe
  in Nutzerdaten auszuschließen.

### Umbenennung

- Das Tool heißt jetzt **MeinSaldo** (App-Header, Browser-Titel,
  README, CONTRIBUTING).

### Eingabe-Zahlenformat

- Beträge in den Vermögens-Eingaben (manuelle Posten, Konto-Anker) werden
  im deutschen Format geparst: `1.234,56` funktioniert wie `1234,56`. Ein
  einzelner Punkt mit genau drei Folgeziffern gilt als Tausender-Trennung
  (`1.234` → 1234). Anzeige durchgängig im DE-Format. Pure, getestete
  Logik in `lib/number-format.ts`.

### Vermögen — Verfeinerungen

- KPI-Kacheln im Vermögen-Tab an die StatCards der Auswertung angeglichen
  (rounded-2xl, Editorial-Schrift, Design-Tokens); „Net Worth" →
  „Nettovermögen".
- **Konto-Anker** (Migration v8): optionaler Wert + Datum pro Kontogruppe,
  eingegeben per Anker-Button in der Kontogruppen-Verwaltung. Ist er
  gesetzt, wird der Saldo-Verlauf für die Vermögensübersicht via
  `balanceAsOf` aus dem Anker und den kumulierten Buchungsbeträgen rück-
  und vorwärts rekonstruiert — nützlich für Konten ohne CSV-Saldo.
- Asset-/Liability-Typ von festem Enum auf Freitext umgestellt.
- Verlaufsanzeige (Mini-Chart + Snapshot-Liste) für manuelle Posten.

### Wiederkehrend — serienweise Zuordnung

- Pro erkannter Serie lassen sich Kategorie und Tag auf alle zugehörigen
  Buchungen anwenden; jede Serie zeigt ihre aktuellen Kategorien/Tags als
  Chips. `addTagId` ergänzt den Bulk-Endpoint.

### UI-Vereinheitlichung

- Neue `ConfirmDialog`-Komponente ersetzt `window.confirm` bei
  Lösch-Aktionen in NetWorthView und TagManager.
- TagManager-Einstellungsseite an den Container-/Header-Stil der übrigen
  Einstellungs-Sektionen angeglichen.

### Fixes

- **FTS5-Index-Korruption** (Migration v9): Der Volltextindex
  `transactions_fts` war als external-content-Tabelle angelegt; deren
  fragile `'delete'`-Trigger führten zu `SQLITE_CORRUPT_VTAB`, wodurch
  jedes `UPDATE` auf `transactions` mit 500 scheiterte (u. a. die
  Kategorie-Zuweisung aus Wiederkehrend). Index als reguläre FTS5-Tabelle
  mit einfachen `DELETE`-Triggern neu aufgebaut.
- TagPicker-Popover wurde von der `overflow-hidden`-Tabellenzelle
  abgeschnitten — jetzt via Portal gerendert.
- Recurring-Bulk rief `/api/transactions/bulk` auf (traf die `[id]`-Route,
  stilles No-op) statt `/api/transactions-bulk`.
- Import + „KI für Sonstiges" klassifiziert nur noch die neu importierten
  Buchungen statt der gesamten Datenbank.

### Kategorie-Übernahme aus dem Verlauf

- Beim Import erben neue Buchungen automatisch die Kategorie gleicher
  früherer Buchungen (Match über den normalisierten Counterparty-Namen).
- Wirkt nur auf Buchungen, die nach der Regel-Kategorisierung in einer
  Fallback-Kategorie („Sonstiges") landen — bestehende Regel-Treffer
  bleiben unangetastet. Manuell gesetzte Verlaufs-Kategorien haben Vorrang
  vor automatischen. Pure, getestete Logik in `lib/category-history.ts`.

### Vermögen (Net-Worth)

- **Neuer Nav-Tab „Vermögen"** mit Summary-Cards (Vermögen / Verbindlichkeiten
  / Net Worth) und monatlichem Verlaufs-Chart.
- **Automatische Konto-Übernahme**: Kontogruppen-Salden (letzter
  `saldoNachBuchung` pro Konto) zählen automatisch — Giro/Spar/Bargeld als
  Asset, Kreditkarte als Liability (`Math.abs`). Kein Doppelpflegen.
- **Manuell pflegbare Posten** für Depot-Werte, Immobilien, Kredite — alles,
  was nicht im CSV vorkommt. Mit Snapshot-Historie via Upsert.
- Migration v7: `assets`, `liabilities`, `asset_snapshots`,
  `liability_snapshots` mit Cascade-Delete und `UNIQUE(entity, date)`.
- Monatsverlauf kombiniert Konto-Monatsenden (per Window-Function) mit
  manuellen Snapshots; Forward-Fill je Entity in pure-Lib (`networth.ts`).

### Tags

- **Frei vergebbare Labels** quer zu Kategorien (z. B. `urlaub-2025`,
  `renovierung`) für Querschnitts-Auswertungen.
- **Tag-Manager** im Einstellungen-Bereich (CRUD mit Farbpalette).
- **TagPicker-Popover** in der TransactionTable pro Zeile, Tag-Chips inline
  in der Verwendungszweck-Zelle.
- Migration v6: `tags` (UNIQUE name) + `transaction_tags` Many-to-Many
  mit Cascade-Delete in beide Richtungen.

### Wiederkehrende Zahlungen (Recurring-Detection)

- **Neuer Nav-Tab „Wiederkehrend"** erkennt monatlich/quartalsweise/jährlich
  wiederkehrende Buchungen aus Counterparty + Betrags-Stabilität +
  Intervall-Regularität (mindestens 3 Buchungen, ≥75 % der Intervalle müssen
  einem Muster folgen).
- **Preisänderungs-Alert**: Posten, deren letzter Betrag mehr als 8 % vom
  Durchschnitt der vorigen abweicht, werden in einer Highlight-Sektion
  oben separat gezeigt.
- `lib/recurring.ts` ist pure (Counterparty-Normalisierung inkl. Umlaut-
  Strip + Bank-Routing-Suffix-Trim) und vollständig getestet.

### First-class Search

- **Globale Such-Palette** (⌘K / Strg+K oder Such-Button im Header) mit
  debounced Live-Suche und Click-Result → Auswertung mit vorbefüllter
  Filter-Suche.
- FTS5-Volltextindex über `verwendungszweck`, `name_zahlungsbeteiligter`,
  `buchungstext` mit `unicode61 remove_diacritics 2`-Tokenizer
  (Umlaut-tolerant) und Sync-Triggern auf INSERT/UPDATE/DELETE.
- `buildFtsQuery` sanitisiert User-Input (Prefix-Suche pro Token,
  FTS5-Sonderzeichen entfernt) und ist ebenfalls getestet.
- Migration v5.

### Tests + Infrastruktur

- **API-Route-Tests** mit isolierter `:memory:`-SQLite pro Test via
  `setupFreshInMemoryDb`-Hilfe. Vorher waren nur `lib/*` getestet.
- 22 neue API-Tests + 16 neue Domain-Lib-Tests (insgesamt 115 grün).
- **Fresh-DB-Fix**: `ensureColumn`-Helper macht die Migrationen v2-v4
  idempotent. Vorher crashten ALTER-TABLE-ADD-COLUMN-Statements auf
  frischen DBs, weil `SCHEMA_V1` die Spalten bereits enthielt.
- **FINANZEN_DB_PATH**-Env-Override und `__resetDbForTests()` für
  isolierte Tests.

### Open-Source-Vorbereitung

- **ROADMAP.md** im Repo-Root mit A/B/C/X-Priorisierung.
- **CONTRIBUTING.md** mit Setup, Pflicht-Checks, Datenschutz-Hinweisen
  und Bank-Preset-Beitrag-Workflow.
- **docs/CSV_FORMATS.md**: neue Sektion „Beitrag neuer Bank-Presets"
  mit Anonymisierungs-Anleitung (IBANs, Namen, Verwendungszwecke).

### Daten-Seite (Refactor)

- **Linearer Upload-Flow** ohne Vorab-Auswahl: nach CSV-Drop erscheint die
  Konto-Auswahl, danach das Mapping, danach die Vorschau — alle Sektionen
  bleiben sichtbar, kein Hide-and-Seek mehr.
- **Globale Aktionen am DB-Status-Container**: „Umbuchungen finden"
  (recomputeUmbuchungen) und „Neukategorisieren" mit Dropdown
  (Regeln auf „Sonstiges" / Regeln auf alles / KI auf „Sonstiges" /
  Komplett-KI). Manuelle Overrides bleiben in allen Modi erhalten.
- **CSV-Dateiname** wird beim Import gespeichert (Migration v4: neue Spalte
  `transactions.source_file`) und in der Import-Historie pro Eintrag
  angezeigt.
- AI-Hinweis-Banner aus der Auswertung entfernt — KI-Kategorisierung läuft
  jetzt zentral über „Neukategorisieren" auf der Daten-Seite.

### Kategorien

- **Direction pro Kategorie** (`einnahme` / `ausgabe` / `beide`). Auto-Match
  berücksichtigt das Vorzeichen der Buchung — Regeln mit konflikt-haftem
  Substring (z. B. „miete") greifen nur in ihrer Richtung. Migration v2 setzt
  Defaults pro Seed-Kategorie. Editor zeigt Segment-Control und farbige Badges.
- **Drag-and-Drop-Sortierung** für Kategorien, Inhaber und Kontogruppen
  via `@dnd-kit/sortable`. Neue Bulk-Reorder-Endpunkte als Geschwister-Routen
  (`/api/<entity>-reorder`), um Next-16-Routing-Konflikt mit `[id]` zu umgehen.
  Migration v3 fügt `sort_order` in `inhaber` und `kontogruppen` hinzu.
- **Drei neue Einnahme-Kategorien** für Firmen: `Zahlung Ausgangsrechnung`,
  `Steuererstattung`, `Mieteinnahmen`.

### Auswertung

- **Vorjahresvergleich in Kategorie-Listen** (Einnahmen + Ausgaben):
  Pfeil-Indikator + Prozent-Delta pro Kategorie, Tooltip mit Vorjahres-Wert.
- **Multiselect-Pills** im Konto-Filter — Inhaber + einzelne Konten parallel
  toggelbar, „Gesamt" setzt zurück.
- **Umbuchungs-Toggle** im Filter („Umbuchungen einbeziehen") schaltet Stats
  und Charts zwischen operativem Saldo und Brutto inkl. Umbuchungen um.
- **Umbuchungen neu erkennen** auf Knopfdruck — neuer Endpoint
  `POST /api/umbuchungen/recompute`, manuelle Markierungen bleiben erhalten.

### Transaktionen

- **Page-Size-Dropdown** in der Transaktionstabelle: 50 / 100 / 250 / 500 /
  Alle (statt fest 200).
- **Routing-Fix**: `/api/transactions/bulk` wurde von der `[id]`-Route
  geschluckt und gab still `{updated: false}` zurück — Bulk-Endpunkt nach
  `/api/transactions-bulk` verschoben.

## v0.1.0 — Erstes stabiles Release (2026-05-14)

Erste durchgängige, produktiv nutzbare Version. Daten-Modell, UI-System und
Sicherheits-Posture sind gesetzt; alle bekannten Audit-Befunde der frühen
Iterationen sind adressiert.

### Daten-Modell · Greenfield-Schema (`v1`-Migration)
- **`inhaber`** als eigene Entität (privat / gemeinsam / firma) mit Farbe
- **`kontogruppen`** gehören jetzt zu einem Inhaber (`inhaber_id` NOT NULL,
  RESTRICT-Delete) und haben eine eigene Kontoart (`art`: Girokonto, Sparkonto,
  Kreditkarte, Depot, Sonstiges). Bank-Preset bleibt als optionales Feld
- **`kategorien`** mit FK von `transactions.kategorie_id`, plus editierbare
  Regeln (`rule_order`, `keywords`, `name_patterns` als JSON-Spalten)
- **`transactions`**: materialisiertes `is_umbuchung` plus `umbuchung_override`,
  `is_manual_override`, `ai_classified` sauber getrennt; Dedup-Hash enthält
  keine `kontogruppe_id` mehr (keine Duplikate bei wechselnder Zuordnung)
- **`logs`** für Audit-Trail (KI-Prompts, Imports, Settings-Änderungen)
- Versionierte Migrationen über `schema_migrations`

### Auswertung
- **Editorial Light/Dark-Theme** mit Token-System (oklch-basiert, semantisch),
  Theme-Toggle im Header, FOUC-frei dank Block-Script
- **Instrument Serif** für Hero-Zahlen, Geist Sans + Geist Mono für UI/Tabular
- **Filter-Leiste** collapsable: Zeitraum-Presets (lfd. Monat / Quartal / Jahr,
  Vorjahre, „Letzte 12 Monate", Custom), Typ-Toggle, Min-Betrag, Volltext-Suche
- **Vorjahresvergleich** in den SummaryCards mit Delta-Anzeige (lowerIsBetter
  bei Ausgaben — Rückgang grün)
- **Hierarchischer Kontogruppen-Filter**: Gesamt · pro Inhaber · pro Konto ·
  Nicht zugeordnet
- **Klickbarer MonthlyChart**: Klick auf Balken setzt Zeitraum-Filter auf
  diesen Monat
- **CategoryChart** mit theme-aware Donut, Mini-Slices (<1 %) zu „Übrige
  Kleinposten" gebündelt, Beschriftung nur bei Hover
- **DrillDown-Breadcrumbs** klickbar zurück

### Transaktionen-Tabelle
- **Multiselect** mit Bulk-Aktionen: Kategorie wechseln · **Konto wechseln** ·
  Umbuchung setzen/entfernen · KI-Klassifikation (force) · Löschen
- Paginierung statt stillem `slice(0,200)`, lokalisierte Sortierung
  (`Intl.Collator('de-DE')`)
- Multiselect-Banner mit Live-Counter

### Daten-Import
- **Serverseitiges Parsen** (`POST /api/import` multipart) — Client lädt nur
  das File hoch, Decode + Parse + Insert läuft auf dem Server
- **CSV-Encoding** wählbar (auto / utf-8 / windows-1252); `auto` zieht aus dem
  Bank-Preset (Sparkasse → windows-1252)
- **Preview** vor dem Insert: parsed Buchungen, neue vs. bereits vorhandene,
  Datums-Range
- **Drei Import-Modi** als Buttons in der Preview: Standard · „+ KI für
  Sonstiges" · „+ Alles KI" (force, ignoriert Regel-Match)
- **Import-Historie** in der Daten-Seite: pro Import-Batch (gleicher
  `imported_at`) ein Eintrag mit Konto-Wechseln und Import-Löschen
- Feld-Mapping collapsable mit „neu parsen"-Button intern

### Kategorien-Editor
- Vollständig editierbar: Name, Keywords (Chip-Liste), Namens-Patterns,
  Reihenfolge; eigene Kategorien anlegbar
- Fallback-Kategorien (Sonstiges / Sonstige Einnahmen) gesperrt
- Beim Löschen einer Kategorie werden Buchungen auf Sonstiges zurückgesetzt

### KI-Kategorisierung
- Drei Eintrittspunkte: Auswertung-Banner (Sonstiges), Multiselect-Bulk in der
  Tabelle (force), Auto-Run nach Import
- AbortSignal durchgereicht bis in den Ollama-Fetch
- In-Memory-Concurrency-Lock — parallele Läufe bekommen 429
- Prompts + Antworten + Match-Resultat werden in `logs` mit
  `event = 'ai.classify'` mitgeschrieben

### Sicherheit
- **CSRF-Schutz** via Middleware (Origin-Allowlist, konfigurierbar über
  `ALLOWED_ORIGINS`)
- **SSRF-Härtung** für `ollamaUrl`: Loopback-Hosts nur, erweiterbar via
  `ALLOWED_OLLAMA_HOSTS`
- **Zod-Validierung** auf allen mutierenden API-Routes mit aussagekräftigen
  400-Antworten
- **Rate-Limit** / Concurrency-Cap auf `/api/ai/categorize`

### Umbuchungs-Erkennung
- Paarweise: negative Buchung sucht passende positive Buchung auf einer
  anderen Kontogruppe mit gleichem absoluten Betrag innerhalb ±3 Tagen
  (greedy, nearest date wins)
- Plus IBAN-Match (Counterparty-IBAN ist eigene IBAN) und
  Kreditkarten-Settlement (Kontoart `kreditkarte` → KK-Buchungen sind
  Umbuchungen)
- `is_umbuchung` materialisiert, nach jedem Insert / Bulk-Update / Inhaber-
  oder Kontogruppen-Änderung neu berechnet

### Tooling & Tests
- **Vitest** mit 68 Unit-Tests: parser, categories, field-mapping,
  umbuchung-detection, date-range, api-validation
- TypeScript strict, ESLint clean
- `.env.example` mit dokumentierten Variablen

### Einstellungen-Bereich
- Sidebar-Navigation: Inhaber & Konten · Kategorien · KI-Kategorisierung · Logs
- Konsistenter Header-Pattern (Icon-Box + Titel + Subtitle + Aktionen) auf
  allen vier Sektionen
- **Logs-View** mit Event-Filter, expandierbaren JSON-Details, Auto-Trim
  bei >5000 Einträgen

---

## Frühe Iterationen (vor v0.1.0)

Die ursprüngliche Iterations-Historie ist in [AUDIT.md](AUDIT.md) und in der
Git-Historie nachvollziehbar. Stichpunkte zur Entwicklung:

- **Iteration 1 — MVP**: Next.js 16 + Tailwind + Recharts, Drag&Drop-Upload,
  17 Kategorien, Dark-Theme
- **Iteration 2 — SQLite-Persistenz**: `better-sqlite3`, Dedup-Hash, REST-API
- **Iteration 3 — Kontogruppen & Drill-Down**: Pro-Konto-Filter, automatische
  Umbuchungserkennung via IBAN, kategoriespezifischer DrillDown
- **Iteration 4 — American Express**: AmEx-Preset, `invertAmount`,
  Number-Parser-Heuristik
- **Iteration 5 — Kreditkarten-Settlement**: KK-Typ + Settlement-Erkennung,
  manueller Umbuchungs-Toggle
- **Iteration 6 — DKB & comdirect**: `preprocess`/`rowTransform` Hooks im
  `BankPreset`
- **Iteration 7 — Bank ≠ Kontogruppe**: `bank`-Feld als Verweis auf Preset
- **Iteration 8 — KI-Kategorisierung & Settings-Struktur**: erste
  Ollama-Integration, Settings-Sidebar
- **AUDIT-Sprint** (Mai 2026): externer Bug-Report, alle hochpriorisierten
  Befunde adressiert (Dedup-Hash-Bug, Encoding, AI-Override-Konflikt,
  Zod-Validierung, Unit-Tests)
