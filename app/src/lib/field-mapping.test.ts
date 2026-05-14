import { describe, expect, it } from "vitest";
import { bankPresets, defaultMapping, fieldLabels } from "./field-mapping";
import { FieldMapping } from "./types";

describe("bankPresets", () => {
  it("has unique names", () => {
    const names = bankPresets.map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("each preset has separator and encoding", () => {
    for (const p of bankPresets) {
      expect(p.separator.length).toBeGreaterThan(0);
      expect(p.encoding.length).toBeGreaterThan(0);
    }
  });

  it("Sparkasse uses windows-1252 (Umlaut-Bug-Fix)", () => {
    const sk = bankPresets.find((p) => p.name === "Sparkasse")!;
    expect(sk.encoding).toBe("windows-1252");
  });

  it("Amex preset inverts amounts", () => {
    const amex = bankPresets.find((p) => p.name === "American Express")!;
    expect(amex.invertAmount).toBe(true);
  });

  it("DKB & comdirect provide preprocess + rowTransform", () => {
    const dkb = bankPresets.find((p) => p.name.startsWith("DKB"))!;
    expect(typeof dkb.preprocess).toBe("function");
    expect(typeof dkb.rowTransform).toBe("function");

    const cd = bankPresets.find((p) => p.name === "comdirect")!;
    expect(typeof cd.preprocess).toBe("function");
    expect(typeof cd.rowTransform).toBe("function");
  });
});

describe("fieldLabels", () => {
  it("covers all FieldMapping keys", () => {
    const mappingKeys = Object.keys(defaultMapping) as (keyof FieldMapping)[];
    for (const k of mappingKeys) {
      expect(fieldLabels[k]).toBeTruthy();
    }
  });
});

describe("comdirect preprocess scans beyond 20 lines", () => {
  it("finds header line at row 40", () => {
    const cd = bankPresets.find((p) => p.name === "comdirect")!;
    const preamble = Array.from({ length: 40 }, (_, i) => `meta ${i}`).join("\n");
    const header = `"Buchungstag";"Wertstellung (Valuta)";"Vorgang";"Buchungstext";"Umsatz in EUR"`;
    const csv = preamble + "\n" + header + '\n"01.01.2024";"01.01.2024";"X";"Y";"5,00"';
    const r = cd.preprocess!(csv);
    expect(r.csvText.startsWith(`"Buchungstag"`)).toBe(true);
  });
});
