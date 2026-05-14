import { describe, expect, it } from "vitest";
import { parseCsvData, detectCsvHeaders } from "./parse-csv";
import { defaultMapping, bankPresets } from "./field-mapping";
import { FieldMapping } from "./types";

const stdMapping: FieldMapping = { ...defaultMapping };

function lines(...rows: string[]): string {
  return rows.join("\n");
}

describe("parseCsvData / parseGermanNumber", () => {
  const headers = Object.values(stdMapping).join(";");

  function makeRow(betrag: string): string {
    return [
      "Konto A",
      "DE111",
      "01.02.2024",
      "01.02.2024",
      "Empfänger",
      "DE222",
      "Buchung",
      "Zweck",
      betrag,
      "EUR",
      "100,00",
    ].join(";");
  }

  it("parses '1.234,56' as German number", () => {
    const out = parseCsvData(lines(headers, makeRow("1.234,56")), stdMapping, ";");
    expect(out[0].betrag).toBeCloseTo(1234.56);
  });

  it("parses '-50,00' as negative", () => {
    const out = parseCsvData(lines(headers, makeRow("-50,00")), stdMapping, ";");
    expect(out[0].betrag).toBeCloseTo(-50);
  });

  it("parses '0,99' (only comma)", () => {
    const out = parseCsvData(lines(headers, makeRow("0,99")), stdMapping, ";");
    expect(out[0].betrag).toBeCloseTo(0.99);
  });

  it("parses '12.50' (US-style dot decimal, single dot, <=2 fractional)", () => {
    const out = parseCsvData(lines(headers, makeRow("12.50")), stdMapping, ";");
    expect(out[0].betrag).toBeCloseTo(12.5);
  });

  it("parses '12.345' (thousands grouping, no decimal) as 12345", () => {
    const out = parseCsvData(lines(headers, makeRow("12.345")), stdMapping, ";");
    expect(out[0].betrag).toBeCloseTo(12345);
  });

  it("invalid betrag yields 0", () => {
    const out = parseCsvData(lines(headers, makeRow("kaputt")), stdMapping, ";");
    expect(out[0].betrag).toBe(0);
  });

  it("respects invertAmount option (used by Amex preset)", () => {
    const out = parseCsvData(lines(headers, makeRow("10,00")), stdMapping, ";", {
      invertAmount: true,
    });
    expect(out[0].betrag).toBeCloseTo(-10);
  });
});

describe("parseGermanDate", () => {
  const headers = Object.values(stdMapping).join(";");
  function rowWith(date: string): string {
    return [
      "Konto",
      "DE111",
      date,
      date,
      "X",
      "DE222",
      "B",
      "Z",
      "1,00",
      "EUR",
      "1,00",
    ].join(";");
  }

  it("TT.MM.JJJJ → ISO", () => {
    const out = parseCsvData(lines(headers, rowWith("05.11.2024")), stdMapping, ";");
    expect(out[0].buchungstag).toBe("2024-11-05");
  });

  it("TT.MM.JJ → ISO (post-2000)", () => {
    const out = parseCsvData(lines(headers, rowWith("05.11.24")), stdMapping, ";");
    expect(out[0].buchungstag).toBe("2024-11-05");
  });

  it("JJJJ-MM-TT bleibt ISO", () => {
    const out = parseCsvData(lines(headers, rowWith("2024-11-05")), stdMapping, ";");
    expect(out[0].buchungstag).toBe("2024-11-05");
  });

  it("TT/MM/JJJJ → ISO", () => {
    const out = parseCsvData(lines(headers, rowWith("05/11/2024")), stdMapping, ";");
    expect(out[0].buchungstag).toBe("2024-11-05");
  });
});

describe("parseCsvData filtering & defaults", () => {
  const headers = Object.values(stdMapping).join(";");

  it("skips rows with empty betrag", () => {
    const csv = lines(
      headers,
      ["A", "DE1", "01.01.2024", "01.01.2024", "X", "DE2", "B", "Z", "", "EUR", "0"].join(";"),
      ["A", "DE1", "01.01.2024", "01.01.2024", "X", "DE2", "B", "Z", "5,00", "EUR", "5"].join(";")
    );
    const out = parseCsvData(csv, stdMapping, ";");
    expect(out).toHaveLength(1);
    expect(out[0].betrag).toBe(5);
  });

  it("uses defaultCurrency when mapping points to empty column", () => {
    const mapping = { ...stdMapping, waehrung: "" };
    const heads = Object.values(mapping).filter(Boolean).join(";");
    const csv = lines(
      heads,
      ["A", "DE1", "01.01.2024", "01.01.2024", "X", "DE2", "B", "Z", "5,00", "5"].join(";")
    );
    const out = parseCsvData(csv, mapping, ";", { defaultCurrency: "USD" });
    expect(out[0].waehrung).toBe("USD");
  });
});

describe("DKB preset (preprocess + rowTransform)", () => {
  const dkbPreset = bankPresets.find((p) => p.name.startsWith("DKB"))!;

  it("strips header preamble and finds header line beyond row 20", () => {
    const preamble = Array.from({ length: 50 }, (_, i) => `Vorspann-Zeile ${i}`).join("\n");
    const accountLine = `"Mein Konto";"DE12345678901234567890";`;
    const header =
      `"Buchungsdatum";"Wertstellung";"Status";"Zahlungspflichtige*r";` +
      `"Zahlungsempfänger*in";"Verwendungszweck";"Umsatztyp";"IBAN";"Betrag (€)";"Gläubiger-ID";"Mandatsreferenz";"Kundenreferenz"`;
    const dataRow =
      `"01.02.2024";"01.02.2024";"Gebucht";"DKB AG";` +
      `"Empfänger GmbH";"Rechnung";"Ausgang";"DE99";"−10,00";"";"";""`;
    const csv = [preamble, accountLine, header, dataRow].join("\n");

    const out = parseCsvData(csv, dkbPreset.mapping, dkbPreset.separator, {
      preprocess: dkbPreset.preprocess,
      rowTransform: dkbPreset.rowTransform,
    });
    expect(out).toHaveLength(1);
    expect(out[0].ibanKonto).toBe("DE12345678901234567890");
    expect(out[0].kontoBezeichnung).toBe("Mein Konto");
    expect(out[0].nameZahlungsbeteiligter).toBe("Empfänger GmbH");
  });

  it("detectCsvHeaders includes synthetic _Counterparty/_IbanKonto fields", () => {
    const csv = [
      `"Mein Konto";"DE99999999999999999999";`,
      `"Buchungsdatum";"Wertstellung";"Status";"Zahlungspflichtige*r";` +
        `"Zahlungsempfänger*in";"Verwendungszweck";"Umsatztyp";"IBAN";"Betrag (€)"`,
      `"01.02.2024";"01.02.2024";"Gebucht";"Foo";"Bar";"Zw";"Ausgang";"DE2";"1,00"`,
    ].join("\n");
    const headers = detectCsvHeaders(csv, ";", {
      preprocess: dkbPreset.preprocess,
      rowTransform: dkbPreset.rowTransform,
    });
    expect(headers).toContain("_Counterparty");
    expect(headers).toContain("_IbanKonto");
    expect(headers).toContain("_Kontobezeichnung");
  });
});
