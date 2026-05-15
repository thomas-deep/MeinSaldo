# Changelog

Reverse-chronologisch — neueste zuerst.

## Unveröffentlicht

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
