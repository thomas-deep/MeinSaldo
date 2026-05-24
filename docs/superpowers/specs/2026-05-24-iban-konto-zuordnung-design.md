# IBAN-basierte Konto-Zuordnung beim CSV-Import

**Datum:** 2026-05-24
**Roadmap-Bezug:** B-Punkt „IBAN-basierte Konto-Zuordnung beim Import"

## Ziel

Beim CSV-Import wird die Kontogruppe automatisch vorausgewählt, sofern die `IBAN Auftragskonto` der CSV-Datei einer in den Einstellungen gepflegten Kontogruppe entspricht. Das eliminiert das manuelle Konto-Picken pro Import in der häufigsten Konstellation (eine CSV gehört eindeutig zu genau einem gepflegten Konto).

## Scope

**Enthalten:**
- IBAN als optionales, eindeutiges Feld in `kontogruppen`
- Verwaltung der IBAN im bestehenden `KontogruppenManager`
- Auslesen der IBAN aus dem ersten CSV-Datensatz
- Client-seitiges Matching im `KontoPicker` mit dezentem Hinweis

**Bewusst nicht enthalten:**
- Auto-Anlegen neuer Kontogruppen, wenn die IBAN unbekannt ist
- Harte Blockierung, wenn der Nutzer eine andere Kontogruppe wählt als die gematchte
- IBAN-Validierung (Mod-97, Länderspezifika)
- Mehrere IBANs pro Kontogruppe
- Bulk-Backfill für bestehende Kontogruppen — Nutzer trägt manuell nach

## Datenmodell

Neue Spalte in `kontogruppen` über `ensureColumn` in `src/lib/db.ts`:

```sql
iban TEXT
```

UNIQUE-Constraint wird über einen partial Unique Index ergänzt (SQLite erlaubt mehrere `NULL` in einem normalen UNIQUE-Constraint, aber ein partial index ist explizit und überlebt `ensureColumn` sauber):

```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_kontogruppen_iban
  ON kontogruppen(iban) WHERE iban IS NOT NULL;
```

Normalform der IBAN: uppercase, ohne Whitespace. Wird im Backend vor jedem Insert/Update erzwungen, damit der Index zuverlässig matched.

## Backend

### `src/lib/iban.ts` (neu)

Kleines Modul mit zwei Funktionen:

- `normalizeIban(input: string | null | undefined): string | null` — trim, uppercase, alle Whitespaces entfernen. Leerer String → `null`.
- `formatIbanForDisplay(iban: string): string` — fügt 4er-Gruppen-Spaces für die UI ein (rein kosmetisch).

Keine Mod-97-Prüfung. Begründung: Das Feature matched nur, es validiert nicht.

### `src/lib/db.ts`

- `ensureColumn(db, "kontogruppen", "iban", "TEXT")` in `getDb()`
- `CREATE UNIQUE INDEX IF NOT EXISTS …` direkt danach
- Migration-Version hochzählen falls vorhanden

### `/api/kontogruppen` (POST) und `/api/kontogruppen/[id]` (PUT)

- Body um optionales Feld `iban` erweitern
- Vor dem Insert/Update durch `normalizeIban` schleusen
- Bei `SqliteError` mit Code `SQLITE_CONSTRAINT_UNIQUE`: HTTP 409 mit `{ error: "Diese IBAN ist bereits einer anderen Kontogruppe zugeordnet." }`

Kein neuer Endpoint für IBAN-Lookup: Das Frontend lädt die Kontogruppen ohnehin bereits über `GET /api/kontogruppen` und kann clientseitig matchen.

### `src/lib/parse-csv.ts`

`detectCsvHeaders` (bzw. der äquivalente Detect-Pfad, der bereits das Bank-Preset auswählt) gibt zusätzlich ein optionales Feld `detectedIban: string | null` zurück:

- Wenn das gewählte Preset ein `ibanKonto`-Mapping hat und die erste Datenzeile in dieser Spalte einen Wert enthält, wird dieser via `normalizeIban` normalisiert und zurückgegeben.
- Sonst `null`.

Damit bleibt der Pfad robust: Presets ohne `ibanKonto` (aktuell `comdirect`, `American Express`) liefern einfach `null` und das Verhalten bleibt wie heute.

## Frontend

### `KontogruppenManager.tsx`

Neues optionales Eingabefeld „IBAN (optional)" im Create-/Edit-Formular:

- Anzeige in 4er-Gruppen via `formatIbanForDisplay` für Lesbarkeit
- Submit sendet den rohen Wert; Normalisierung passiert im Backend
- 409 vom Backend wird als Inline-Fehler unter dem Feld angezeigt („Diese IBAN ist bereits einer anderen Kontogruppe zugeordnet.")

### `CsvImportPreview.tsx` / `KontoPicker.tsx`

- Nach Detect übergibt der Import-Flow das neue `detectedIban` an den `KontoPicker`.
- Der Picker holt sich die Kontogruppen (bereits vorhanden) und sucht das erste Element mit `kg.iban === detectedIban` (beide normalisiert).
- Bei Treffer: dieses Konto wird als initial selektiert. Über der Picker-Reihe erscheint ein dezenter Hinweis im bestehenden Hint-Stil:
  > Automatisch erkannt anhand IBAN DE••8901 (letzte 4 Stellen der detektierten IBAN, davor maskiert)
- Bei keinem Treffer (oder `detectedIban === null`): bisheriges Verhalten, keine Vorauswahl, kein Hinweis.
- Manuelles Überschreiben durch den Nutzer ist jederzeit möglich; der Hinweis verschwindet sobald er aktiv ein anderes Konto wählt.

## Tests (Vitest, In-Memory-SQLite)

1. **`iban.ts`** — Unit-Tests für `normalizeIban`:
   - Whitespace + lower-/upper-case Mischung → erwartete Normalform
   - Leerstring / nur Whitespace / `null` / `undefined` → `null`
2. **`db.ts` Schema** — `iban`-Spalte existiert nach `getDb()`, partial unique index ist registriert.
3. **`/api/kontogruppen`** — POST mit `iban: "de89 3704 0044 0532 0130 00"` legt Kontogruppe an; zweiter POST mit identischer (oder leicht anders formatierter) IBAN antwortet mit 409.
4. **`/api/kontogruppen/[id]`** — PUT mit IBAN, die bereits einer anderen Kontogruppe gehört → 409.
5. **`parse-csv.ts`** — Beispiel-CSV mit IBAN-Auftragskonto-Header → `detectedIban` liefert die normalisierte IBAN; Beispiel ohne entsprechende Spalte → `null`.

UI-Verifikation (manuell im Browser, gemäß `CLAUDE.md`):

- IBAN-Feld im Settings-Tab speichern
- Echte CSV importieren, prüfen dass die richtige Kontogruppe vorausgewählt ist und der Hinweis erscheint
- Zweite Kontogruppe mit derselben IBAN anlegen wollen → 409-Fehler sichtbar

## Risiken / Edge Cases

- **Whitespace in Bank-Exports:** Einige Banken liefern IBANs mit eingestreuten Spaces. `normalizeIban` deckt das ab. Wird in Test 1 abgedeckt.
- **Leerer IBAN-Wert in CSV-Zelle:** `parse-csv` liefert `null`, kein Match — kein Crash.
- **Falscher Match durch Tippfehler in gepflegter IBAN:** Akzeptiert. Nutzer kann manuell umstellen, das ist günstiger als eine Vollvalidierung einzubauen.
- **Migration auf bestehenden DBs:** `ensureColumn` ist idempotent. Index `CREATE … IF NOT EXISTS` ebenfalls.
