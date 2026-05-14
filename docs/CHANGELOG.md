# Wesentliche Iterationen

Reverse-chronologisch — neueste zuerst.

## Iteration 8 — KI-Kategorisierung & Settings-Struktur

- **Top-Level-Navigation** „Daten" ↔ „Einstellungen" im Header
- **Settings-View** mit Sidebar-Sektionen: Kontogruppen, Kategorien, KI-Kategorisierung, Daten
- **Kategorien-Übersicht** (read-only): alle 23 Regeln aufklappbar mit Keywords + Patterns
- **Kategorien massiv erweitert**: ~830 Erkennungs-Einträge (vorher ~80); neue Kategorien Reisen & Urlaub, Bank-Gebühren & Zinsen, Spenden, Familie & Kinder, Haustier, Geschenke & Blumen
- **Ollama-Integration** für Sonstiges-Buchungen
  - Settings: URL + Modell-Auswahl + Connection-Test
  - Action-Button auf Daten-View „Mit KI kategorisieren" mit Progress
  - Server-seitige Klassifikation in Batches von 3
  - Treffer als Manual-Override gespeichert (überschreibt Regel-Logik bei Re-Imports nicht)
- `settings`-Tabelle für Konfigurations-Persistenz

## Iteration 7 — Bank ≠ Kontogruppe

- Kontogruppe bekommt optionales `bank`-Feld (Verweis auf BankPreset)
- Beim Upload an eine Kontogruppe wird die Bank-Vorbelegung automatisch angewendet (Mapping, Separator, Hooks)
- Bank wird in Manager-Liste und Upload-Chips angezeigt
- Klare Trennung: mehrere Kontogruppen können dieselbe Bank teilen, eine Person kann mehrere Banken nutzen

## Iteration 6 — DKB & comdirect Support

- `BankPreset` um `preprocess` und `rowTransform` Hooks erweitert
- **DKB-Preset**: überspringt Header-Metadaten, extrahiert eigene IBAN, wählt Counterparty aus Sender/Empfänger basierend auf Selbst-Tokens
- **comdirect-Preset**: parst konkatenierten Buchungstext per Regex in Name, IBAN, Verwendungszweck
- Date-Parser unterstützt 2-stelliges Jahr (`30.12.25` → 2025)
- Number-Parser-Heuristik für gemischte DE/US-Formate

## Iteration 5 — Kreditkarten-Settlement

- Neuer Kontogruppen-Typ `kreditkarte`
- Automatische Settlement-Erkennung: wenn Kreditkarten-Gruppe existiert und Bank-Buchung „AMERICAN EXPRESS", „VISA", „MASTERCARD" etc. im Namen hat → Umbuchung
- Manueller Umbuchungs-Toggle pro Transaktion (Badge in der Tabelle)
- `umbuchung_override` Spalte für Force-on / Force-off

## Iteration 4 — American Express

- AmEx-CSV-Preset (Komma-Separator, eigenes Spalten-Layout)
- `invertAmount`-Option für CSVs mit positiven Belastungen
- Date-Parser für `TT/MM/JJJJ`-Format
- Number-Parser-Verbesserung: erkennt US- vs. DE-Format an Position des Punkts

## Iteration 3 — Kontogruppen & Drill-Down

- Entität `Kontogruppen` (Name, Typ privat/gemeinsam/firma, Farbe, Icon)
- Pro-Kontogruppen-Filter mit Counts
- Automatische Umbuchungserkennung über IBAN-Matching (eigene IBAN vs. Counterparty-IBAN)
- Umbuchungen aus KPIs/Charts ausgeschlossen
- Edit-Form: Name, Typ, Farbe, Icon (20 Lucide-Icons zur Auswahl)
- **Drill-Down**: Klick auf Kategorie → Detail-View mit KPIs, Monatsverlauf, Empfänger-Aggregation und Buchungs-Liste pro Empfänger

## Iteration 2 — SQLite-Persistenz

- `better-sqlite3` als embedded DB unter `app/data/finanzen.db`
- Dedup über sha256-Hash (Datum + Betrag + IBAN + Verwendungszweck + Saldo)
- API-Routes für Transactions und Kontogruppen (REST)
- DB-Status-Banner mit Zeitraum + Import-Statistik
- Manuelle Kategorie-Änderungen als `is_manual_override` gespeichert (überschreiben Auto-Logik)

## Iteration 1 — MVP

- Next.js 16 mit App Router, Tailwind, Recharts, PapaParse
- CSV-Upload (Drag & Drop)
- 17 Kategorien mit Keyword-Matching
- Field-Mapping mit 4 Bank-Vorlagen
- Summary-Cards, Monatschart, Kategorie-Charts (Bar/Pie)
- Transaktions-Tabelle mit Suche, Filter, Sortierung
- Dark-Theme im Fintech-Stil
