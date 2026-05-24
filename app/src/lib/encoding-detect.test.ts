import { describe, expect, it } from "vitest";
import { detectEncoding } from "./encoding-detect";

function utf8(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

/** Encodet einen String roh als windows-1252 (nur für ASCII-/Latin-1-Range). */
function cp1252(text: string): Uint8Array {
  // Mapping CP1252 ↔ Latin-1 unterscheidet sich nur in 0x80–0x9F. Für
  // gängige deutsche Umlaute (ä=E4, ö=F6, ü=FC, ß=DF) reicht der direkte
  // Codepoint-Cast, da die Codepoints mit den CP1252-Bytes übereinstimmen.
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    out[i] = text.charCodeAt(i) & 0xff;
  }
  return out;
}

describe("detectEncoding", () => {
  it("erkennt UTF-8 BOM", () => {
    const buf = new Uint8Array([0xef, 0xbb, 0xbf, 0x68, 0x69]);
    expect(detectEncoding(buf)).toBe("utf-8");
  });

  it("erkennt reines ASCII als UTF-8", () => {
    expect(detectEncoding(utf8("Buchungstag;Betrag;EUR"))).toBe("utf-8");
  });

  it("erkennt korrektes UTF-8 mit Umlauten als UTF-8", () => {
    expect(detectEncoding(utf8("Ärzte;Württembergische;100,00"))).toBe("utf-8");
  });

  it("erkennt windows-1252 mit Umlauten als windows-1252", () => {
    // "Ärzte" in CP1252: C4 72 7A 74 65 — 0xC4 ist nicht der Start eines
    // gültigen UTF-8-Multibyte (C4 7A wäre Continuation 7A < 80 invalid)
    expect(detectEncoding(cp1252("Ärzte;Württembergische"))).toBe("windows-1252");
  });

  it("erkennt isolierte CP1252-Bytes (€-Zeichen 0x80) als windows-1252", () => {
    // 0x80 ist in UTF-8 keine gültige Startbyte (das ist ein continuation byte)
    expect(detectEncoding(new Uint8Array([0x80, 0x41, 0x42]))).toBe(
      "windows-1252"
    );
  });

  it("ist robust gegen leeren Buffer", () => {
    // Leere Bytes sind gültiges UTF-8.
    expect(detectEncoding(new Uint8Array([]))).toBe("utf-8");
  });
});
