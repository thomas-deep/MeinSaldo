export interface RawTransaction {
  [key: string]: string;
}

export interface Transaction {
  id: string;
  kontoBezeichnung: string;
  ibanKonto: string;
  buchungstag: string;
  valutadatum: string;
  nameZahlungsbeteiligter: string;
  ibanZahlungsbeteiligter: string;
  buchungstext: string;
  verwendungszweck: string;
  betrag: number;
  waehrung: string;
  saldoNachBuchung: number;
  kategorie: string;
  kontogruppeId?: number | null;
  isUmbuchung?: boolean;
}

export type InhaberType = "privat" | "gemeinsam" | "firma";
export type KontogruppeArt =
  | "girokonto"
  | "sparkonto"
  | "kreditkarte"
  | "depot"
  | "sonstiges";

export interface Inhaber {
  id: number;
  name: string;
  type: InhaberType;
  color: string;
  createdAt?: string;
}

export interface Kontogruppe {
  id: number;
  name: string;
  inhaberId: number;
  inhaberName?: string;
  inhaberType?: InhaberType;
  inhaberColor?: string;
  art: KontogruppeArt;
  color: string;
  icon: string;
  bank?: string;
  createdAt?: string;
}

export interface FieldMapping {
  kontoBezeichnung: string;
  ibanKonto: string;
  buchungstag: string;
  valutadatum: string;
  nameZahlungsbeteiligter: string;
  ibanZahlungsbeteiligter: string;
  buchungstext: string;
  verwendungszweck: string;
  betrag: string;
  waehrung: string;
  saldoNachBuchung: string;
}

export type RawRow = Record<string, string>;

export interface PreprocessResult {
  csvText: string;
  defaultFields?: Record<string, string>;
}

export interface BankPreset {
  name: string;
  mapping: FieldMapping;
  separator: string;
  encoding: string;
  invertAmount?: boolean;
  defaultCurrency?: string;
  skipRows?: number;
  preprocess?: (rawText: string) => PreprocessResult;
  rowTransform?: (row: RawRow) => RawRow;
}

export interface CategoryRule {
  kategorie: string;
  keywords: string[];
  namePatterns: string[];
}

export interface MonthlyData {
  monat: string;
  einnahmen: number;
  ausgaben: number;
  saldo: number;
}

export interface CategorySummary {
  kategorie: string;
  betrag: number;
  anzahl: number;
  prozent: number;
}
