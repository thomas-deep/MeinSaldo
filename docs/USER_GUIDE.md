# Nutzer-Anleitung

## Grundkonzept

Die App arbeitet mit drei sauber getrennten Konzepten:

- **Inhaber** = *wem gehört's* (z. B. eine Privatperson, ein gemeinsames Konto, eine Firma). Trägt Typ (privat / gemeinsam / firma) und Farbe.
- **Kontogruppe** = *welches konkrete Konto* (Giro, Visa, Tagesgeld, Depot). Gehört zu einem Inhaber, hat eine Kontoart (Girokonto / Sparkonto / Kreditkarte / Depot / Sonstiges) und optional eine Bank-Voreinstellung.
- **Bank-Preset** = *wie eine CSV zu parsen ist* (Trennzeichen, Spalten-Mapping, Encoding, Vorzeichen). Pro Bank fest hinterlegt.

Ein Inhaber kann beliebig viele Kontogruppen haben. Mehrere Kontogruppen können dieselbe Bank teilen (z.B. drei Firmenkonten bei der Volksbank). Eine Person kann Konten bei verschiedenen Banken haben (DKB + AmEx).

## Erstmaliger Setup

1. **Inhaber anlegen** (rechts oben → **Einstellungen → Inhaber & Konten**)
   - Z.B. „Privat", „Gemeinsam", „Firma X"
   - Typ und Farbe wählen
2. **Kontogruppen anlegen** (gleiche Seite, untere Sektion)
   - Klick auf „+ Konto" am Inhaber-Header
   - Name (z.B. „Giro", „Visa", „Tagesgeld"), Kontoart und Bank-Vorbelegung wählen
   - Farbe und Icon sind frei wählbar
3. **Erste CSV importieren** (Top-Nav: **Daten**)
   - Datei per Drag & Drop oder Klick wählen
   - Upload-Ziel und Encoding wählen (Encoding `auto` zieht aus dem Bank-Preset)
   - **Vorschau** öffnet sich — Buchungen werden angezeigt mit Status `neu` / `bereits vorhanden`
   - Klick auf einen der drei Import-Buttons:
     - **Importieren** — Regelbasiert (keine KI)
     - **+ KI für Sonstiges** — Regeln zuerst, KI für die `Sonstiges`-Reste
     - **+ Alles KI** — KI klassifiziert alles neu (überschreibt Regel-Match)
4. **Optional: KI aktivieren** (Einstellungen → KI-Kategorisierung)
   - [Ollama](https://ollama.com/download) lokal installieren
   - Modell ziehen, z.B. `ollama pull llama3.2:3b`
   - In der App: „Verbindung testen & Modelle laden", Modell wählen, Toggle an

## Daten-Ansicht

### 1. Dropzone
CSV per Drag & Drop oder Klick auswählen. Editorial-Headline zeigt den Dateinamen nach Auswahl.

### 2. Settings-Bar
Kompakte Pills: **Konto** (welche Kontogruppe) und **Encoding** (auto / utf-8 / windows-1252). `auto` nimmt das Encoding aus dem Bank-Preset der gewählten Kontogruppe.

### 3. Feld-Mapping (collapsable)
- Bank-Vorlage wechseln
- Trennzeichen anpassen
- „Vorzeichen umkehren" für AmEx-artige Formate
- Einzelne Spalten manuell zuordnen
- „Mit aktuellem Mapping neu parsen" lädt die Vorschau neu — ohne nochmal hochzuladen

### 4. Vorschau
Zeigt **vor dem Insert**: Anzahl geparster Buchungen, Datums-Range, Encoding, die ersten 30 Zeilen mit erkannter Kategorie. Status pro Zeile: `neu` (grün, voll) oder `bereits vorhanden` (grau, ausgeblendet).

Drei Import-Modi als Buttons:
- **Importieren** (Standard): Regelbasiert, Buchungen ohne Match landen in „Sonstiges"
- **+ KI für Sonstiges**: Nach Import läuft die KI über alle Sonstiges-Buchungen
- **+ Alles KI**: Nach Import klassifiziert die KI alle neuen Buchungen (force-Modus überschreibt Regel-Match)

### 5. DB-Status
Anzahl gespeicherter Transaktionen, Zeitraum, Ergebnis des letzten Imports, **„DB leeren"**.

### 6. Import-Historie
**Pro Import-Batch** ein Eintrag: Anzahl, relative Zeit („vor 9 Min."), Zeitraum, aktuelles Konto. Aktionen:
- **„Konto wechseln…"** — verschiebt alle Buchungen dieses Imports auf eine andere Kontogruppe (falls beim Upload falsch zugeordnet)
- **„Import löschen"** — entfernt den gesamten Batch aus der DB

## Auswertung

### Filter (collapsable)
**Zeitraum**: Alle Zeit / Lfd. Monat / Vormonat / Lfd. Quartal / Vorquartal / Lfd. Jahr / Vorjahr / Letzte 12 Monate / Benutzerdefiniert (von/bis-Picker).

**Weitere Filter**: Typ (Alle / Einnahmen / Ausgaben), Min-Betrag, Volltext-Suche.

**Vorjahresvergleich** (Toggle, nur bei eingegrenztem Zeitraum): die SummaryCards zeigen Delta zum gleichen Zeitraum im Vorjahr (Ausgaben-Rückgang grün, Anstieg rot).

### Kontogruppen-Filter (hierarchisch)
- **Gesamt** — alle Buchungen
- Pro Inhaber ein Container mit: Inhaber-Button (aggregiert alle Konten) + die einzelnen Konto-Pills
- **Nicht zugeordnet** für historische Imports ohne Gruppe

### SummaryCards
**Einnahmen / Ausgaben / Saldo / Sparquote** mit Editorial-Display-Font. Umbuchungen sind aus den Summen ausgeschlossen, werden separat ausgewiesen. Bei Vorjahresvergleich: Delta-Reihe unten mit Pfeil-Icons.

### Dashboard
- **Monatliche Übersicht** — Balken pro Monat. **Klick auf einen Monat** setzt den Zeitraum-Filter auf diesen Monat.
- **Ausgaben/Einnahmen nach Kategorie** — Balken oder Donut. Mini-Slices < 1 % zu „Übrige Kleinposten" zusammengefasst.
- **Drill-Down** bei Klick auf eine Kategorie: KPIs, Monatsverlauf für die Kategorie, gruppierte Gegenparteien-Liste mit einzelnen Buchungen. Breadcrumb (klickbar zurück).

### Transaktionen
Volltextsuche, Typ-/Kategorie-Filter, sortierbar nach Datum/Name/Kategorie/Betrag, paginiert (200/Seite).

**Pro Zeile**: manueller Umbuchungs-Toggle (gelbes Badge), Kontogruppen-Badge mit Farbe, Kategorie-Dropdown, Tag-Chips + Tag-Button (Popover zum Zuweisen).

**Multiselect mit Bulk-Aktionen** (Checkbox-Spalte + Header-Checkbox „alle dieser Seite"):
- **Kategorie ändern…** — Dropdown
- **Konto wechseln…** — Dropdown (alle Kontogruppen + „keine Zuordnung")
- **Umbuchung** / **keine** — markieren oder Markierung entfernen
- **KI** — Re-Klassifikation der Auswahl (force-Modus)
- **Löschen** — mit Bestätigungs-Dialog

## Globale Suche

Mit **⌘K** (Mac) bzw. **Strg+K** oder dem Such-Button im Header öffnet sich eine
Suchpalette. Sie durchsucht Verwendungszweck, Empfänger und Buchungstext aller
Transaktionen per Volltextindex — Umlaute spielen keine Rolle, ab zwei Zeichen
wird als Wortanfang gesucht. Klick auf ein Ergebnis öffnet die Auswertung,
gefiltert auf den jeweiligen Empfänger. **Esc** schließt.

## Wiederkehrend

Der Tab **Wiederkehrend** erkennt automatisch regelmäßige Zahlungen (Abos,
Miete, Gehalt). Eine Serie braucht mindestens drei Buchungen vom selben
Empfänger in regelmäßigem Abstand (monatlich, quartalsweise oder jährlich).

- Posten mit **Preisänderung** (letzter Betrag weicht > 8 % vom Durchschnitt ab)
  werden oben in einer eigenen Sektion hervorgehoben — praktisch zum Aufspüren
  stillschweigender Abo-Erhöhungen.
- Pro Serie: Intervall, Anzahl Buchungen, letzter und ø-Betrag, geschätzter
  nächster Termin.

## Vermögen

Der Tab **Vermögen** zeigt den Net Worth: Vermögen minus Verbindlichkeiten.

- **Bankkonten zählen automatisch** — der letzte bekannte Saldo jeder
  Kontogruppe wird übernommen (Giro/Sparkonto als Vermögen, Kreditkarte als
  Verbindlichkeit). Diese Einträge tragen das Badge „aus Konto" und müssen
  nicht gepflegt werden.
- **Manuelle Posten** für alles, was nicht im CSV steht: Depot-Werte,
  Immobilien, Kredite. Über „Hinzufügen" anlegen, dann per „Wert" einen
  datierten Eintrag setzen. Mehrere Einträge ergeben den Verlauf.
- Das Verlaufsdiagramm kombiniert Konto-Monatsenden mit den manuellen
  Snapshots zu einer monatlichen Net-Worth-Kurve.

## Einstellungen

### Inhaber & Konten
- **Inhaber** anlegen / bearbeiten / löschen (Löschen blockiert, solange noch Konten dranhängen)
- **Kontogruppen** gruppiert nach Inhaber. Pro Inhaber „+ Konto"-Button. Konkrete Konten mit Art (Giro/Spar/Kreditkarte/Depot) + Bank.

### Kategorien
- Voll editierbar: Name, Keywords-Chips, Namens-Patterns-Chips
- Reihenfolge entscheidet (erste passende Regel gewinnt)
- „+ Neue Kategorie" für eigene Kategorien
- Fallback-Kategorien (Sonstiges / Sonstige Einnahmen) sind gesperrt
- Beim Löschen einer Kategorie werden Buchungen auf „Sonstiges" zurückgesetzt

### Tags
- Frei vergebbare Labels **quer zu Kategorien** — z. B. `urlaub-2025`,
  `renovierung`, `steuer`. Eine Transaktion kann beliebig viele Tags tragen.
- Hier werden Tags angelegt und gelöscht (mit Farbauswahl). Das Zuweisen
  an Buchungen passiert in der Transaktionen-Tabelle über das Tag-Popover
  pro Zeile.
- Beim Löschen eines Tags verschwinden nur die Verknüpfungen — die
  Buchungen selbst bleiben unberührt.

### KI-Kategorisierung
- Ollama-Toggle (Toggle-Slider)
- URL (Default `http://localhost:11434`, nur Loopback-Hosts erlaubt)
- Modell-Auswahl nach Verbindungstest
- Empfehlung: `llama3.2:3b` (schnell) oder `qwen2.5:7b` (genauer, langsamer)
- Drei Eintrittspunkte für die KI:
  1. **„Neukategorisieren" auf der Daten-Seite** — Dropdown am DB-Status:
     KI auf „Sonstiges" oder Komplett-KI über alle Buchungen
  2. **Multiselect-Bulk in der Tabelle** — force-Modus, überschreibt alles
  3. **Bei Import** — automatisch über die zwei Import-Buttons mit Sparkle-Icon

### Datenbank (Sicherung & Wiederherstellung)

Komplette Sicherungen der Datenbank — eine Sicherung enthält **alles**
(Buchungen, Konten, Kategorien, Tags, Vermögen, Einstellungen).

- **Sicherung erstellen** — wahlweise **verschlüsselt** (Schalter „Verschlüsseln"
  + Passwort). Zwei Wege:
  - **Im Speicher ablegen** — landet unter `data/backups/` (im Docker-Setup auf
    dem persistenten Volume) und erscheint in der Liste.
  - **Herunterladen** — lädt die Sicherung direkt als Datei, ohne sie abzulegen.
- **Abgelegte Sicherungen** — Liste mit Datum, Größe und Schloss-Symbol bei
  verschlüsselten. Pro Eintrag: **Herunterladen**, **Wiederherstellen**, **Löschen**.
- **Aus Datei wiederherstellen** — eine zuvor heruntergeladene `.db`- oder
  `.msbak`-Datei hochladen und einspielen.
- Beim Wiederherstellen wird die aktuelle Datenbank **vollständig ersetzt** —
  direkt davor legt die App **automatisch eine Schutz-Sicherung** des jetzigen
  Standes an (ebenso vor „DB leeren"). Bei einer verschlüsselten Sicherung wird
  nach dem Passwort gefragt.

> **Wichtig — Verschlüsselung:** Das Passwort wird nirgends gespeichert. Geht es
> verloren, ist die verschlüsselte Sicherung **nicht** wiederherstellbar.

> **Hinweis — Daten auf der Platte:** Die Datenbank selbst (`app/data/finanzen.db`
> bzw. das Docker-Volume) liegt **unverschlüsselt**. Wer das absichern will,
> sollte für Datenträger-/Ordner-Verschlüsselung (z. B. FileVault, LUKS,
> verschlüsseltes NAS-Volume) und Zugriffsschutz sorgen. Die Backup-Verschlüsselung
> oben schützt nur die **Sicherungsdateien**, nicht die laufende Datenbank.

### Logs
Audit-Trail für KI-Klassifikationen (mit Prompt + Antwort), Imports, DB-Operationen und Settings-Änderungen. Filter nach Event-Typ, klickbare Zeilen klappen JSON-Details aus. Auto-Trim bei >5000 Einträgen.

## Umbuchungs-Logik im Detail

Eine Buchung gilt als Umbuchung wenn:

1. **Paar-Match** (greedy): es gibt eine Buchung mit gleichem absoluten Betrag, anderer Kontogruppe und ≤3 Tagen Abstand. Beide Seiten werden markiert.
2. **IBAN-Match**: die Gegen-IBAN passt zu einer eigenen IBAN aus der DB.
3. **Kreditkarten-Settlement**: eine Kontogruppe mit Art `kreditkarte` existiert UND der Gegenparteien-Name enthält „MASTERCARD" / „VISA" / „AMEX" / …
4. **Manueller Override** über das Umbuchungs-Badge in der Tabelle

Umbuchungen werden aus Summen und Charts ausgeschlossen, bleiben aber in der Tabelle sichtbar (gelbes Badge).

**Beispiel Kreditkartenflow**:
- AmEx-CSV in Kontogruppe „Privat · Visa" (Art: Kreditkarte) hochladen → 50 Einzelbuchungen (Spotify, Amazon, …)
- Bank-CSV in „Privat · Giro" hochladen → die monatliche AmEx-Sammelabbuchung von 280 € wird automatisch als Umbuchung erkannt
- Im Filter „Gesamt": echte Ausgaben aus AmEx-CSV werden gezählt, Sammelabbuchung wird ignoriert → keine Doppelzählung

## Tipps

- **Falsche Konto-Zuordnung beim Import?** Daten-Seite → **Import-Historie** → „Konto wechseln…" oder „Import löschen"
- **Manuelle Kategorien sind robust** — einmal korrigiert, überschreibt das auch ein späterer KI-Lauf nicht (außer im force-Modus aus der Tabelle)
- **Mehrere CSVs derselben Bank** kannst du hintereinander hochladen — Dedup verhindert Doppelung
- **Vorjahresvergleich** wird interessant, sobald du einen festen Zeitraum gewählt hast (Lfd. Jahr, Lfd. Monat, …)
- **Light/Dark-Toggle** oben rechts (☀ / ▭ / ☾), respektiert auch dein System-Theme
