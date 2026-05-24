/**
 * Normalisiert eine IBAN für Vergleiche und Storage: trim, uppercase,
 * alle Whitespaces (auch internal) entfernen.
 *
 * Liefert `null` für leere/whitespace-only Strings, `null` und `undefined`,
 * damit der Aufrufer einen leeren Form-Wert direkt als NULL persistieren kann.
 *
 * Bewusst keine Mod-97-Prüfung — das Modul ist nur für Matching, nicht
 * für Validierung zuständig.
 */
export function normalizeIban(input: string | null | undefined): string | null {
  if (input == null) return null;
  const cleaned = input.replace(/\s+/g, "").toUpperCase();
  return cleaned.length === 0 ? null : cleaned;
}

/** Formatiert eine bereits normalisierte IBAN für die Anzeige in 4er-Gruppen. */
export function formatIbanForDisplay(iban: string | null | undefined): string {
  if (!iban) return "";
  return iban.replace(/(.{4})/g, "$1 ").trim();
}

/**
 * Maskiert eine normalisierte IBAN für dezente Hinweise:
 * "DE89370400440532013000" -> "DE89••3000" (Länderkennung + Prüfziffer + letzte 4).
 */
export function maskIban(iban: string | null | undefined): string {
  if (!iban) return "";
  if (iban.length <= 8) return iban;
  return `${iban.slice(0, 4)}••${iban.slice(-4)}`;
}
