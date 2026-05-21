# Finanz-Auswertung

**v0.1.0** · Lokales Web-Tool zur Aufbereitung von Konto- und Kreditkarten-CSV-Exporten. Mehrere Banken parallel, Inhaber/Konten-Hierarchie, paarweise Umbuchungs-Erkennung, regelbasierte plus optional KI-gestützte Kategorisierung, Auswertung mit Filter und Vorjahresvergleich. Light- und Dark-Mode. Alles bleibt auf deinem Rechner.

## Schnellstart

```bash
cd app
npm install
npm run dev
```

App läuft danach auf [http://localhost:3000](http://localhost:3000). Die SQLite-Datenbank wird unter `app/data/finanzen.db` angelegt; optionale Umgebungsvariablen siehe `app/.env.example`.

## Was kann das Tool?

### Datenpflege
- **Inhaber & Konten** zweistufig: Inhaber (privat / gemeinsam / firma) und darunter beliebig viele **Kontogruppen** mit eigener Art (Girokonto, Sparkonto, Kreditkarte, Depot, Sonstiges) und Bank-Preset
- **CSV-Import** server-seitig mit Vorschau vor dem Einfügen — neue vs. bereits vorhandene Buchungen werden vor dem Insert ausgewiesen
- **Encoding-Auswahl** (auto / utf-8 / windows-1252) je Import oder via Bank-Preset
- **Import-Historie** mit Konto-Wechsel und Batch-Delete — falsch zugeordnete Imports lassen sich pro Klick zurückrollen
- **Dedup** beim Re-Import per inhaltsbasiertem Hash; manuelle Änderungen bleiben erhalten

### Auswertung
- **Filter-Leiste** (collapsable) mit Zeitraum-Presets (lfd. Monat / Quartal / Jahr, Vorjahre, „Letzte 12 Monate", Custom), Typ-Toggle, Min-Betrag, Volltext-Suche
- **Vorjahresvergleich** auf den SummaryCards mit Delta-Anzeige (Ausgaben-Rückgang grün, Anstieg rot)
- **Hierarchischer Filter**: Gesamt · pro Inhaber · pro Konto · Nicht zugeordnet
- **Klickbarer Monatschart** → setzt Zeitraum-Filter auf den geklickten Monat
- **CategoryChart** als Balken oder Donut, Mini-Slices unter 1 % zu „Übrige Kleinposten" gebündelt, Beschriftung nur bei Hover
- **DrillDown** Kategorie → Empfänger/Absender → Einzelbuchungen, mit klickbaren Breadcrumbs

### Globale Suche
- **⌘K / Strg+K** öffnet eine Command-Palette mit Volltext-Suche über alle Transaktionen
- **FTS5-Index** in SQLite, Umlaut-toleranter `unicode61`-Tokenizer, Prefix-Suche pro Token
- Klick auf ein Ergebnis öffnet die Auswertung mit dem Empfänger als Filter

### Wiederkehrende Zahlungen
- Automatische Erkennung von **Abos, Miete, Gehalt** und ähnlichen Serien aus Counterparty + Betrag + Intervall (monatlich / quartalsweise / jährlich)
- **Preisänderungs-Alert** wenn der letzte Betrag mehr als 8 % vom Durchschnitt abweicht — Highlight-Sektion oben

### Vermögensübersicht
- Eigener **Net-Worth-Tab** mit Summary-Cards und monatlichem Verlaufs-Chart
- Kontogruppen-Salden werden **automatisch übernommen** (Giro/Spar als Asset, Kreditkarte als Liability)
- Daneben **manuell pflegbare Posten** für Depot-Werte, Immobilien, Kredite — mit Snapshot-Historie

### Transaktionen-Tabelle
- Multiselect mit **Bulk-Aktionen**: Kategorie wechseln · Konto wechseln · Umbuchung markieren · KI-Klassifikation · Löschen
- Paginierung, lokalisierte Sortierung (`Intl.Collator('de-DE')`)
- Manuelle Kategorie- und Umbuchungs-Override pro Buchung
- **Tags** pro Zeile via Popover (z. B. `urlaub-2025`, `renovierung`) quer zu Kategorien

### Umbuchungs-Erkennung
- **Paarweise**: negative Buchung sucht passende positive Buchung auf anderer Kontogruppe (gleicher absoluter Betrag, ±3 Tage, greedy)
- Plus IBAN-Match und Kreditkarten-Settlement-Heuristik
- Erkannte Umbuchungen werden aus Einnahmen- und Ausgaben-Summen ausgeschlossen

### Kategorisierung
- **23+ vordefinierte Regeln** mit ~830 Keywords/Merchant-Patterns für deutsche Banken
- **Kategorien-Editor**: Regeln voll editierbar (Keywords, Namens-Patterns, Reihenfolge), eigene Kategorien anlegen
- **Optionale KI-Kategorisierung** über lokales Ollama-LLM:
  - Nach Import (zwei Modi: nur Sonstiges oder alles)
  - Auf ausgewählten Tabellen-Zeilen (Bulk, force)
  - Manuell über Banner auf der Auswertung
- AI-Prompts und Antworten landen im Audit-Log

### Sicherheit
- **CSRF-Schutz** via Origin-Allowlist (Middleware)
- **SSRF-Härtung** für die `ollamaUrl` (Default Loopback-only)
- **Zod-Validierung** auf allen mutierenden API-Routes
- **Concurrency-Lock** auf AI-Endpoint (parallele Läufe → 429)

### Tooling
- **Vitest** mit 115 Tests — Domain-Logik (parser, categories, umbuchung-detection, date-range, recurring, networth, validation) **und** API-Routes mit isolierter In-Memory-SQLite pro Test
- **Light/Dark-Mode** mit Token-System auf oklch-Basis, Theme-Toggle persistiert in localStorage
- Editorial-Typographie: Instrument Serif für Hero-Zahlen, Geist Sans + Mono für UI

## Dokumentation

- **[docs/USER_GUIDE.md](docs/USER_GUIDE.md)** — Anleitung für Nutzer: Workflows, Banken-Setup, Kategorien, KI
- **[docs/TECHNICAL.md](docs/TECHNICAL.md)** — Architektur, Datenmodell, API, Erweiterungspunkte
- **[docs/CSV_FORMATS.md](docs/CSV_FORMATS.md)** — Bank-spezifische Eigenheiten und Mapping-Details
- **[docs/CHANGELOG.md](docs/CHANGELOG.md)** — Releases und Iterations-Historie
- **[docs/AUDIT.md](docs/AUDIT.md)** — Historischer Audit-Report (alle Befunde sind in v0.1.0 adressiert)
- **[ROADMAP.md](ROADMAP.md)** — A/B/C-Priorisierung der nächsten Features
- **[CONTRIBUTING.md](CONTRIBUTING.md)** — Setup, Checks, Bank-Preset-Beitrag-Workflow

## Technik-Stack

- **Frontend**: Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind v4, Recharts, Lucide-Icons
- **Backend**: Next.js API-Routes mit SQLite (`better-sqlite3`, WAL-Mode) als embedded Storage
- **Validierung**: Zod
- **CSV**: PapaParse + Bank-Preset-Hooks
- **Tests**: Vitest
- **Optional KI**: Ollama (lokales LLM, Default-Port `11434`)

## Lokalität & Datenschutz

Alles bleibt auf dem Rechner:
- Keine externe API erforderlich
- Datenbank ist eine einzelne SQLite-Datei unter `app/data/`
- Ollama (falls aktiviert) läuft ebenfalls lokal
- Keine Telemetrie, keine Cloud-Sync, keine Auth (bewusst single-user, single-host)

## Konfiguration

Über `app/.env.local` (siehe `app/.env.example`):

| Variable | Default | Wirkung |
|---|---|---|
| `ALLOWED_ORIGINS` | `http://localhost:3000,http://127.0.0.1:3000` | Welche Origins darf der Browser auf mutierende Endpoints schicken |
| `ALLOWED_OLLAMA_HOSTS` | `localhost,127.0.0.1,::1` | Welche Hosts darf die `ollamaUrl`-Setting annehmen |
