import { BankPreset, FieldMapping, PreprocessResult, RawRow } from "./types";

export const defaultMapping: FieldMapping = {
  kontoBezeichnung: "Bezeichnung Auftragskonto",
  ibanKonto: "IBAN Auftragskonto",
  buchungstag: "Buchungstag",
  valutadatum: "Valutadatum",
  nameZahlungsbeteiligter: "Name Zahlungsbeteiligter",
  ibanZahlungsbeteiligter: "IBAN Zahlungsbeteiligter",
  buchungstext: "Buchungstext",
  verwendungszweck: "Verwendungszweck",
  betrag: "Betrag",
  waehrung: "Waehrung",
  saldoNachBuchung: "Saldo nach Buchung",
};

function dkbPreprocess(rawText: string): PreprocessResult {
  const lines = rawText.split(/\r?\n/);
  let ibanKonto = "";
  let kontoBezeichnung = "";
  let headerIdx = -1;
  for (let i = 0; i < Math.min(lines.length, 20); i++) {
    const line = lines[i];
    if (line.includes("Buchungsdatum") && line.includes("Betrag")) {
      headerIdx = i;
      break;
    }
    const match = line.match(/^"([^"]+)";"(DE\d{20})"/);
    if (match) {
      kontoBezeichnung = match[1];
      ibanKonto = match[2];
    }
  }
  if (headerIdx < 0) return { csvText: rawText, defaultFields: {} };
  return {
    csvText: lines.slice(headerIdx).join("\n"),
    defaultFields: {
      _Kontobezeichnung: kontoBezeichnung,
      _IbanKonto: ibanKonto,
    },
  };
}

function dkbRowTransform(row: RawRow): RawRow {
  const SELF_TOKENS = ["DKB AG", "ISSUER"];
  const sender = row["Zahlungspflichtige*r"] || "";
  const receiver = row["Zahlungsempfänger*in"] || "";
  const isSenderSelf = SELF_TOKENS.some((t) => sender.includes(t));
  const isReceiverSelf = SELF_TOKENS.some((t) => receiver.includes(t));
  let counterparty: string;
  if (isSenderSelf && !isReceiverSelf) counterparty = receiver;
  else if (isReceiverSelf && !isSenderSelf) counterparty = sender;
  else counterparty = (row["Umsatztyp"] || "") === "Ausgang" ? receiver : sender;
  return {
    ...row,
    _Counterparty: counterparty,
  };
}

function comdirectPreprocess(rawText: string): PreprocessResult {
  const lines = rawText.split(/\r?\n/);
  let headerIdx = -1;
  for (let i = 0; i < Math.min(lines.length, 20); i++) {
    if (
      lines[i].includes("Buchungstag") &&
      lines[i].includes("Umsatz in EUR")
    ) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) return { csvText: rawText, defaultFields: {} };
  return {
    csvText: lines.slice(headerIdx).join("\n"),
    defaultFields: {},
  };
}

function comdirectRowTransform(row: RawRow): RawRow {
  const text = row["Buchungstext"] || "";
  const nameMatch = text.match(/(?:Empfänger|Auftraggeber):\s*(.*?)(?=Kto\/IBAN:|BLZ\/BIC:|Buchungstext:|$)/);
  const ibanMatch = text.match(/Kto\/IBAN:\s*(\S+)/);
  const purposeMatch = text.match(/Buchungstext:\s*(.*?)(?:\s+Ref\.\s|$)/);
  return {
    ...row,
    _Name: nameMatch?.[1]?.trim() ?? "",
    _Iban: ibanMatch?.[1]?.trim() ?? "",
    _Purpose: purposeMatch?.[1]?.trim() ?? row["Vorgang"] ?? "",
  };
}

export const bankPresets: BankPreset[] = [
  {
    name: "Volksbank / ING / Standard",
    mapping: { ...defaultMapping },
    separator: ";",
    encoding: "utf-8",
  },
  {
    name: "DKB (neuer Export)",
    mapping: {
      kontoBezeichnung: "_Kontobezeichnung",
      ibanKonto: "_IbanKonto",
      buchungstag: "Buchungsdatum",
      valutadatum: "Wertstellung",
      nameZahlungsbeteiligter: "_Counterparty",
      ibanZahlungsbeteiligter: "IBAN",
      buchungstext: "Umsatztyp",
      verwendungszweck: "Verwendungszweck",
      betrag: "Betrag (€)",
      waehrung: "",
      saldoNachBuchung: "",
    },
    separator: ";",
    encoding: "utf-8",
    defaultCurrency: "EUR",
    preprocess: dkbPreprocess,
    rowTransform: dkbRowTransform,
  },
  {
    name: "comdirect",
    mapping: {
      kontoBezeichnung: "",
      ibanKonto: "",
      buchungstag: "Buchungstag",
      valutadatum: "Wertstellung (Valuta)",
      nameZahlungsbeteiligter: "_Name",
      ibanZahlungsbeteiligter: "_Iban",
      buchungstext: "Vorgang",
      verwendungszweck: "_Purpose",
      betrag: "Umsatz in EUR",
      waehrung: "",
      saldoNachBuchung: "",
    },
    separator: ";",
    encoding: "utf-8",
    defaultCurrency: "EUR",
    preprocess: comdirectPreprocess,
    rowTransform: comdirectRowTransform,
  },
  {
    name: "Sparkasse",
    mapping: {
      ...defaultMapping,
      kontoBezeichnung: "Auftragskonto",
      nameZahlungsbeteiligter: "Beguenstigter/Zahlungspflichtiger",
      verwendungszweck: "Verwendungszweck",
      betrag: "Betrag",
      waehrung: "Waehrung",
    },
    separator: ";",
    encoding: "utf-8",
  },
  {
    name: "Commerzbank",
    mapping: {
      ...defaultMapping,
      buchungstag: "Buchungstag",
      betrag: "Betrag",
      verwendungszweck: "Buchungstext",
      nameZahlungsbeteiligter: "Auftraggeber / Begünstigter",
    },
    separator: ";",
    encoding: "utf-8",
  },
  {
    name: "Deutsche Bank",
    mapping: {
      ...defaultMapping,
      kontoBezeichnung: "Konto",
      buchungstag: "Buchungsdatum",
      betrag: "Soll/Haben (EUR)",
      nameZahlungsbeteiligter: "Auftraggeber/Begünstigter",
      verwendungszweck: "Verwendungszweck",
    },
    separator: ";",
    encoding: "utf-8",
  },
  {
    name: "American Express",
    mapping: {
      kontoBezeichnung: "",
      ibanKonto: "",
      buchungstag: "Datum",
      valutadatum: "Datum",
      nameZahlungsbeteiligter: "Erscheint auf Ihrer Abrechnung als",
      ibanZahlungsbeteiligter: "",
      buchungstext: "Betreff",
      verwendungszweck: "Beschreibung",
      betrag: "Betrag",
      waehrung: "",
      saldoNachBuchung: "",
    },
    separator: ",",
    encoding: "utf-8",
    invertAmount: true,
    defaultCurrency: "EUR",
  },
  {
    name: "Benutzerdefiniert",
    mapping: { ...defaultMapping },
    separator: ";",
    encoding: "utf-8",
  },
];

export const fieldLabels: Record<keyof FieldMapping, string> = {
  kontoBezeichnung: "Kontobezeichnung",
  ibanKonto: "IBAN Konto",
  buchungstag: "Buchungstag",
  valutadatum: "Valutadatum",
  nameZahlungsbeteiligter: "Name Zahlungsbeteiligter",
  ibanZahlungsbeteiligter: "IBAN Zahlungsbeteiligter",
  buchungstext: "Buchungstext",
  verwendungszweck: "Verwendungszweck",
  betrag: "Betrag",
  waehrung: "Währung",
  saldoNachBuchung: "Saldo nach Buchung",
};
