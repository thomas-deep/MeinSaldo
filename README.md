# Finanz-Auswertung

Lokales Web-Tool zur Aufbereitung von Konto- und Kreditkarten-CSV-Exporten. Importiert mehrere Banken parallel, erkennt Umbuchungen zwischen eigenen Konten, kategorisiert automatisch (optional via lokalem LLM über Ollama) und liefert Dashboard, Drill-Downs sowie eine durchsuchbare Transaktions-Tabelle.

## Schnellstart

```bash
cd app
npm install
npm run dev
```

App läuft danach auf [http://localhost:3000](http://localhost:3000). Alles liegt lokal — die SQLite-Datenbank wird unter `app/data/finanzen.db` angelegt.

## Was kann das Tool?

- **CSV-Import** für Volksbank/ING, DKB, Sparkasse, Commerzbank, Deutsche Bank, comdirect, American Express (mit pro-Bank-spezifischer Header- und Buchungstext-Verarbeitung)
- **Mehrere Konten parallel** über frei definierbare *Kontogruppen* (privat / gemeinsam / firma / kreditkarte), jede mit eigener Bank- und Icon-Zuordnung
- **Dedup** beim Re-Import (gleiche Buchung wird nicht doppelt eingefügt)
- **Umbuchungs-Erkennung** zwischen eigenen Konten (per IBAN-Matching und Kreditkarten-Settlement-Heuristik)
- **23 vordefinierte Ausgaben-/Einnahmen-Kategorien** mit ~830 Keywords/Merchant-Patterns
- **Optional**: KI-Kategorisierung über lokales Ollama-LLM für unklare Buchungen
- **Manuelle Override**: jede Kategorie und jeder Umbuchungs-Status ist pro Buchung änderbar, Änderungen bleiben bei Re-Imports erhalten
- **Drill-Down** von Kategorie → Empfänger/Absender → einzelne Buchungen
- **Pro-Kontogruppen-Filter** mit Auswertung gesamt vs. einzeln

## Dokumentation

- **[docs/USER_GUIDE.md](docs/USER_GUIDE.md)** — Anleitung für Nutzer: Workflows, Banken-Setup, Kategorien, KI
- **[docs/TECHNICAL.md](docs/TECHNICAL.md)** — Architektur, Datenmodell, API, Erweiterung
- **[docs/CSV_FORMATS.md](docs/CSV_FORMATS.md)** — Bank-spezifische Eigenheiten und Mapping-Details
- **[docs/CHANGELOG.md](docs/CHANGELOG.md)** — Wesentliche Änderungen pro Iteration

## Technik-Stack

- **Frontend**: Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS, Recharts, Lucide-Icons
- **Backend**: Next.js API-Routes mit SQLite (`better-sqlite3`) als embedded Storage
- **CSV**: PapaParse + pro-Bank-spezifische Preprocessing-Hooks
- **Optional KI**: Ollama (lokales LLM, Default-Port `11434`)

## Lokalität & Datenschutz

Alles bleibt auf dem Rechner:
- Keine externe API erforderlich
- Datenbank ist eine einzelne SQLite-Datei unter `app/data/`
- Ollama (falls aktiviert) läuft ebenfalls lokal
- Kein Telemetrie, keine Cloud-Sync, keine Auth (single-user, single-host)
