/**
 * Heuristische Erkennung des CSV-Encodings (UTF-8 vs. windows-1252).
 *
 * Hintergrund: Sparkasse-, Volksbank- und andere deutsche Bank-Exporte
 * kommen häufig in `windows-1252` (Codepage „Western European"). Reine
 * UTF-8-Decodierung erzeugt dann Mojibake auf den Umlauten (`ä` als
 * `Ã¤` → `Ã¤`), wodurch Kategorisierungs-Regeln ins Leere laufen.
 *
 * Strategie (in dieser Reihenfolge):
 *  1. UTF-8-BOM (EF BB BF) → utf-8
 *  2. Strict-UTF-8-Decode versuchen — wenn das *ohne* Exception
 *     durchläuft, ist die Datei valides UTF-8 (auch reine ASCII zählt).
 *  3. Sonst windows-1252 (greift bei deutschen Umlauten in CP1252).
 *
 * Bewusst kein Charset-Detector im Stil von uchardet: für die
 * UTF-8/CP1252-Unterscheidung im deutschen Bank-Kontext ist die
 * strict-Probe ausreichend und ohne Heuristik-Magie nachvollziehbar.
 */
export type DetectableEncoding = "utf-8" | "windows-1252";

export function detectEncoding(
  buffer: ArrayBuffer | Uint8Array
): DetectableEncoding {
  const u8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

  if (u8.length >= 3 && u8[0] === 0xef && u8[1] === 0xbb && u8[2] === 0xbf) {
    return "utf-8";
  }

  try {
    new TextDecoder("utf-8", { fatal: true }).decode(u8);
    return "utf-8";
  } catch {
    return "windows-1252";
  }
}
