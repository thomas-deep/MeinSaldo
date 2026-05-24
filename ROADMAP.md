# Roadmap

Lebendes Dokument. Reihenfolge innerhalb einer Prio-Stufe ist nicht festgelegt — getrieben durch User-Feedback und Beitragsbereitschaft.

Legende: **A** = nächste Iteration · **B** = mittelfristig · **C** = wenn Zeit/Lust · **gestrichen** = bewusst nicht.

## A — Priorität für Open-Source-Launch

**Abgeschlossen.** Alle A-Punkte sind umgesetzt — Details in `docs/CHANGELOG.md`.

- [x] **Recurring-Detection** — automatische Erkennung wiederkehrender Zahlungen (Abos, Miete, Gehalt) auf Basis Verwendungszweck + Betrag + Intervall. Inkl. Preisänderungs-Alert und serienweiser Kategorie-/Tag-Zuweisung.
- [x] **Vermögensübersicht / Net-Worth** — Kontogruppen-Salden automatisch plus manuelle Assets/Liabilities mit Werteverlauf. Inkl. Konto-Anker zur Saldo-Rekonstruktion.
- [x] **Tags** quer zu Kategorien (z. B. `urlaub-2025`, `renovierung`) für Querschnitts-Auswertungen.
- [x] **First-class Search** — FTS5-Index über Verwendungszweck/Counterparty, globale Such-Palette (⌘K). (Speicherbare Filter-Presets → nach B verschoben.)
- [x] **API-Route-Tests** — Vitest mit isolierter In-Memory-SQLite pro Test.
- [x] **Contribution-Guide & CSV-Mithilfe-Workflow** — siehe `CONTRIBUTING.md` und `docs/CSV_FORMATS.md`.
- [x] **Kategorie-Übernahme aus dem Verlauf** — neue Importe erben die Kategorie gleicher früherer Buchungen (zusätzlich geliefert).

## B — Mittelfristig

- [ ] **Budgets / Sollwerte pro Kategorie** mit Soll-Ist-Vergleich und Überschreitungs-Warnung.
- [ ] **Sparziele / Töpfe** im Envelope-Budgeting-Stil (YNAB-ähnlich).
- [ ] **Forecasting** — Kontostand-Prognose basierend auf erkannten Recurrings + Trend.
- [ ] **Mobile-View / responsive Layout** — aktuell desktop-fokussiert.
- [ ] **E2E-Tests** mit Playwright (siehe `docs/AUDIT.md`).
- [x] **CSV-Encoding-Override pro Bank-Preset** — Auto-Detect-Heuristik (UTF-8-BOM, strict-UTF-8-Probe, sonst windows-1252) löst die meisten Sparkasse/Volksbank-Fälle automatisch; UI-Override bleibt.
- [x] **CSV-Vorlagen-Pflege** — Issue-Templates für neue Bank-Presets und Format-Drift, Beitrags-Workflow in `CONTRIBUTING.md` und `docs/CSV_FORMATS.md` verlinkt. Code-Beitrag bleibt optional, Sample-only-Beitrag reicht.
- [x] **Speicherbare Filter-Presets** — Zeitraum-/Typ-/Such-Kombinationen auf der Auswertung benennen und wiederverwenden (Dropdown in der Filter-Leiste).
- [x] **IBAN-basierte Konto-Zuordnung beim Import** — `iban` als optionales Feld in `kontogruppen` (Verwaltung-UI). Beim CSV-Import wird die `IBAN Auftragskonto` aus der ersten Datenzeile gegen die gepflegten IBANs gematcht und das Konto automatisch vorausgewählt.

## C — Wenn Zeit/Lust

- [ ] **Splits** — eine Transaktion auf mehrere Kategorien/Beträge aufteilen.
- [ ] **Belege/Attachments** pro Transaktion (PDF dranhängen).
- [ ] **Steuer-Export** — kategoriebasierter CSV-Export für Steuerberater oder Steuersoftware.
- [ ] **Backup/Restore-UI** — verschlüsselter DB-Export für Geräte-Wechsel.

## Bewusst nicht (X)

- **Mehrwährungs-Support** — App ist explizit EUR-only.
- **Aktive Konto-Anbindung (FinTS / PSD2)** — regulatorisch und UX-Bruch im Open-Source-Single-User-Modell; CSV bleibt der Weg.
- **Cloud/Server-Auth** — bewusst Single-User-Localhost.
- **Externe Telemetrie/Analytics** — nicht im Geist der App.

## Bekannte Bugs (aus `docs/AUDIT.md`)

Werden im Zuge angefasster Stellen behoben, nicht als eigene Roadmap-Posten:

- Dedup-Hash inkl. `kontogruppeId` (führt zu Re-Insert bei Konto-Wechsel)
- `is_manual_override`-Flag kollidiert zwischen User- und KI-Edits
- DKB-Preprocess scannt nur die ersten 20 Zeilen
- `TransactionTable` hartes `slice(0, 200)`
- `localeCompare` ohne Locale-Argument

## Mitmachen

Siehe [`CONTRIBUTING.md`](CONTRIBUTING.md). Besonders willkommen: anonymisierte CSV-Samples weiterer Banken (Workflow in [`docs/CSV_FORMATS.md`](docs/CSV_FORMATS.md)).
