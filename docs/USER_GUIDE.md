# Nutzer-Anleitung

## Grundkonzept

Die App arbeitet mit zwei unabhängigen Konzepten:

- **Kontogruppe** = *wer / was* (Privat, Familie, Firma A, Firma B, AmEx Privat …). Trägt Typ, Farbe, Icon und optional eine Bank-Voreinstellung.
- **Bank-Preset** = *wie eine CSV zu parsen ist* (Trennzeichen, Spalten-Mapping, Vorzeichen-Logik, Header-Skipping). Pro Bank fest hinterlegt.

Eine Kontogruppe kann eine Bank-Voreinstellung tragen, dann wird beim Upload automatisch der richtige Parser benutzt. Mehrere Kontogruppen können dieselbe Bank teilen (z.B. 3 Firmenkonten bei der Volksbank), und eine Person kann Kontogruppen bei verschiedenen Banken haben (z.B. DKB + AmEx).

## Erstmaliger Setup

1. **Kontogruppen anlegen** (rechts oben „Einstellungen" → „Kontogruppen")
   - Pro echtem Konto eine Gruppe — z.B. „Privat (DKB)", „Gemeinsam (DKB)", „Firma A (Volksbank)", „AmEx Privat", „AmEx Firma"
   - Bank-Vorbelegung im Dropdown wählen
   - Typ (privat / gemeinsam / firma / kreditkarte), Farbe und Icon sind frei wählbar
2. **Erste CSV hochladen** (zurück auf „Daten")
   - Upload-Ziel-Chip oben wählen (passende Kontogruppe)
   - CSV per Drag & Drop oder Klick hochladen
   - Bei Bank-Voreinstellung läuft der richtige Parser automatisch
3. **Optional: KI aktivieren** (Einstellungen → KI-Kategorisierung)
   - Ollama lokal installieren ([ollama.com/download](https://ollama.com/download))
   - Modell ziehen, z.B. `ollama pull llama3.2:3b`
   - „Verbindung testen & Modelle laden", Modell auswählen
   - Auf der Daten-Seite erscheint ein Button „Sonstiges mit KI füllen", sobald es unklare Buchungen gibt

## Daten-Ansicht

### Upload-Bereich
- **Upload-Ziel-Chips** zeigen alle Kontogruppen + die zugeordnete Bank
- Wird vor dem Drop keine Gruppe gewählt, kommt ein gelber Rückfrage-Dialog nach dem Drop
- Nach dem Upload zeigt der **DB-Status** Anzahl + Zeitraum gespeicherter Buchungen sowie das Ergebnis des letzten Imports (X neu, Y Duplikate übersprungen)

### Feld-Mapping (ausklappbar)
Wird sichtbar, sobald eine CSV geladen ist. Hier kann man:
- Ein anderes Bank-Preset wählen
- Trennzeichen anpassen
- „Vorzeichen umkehren" für CSV-Formate mit positiven Beträgen bei Ausgaben (AmEx-Pattern)
- Einzelne Spalten manuell zuordnen
- Mit „Neu importieren" werden die Daten mit der angepassten Konfiguration nochmal verarbeitet

### Filter
Falls Kontogruppen existieren, erscheint eine Filterleiste mit Counts:
- „Gesamt (N)" zeigt alle Daten
- Pro Gruppe ein eigener Tab
- „Nicht zugeordnet" für historische Imports ohne Gruppe

Alle Auswertungen unten reagieren auf den Filter.

### KPIs (Summary-Cards)
- **Einnahmen** / **Ausgaben** / **Saldo** / **Sparquote**
- Umbuchungen zwischen eigenen Konten werden **automatisch ausgeschlossen** und unten ausgewiesen ("N Umbuchungen, X € Volumen")

### Dashboard
- **Monatliche Übersicht** (Balken: Einnahmen vs. Ausgaben pro Monat)
- **Ausgaben nach Kategorie** und **Einnahmen nach Kategorie** (Balken oder Kreis)
- Klick auf eine Kategorie → **Drill-Down**:
  - KPIs der Kategorie
  - Monatsverlauf für nur diese Kategorie
  - Liste der Gegenparteien (Empfänger/Absender), gruppiert nach Name + IBAN, sortierbar
  - Pro Gegenpartei aufklappbar → einzelne Buchungen
  - Breadcrumb „Dashboard › Ausgaben › Lebensmittel"

### Transaktionen
- Volltextsuche
- Filter nach Typ (Einnahmen / Ausgaben) und Kategorie
- Sortierbar nach Datum, Name, Kategorie, Betrag
- **Manuelle Kategorie-Änderung** per Dropdown — wird persistiert und bei Re-Imports nicht überschrieben
- **Manueller Umbuchungs-Toggle** (kleines Badge "Umbuchen?") zum Markieren/Aufheben einzelner Buchungen
- **Kontogruppen-Badge** mit Farbe pro Zeile

## Einstellungen

### Kontogruppen
- Anlegen, Bearbeiten (Stift-Icon), Löschen (Mülleimer)
- Beim Löschen bleiben Transaktionen erhalten, werden aber zur Gruppe entkoppelt
- Bank-Vorbelegung kann nachträglich geändert werden

### Kategorien
- Übersicht aller eingebauten Klassifikations-Regeln (23 Kategorien)
- Pro Kategorie aufklappbar: alle Keywords und Namens-Patterns
- Hilft zu verstehen, *warum* eine Buchung in einer bestimmten Kategorie gelandet ist

### KI-Kategorisierung
- Ollama-Aktivierung an/aus
- URL (Default `http://localhost:11434`)
- Modell-Auswahl nach Verbindungstest
- Empfehlung: `llama3.2:3b` (schnell, ausreichend gut) oder `qwen2.5:7b` (genauer, langsamer)
- KI wird nur für Buchungen mit Kategorie „Sonstiges" / „Sonstige Einnahmen" eingesetzt, die nicht manuell überschrieben wurden

### Daten
- DB-Status (Anzahl, Zeitraum)
- Letztes Import-Ergebnis
- **„DB leeren"** löscht alle Transaktionen (Kontogruppen bleiben). Mit Bestätigungs-Dialog.

## Umbuchungs-Logik im Detail

Eine Buchung gilt als Umbuchung wenn:

1. Die Gegen-IBAN zu einer eigenen IBAN passt (irgendwo in der DB als `iban_konto` vorhanden), **oder**
2. Eine Kontogruppe vom Typ `kreditkarte` existiert UND der Gegenparteien-Name auf eine Kreditkarten-Marke matcht (American Express, AmEx, Visa Europe, Mastercard, Diners Club), **oder**
3. Die Buchung wurde manuell als Umbuchung markiert

Umbuchungen werden überall aus Summen, Charts und Drill-Downs ausgeschlossen, bleiben aber in der Tabelle sichtbar (mit gelbem Badge).

**Beispiel Kreditkartenflow**:
- AmEx-CSV in Kontogruppe „AmEx Privat" hochladen → 50 Einzelbuchungen werden importiert (Spotify, Amazon, …)
- Bank-CSV in „Privat (DKB)" hochladen → die monatliche AmEx-Sammelabbuchung von z.B. 280 € wird automatisch als Umbuchung erkannt (da Kontogruppe vom Typ Kreditkarte existiert und Name „AMERICAN EXPRESS" enthält)
- Im Filter „Gesamt": echte Ausgaben aus AmEx-CSV werden gezählt, Sammelabbuchung wird ignoriert → keine Doppelzählung

## Tipps

- **Manuelle Kategorien sind gold wert**: einmal korrigiert, bleibt der Override stehen — auch bei Re-Import
- **KI-Lauf nach jedem Import**: einfach Button drücken, der LLM klassifiziert nur Sonstiges-Buchungen
- **Mehrere CSVs derselben Bank**: einfach hintereinander hochladen, Dedup verhindert Doppelung
- **Datum-Range pro Konto**: lade alte CSVs nochmal hoch, um lückenlose Historie zu bauen
- **Falsche Umbuchung erkannt?**: einfach das gelbe Badge in der Tabelle anklicken, dann zählt sie wieder als normale Ausgabe/Einnahme
