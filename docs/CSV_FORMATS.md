# CSV-Format-Übersicht

Pro unterstützter Bank: Spalten-Layout, Besonderheiten, Mapping-Strategie.

## Volksbank / ING / Standard (Default)

**Trennzeichen**: `;` · **Vorzeichen**: korrekt (Ausgaben negativ) · **Datum**: `TT.MM.JJJJ`

Header:
```
Bezeichnung Auftragskonto;IBAN Auftragskonto;BIC Auftragskonto;Bankname Auftragskonto;
Buchungstag;Valutadatum;Name Zahlungsbeteiligter;IBAN Zahlungsbeteiligter;
BIC (SWIFT-Code) Zahlungsbeteiligter;Buchungstext;Verwendungszweck;Betrag;Waehrung;
Saldo nach Buchung;Bemerkung;Gekennzeichneter Umsatz;Glaeubiger ID;Mandatsreferenz
```

Direkt auf das interne Schema gemapped, keine Sonderlogik. Ist auch der Default für viele Volksbanken, ING und ähnliche Anbieter mit klassischem CSV-Layout.

## DKB (neuer Export)

**Trennzeichen**: `;` · **Vorzeichen**: korrekt · **Datum**: `TT.MM.JJ` (2-stelliges Jahr!)

Eigenheiten:
- **Header-Metadaten**: Erste 4-5 Zeilen enthalten Kontoname, Zeitraum, Kontostand
- **Eigene IBAN** steht in der ersten Zeile (`"Girokonto";"DE<20 Stellen>"`)
- **Counterparty in zwei Spalten**: `Zahlungspflichtige*r` und `Zahlungsempfänger*in` — abhängig vom `Umsatztyp` (Eingang/Ausgang). DKB nutzt `DKB AG` und `ISSUER` als Eigen-Tokens

Preprocess-Logik:
1. Suche nach erster Zeile mit „Buchungsdatum" + „Betrag" → das ist die echte Header-Zeile
2. Extrahiere `iban_konto` aus erster Metadaten-Zeile via Regex `"([^"]+)";"(DE\d{20})"`
3. Verwerfe alle Zeilen vor der Header-Zeile

Row-Transform:
- Wenn Sender `"DKB AG"` oder `"ISSUER"` enthält → Empfänger ist Counterparty
- Wenn Empfänger `"DKB AG"` oder `"ISSUER"` enthält → Sender ist Counterparty
- Fallback: bei Umsatztyp „Ausgang" der Empfänger, bei „Eingang" der Sender
- Ergebnis als synthetisches Feld `_Counterparty`

Mapping:
| Internes Feld | Spalte |
|---|---|
| `kontoBezeichnung` | `_Kontobezeichnung` (extrahiert) |
| `ibanKonto` | `_IbanKonto` (extrahiert) |
| `buchungstag` | `Buchungsdatum` |
| `valutadatum` | `Wertstellung` |
| `nameZahlungsbeteiligter` | `_Counterparty` (berechnet) |
| `ibanZahlungsbeteiligter` | `IBAN` |
| `buchungstext` | `Umsatztyp` |
| `verwendungszweck` | `Verwendungszweck` |
| `betrag` | `Betrag (€)` |

## Sparkasse

**Trennzeichen**: `;` · **Vorzeichen**: korrekt · **Datum**: `TT.MM.JJJJ`

Variation des Standard-Mappings mit `Auftragskonto` statt `Bezeichnung Auftragskonto` und `Beguenstigter/Zahlungspflichtiger` als kombiniertes Counterparty-Feld.

## Commerzbank

**Trennzeichen**: `;` · **Vorzeichen**: korrekt · **Datum**: `TT.MM.JJJJ`

Spalte `Auftraggeber / Begünstigter` als kombiniertes Counterparty-Feld. Buchungstext im `Buchungstext`-Feld (statt separatem Verwendungszweck).

## Deutsche Bank

**Trennzeichen**: `;` · **Vorzeichen**: korrekt · **Datum**: `TT.MM.JJJJ`

Spalte `Soll/Haben (EUR)` als Betrag, `Buchungsdatum` als Buchungstag.

## comdirect

**Trennzeichen**: `;` · **Vorzeichen**: korrekt · **Datum**: `TT.MM.JJJJ`

Eigenheiten:
- **Header-Metadaten** in den ersten 4-5 Zeilen
- **Buchungstext-Feld** enthält alles als konkateniertes Freifeld:
  ```
  Empfänger: <Name>Kto/IBAN: <IBAN> BLZ/BIC: <BIC>  Buchungstext: <Zweck> Ref. <Ref>/...
  ```
  oder bei Eingängen:
  ```
  Auftraggeber: <Name>Kto/IBAN: <IBAN> ...
  ```

Preprocess: Suche Header-Zeile mit „Buchungstag" + „Umsatz in EUR".

Row-Transform (Regex-Extraktion):
- `_Name`: `/(?:Empfänger|Auftraggeber):\s*(.*?)(?=Kto\/IBAN:|BLZ\/BIC:|Buchungstext:|$)/`
- `_Iban`: `/Kto\/IBAN:\s*(\S+)/`
- `_Purpose`: `/Buchungstext:\s*(.*?)(?:\s+Ref\.\s|$)/`

Mapping:
| Internes Feld | Spalte |
|---|---|
| `buchungstag` | `Buchungstag` |
| `valutadatum` | `Wertstellung (Valuta)` |
| `nameZahlungsbeteiligter` | `_Name` |
| `ibanZahlungsbeteiligter` | `_Iban` |
| `buchungstext` | `Vorgang` |
| `verwendungszweck` | `_Purpose` |
| `betrag` | `Umsatz in EUR` |

## American Express

**Trennzeichen**: `,` · **Vorzeichen**: **umgekehrt!** (Belastungen positiv) · **Datum**: `TT/MM/JJJJ`

Header:
```
Datum,Beschreibung,Betrag,Weitere Details,Erscheint auf Ihrer Abrechnung als,
Adresse,Stadt,PLZ,Land,Betreff
```

Mapping:
| Internes Feld | Spalte |
|---|---|
| `buchungstag` | `Datum` |
| `valutadatum` | `Datum` |
| `nameZahlungsbeteiligter` | `Erscheint auf Ihrer Abrechnung als` |
| `verwendungszweck` | `Beschreibung` |
| `buchungstext` | `Betreff` |
| `betrag` | `Betrag` |

`invertAmount: true` — Betrag wird beim Import negiert, damit Belastungen wie üblich negativ sind.
`defaultCurrency: "EUR"` — AmEx-Export liefert keine Währung in der Zeile.

Keine IBAN-Felder (Kreditkarte hat keine), daher leeres `kontoBezeichnung` / `ibanKonto`. Für die Umbuchungs-Erkennung wichtig: die Kontogruppe muss Typ `kreditkarte` haben, dann werden Bank-Sammelabbuchungen mit „AMERICAN EXPRESS" im Namen automatisch als Umbuchung erkannt.

## Benutzerdefiniert

Default-Mapping wie Volksbank/ING. Trennzeichen wählbar. Alle Spalten frei zuordenbar im Feld-Mapping-Panel.

## Beitrag neuer Bank-Presets

> **Direkt loslegen?** Öffne das passende Issue:
> [neues Bank-Preset →](https://github.com/thomas-deep/MeinSaldo/issues/new?template=neue-bank.yml) ·
> [Bank-Format-Änderung →](https://github.com/thomas-deep/MeinSaldo/issues/new?template=bank-format-aenderung.yml)

Wir freuen uns über Beiträge für weitere Banken. Workflow:

### 1. CSV-Sample anonymisieren

Bevor du ein Sample teilst, **alle personenbezogenen Daten entfernen oder ersetzen**:

- **IBANs** → `DE00000000000000000000` (eigene) und `DE99999999999999999999` (Counterparty)
- **Namen** (Inhaber, Counterparty, abweichende Empfänger) → `Max Mustermann`, `Beispiel GmbH`, `Empfänger 1`
- **Verwendungszweck** → falls identifizierend (z. B. Mandatsreferenz, Kundennummern): durch generische Bezeichner ersetzen, aber die *Struktur* erhalten (z. B. „SEPA-Lastschrift MANDATSREF: XXXX RECHNUNG: 12345" als Muster behalten, damit Parser-Heuristiken treffen)
- **Beträge** dürfen bleiben oder gerundet werden
- **Datümer** dürfen bleiben

Genug Zeilen für die Parser-Heuristiken: mindestens 20 Buchungen, damit Encoding-Erkennung, Datum-Heuristik und Vorzeichen-Erkennung greifen.

### 2. Sample bereitstellen

Am einfachsten über die vorbereiteten Issue-Templates:

- **[„Neue Bank unterstützen"](https://github.com/thomas-deep/MeinSaldo/issues/new?template=neue-bank.yml)** — führt dich durch Header, Beispielzeilen, Encoding, Besonderheiten + Datenschutz-Checkboxen.
- **[„Bank-Format hat sich geändert"](https://github.com/thomas-deep/MeinSaldo/issues/new?template=bank-format-aenderung.yml)** — wenn eine bestehende Vorlage durch ein Online-Banking-Update gebrochen ist.

Für längere Samples (> 30 Zeilen): *unlisted* Gist-Link im Issue, nicht public.

**Niemals** echte CSV-Dateien in PRs committen. Wenn du Tests beilegst, nutze einen synthetischen Block direkt in der Testdatei (siehe `parse-csv.test.ts`).

### 3. Preset-PR

Siehe `CONTRIBUTING.md` Abschnitt „Neue Bank unterstützen" und das Code-Template unten.

### 4. Review

Maintainer prüft anhand des Samples (mit synthetischen Daten) im Browser. Bei DKB-ähnlichen Eigenheiten (Header-Metadaten, kombinierte Spalten) brauchen wir ggf. Rückfragen zu Edge-Cases (Auslandsüberweisungen, Storno-Buchungen, Rück-Lastschriften).

## Eigenes Bank-Preset hinzufügen

Siehe `docs/TECHNICAL.md` Abschnitt „Erweiterungspunkte → Neue Bank hinzufügen". Konkret in `src/lib/field-mapping.ts`:

```typescript
{
  name: "Meine Bank",
  mapping: {
    kontoBezeichnung: "Kontoname",
    // ...
  },
  separator: ";",
  encoding: "utf-8",
  invertAmount: false,
  preprocess: (rawText) => ({ csvText: rawText, defaultFields: {} }),
  rowTransform: (row) => ({ ...row, _customField: doSomething(row) }),
}
```
