import { describe, expect, it } from "vitest";
import { detectUmbuchungen, UmbuchungInput } from "./umbuchung-detection";

function tx(overrides: Partial<UmbuchungInput> & { id: string }): UmbuchungInput {
  return {
    buchungstag: "2024-06-10",
    betrag: -100,
    ibanKonto: "",
    ibanZahlungsbeteiligter: "",
    nameZahlungsbeteiligter: "",
    kontogruppeId: 1,
    ...overrides,
  };
}

describe("detectUmbuchungen — Paar-Matching", () => {
  it("findet Paar bei exakt gleichem Datum auf verschiedenen Kontogruppen", () => {
    const out = detectUmbuchungen(
      [
        tx({ id: "a", betrag: -250, kontogruppeId: 1, buchungstag: "2024-06-10" }),
        tx({ id: "b", betrag: 250, kontogruppeId: 2, buchungstag: "2024-06-10" }),
      ],
      { hasKreditkarteGroup: false }
    );
    expect(out).toEqual(new Set(["a", "b"]));
  });

  it("matched innerhalb ±3 Tagen (Default)", () => {
    const out = detectUmbuchungen(
      [
        tx({ id: "a", betrag: -100, kontogruppeId: 1, buchungstag: "2024-06-10" }),
        tx({ id: "b", betrag: 100, kontogruppeId: 2, buchungstag: "2024-06-13" }),
      ],
      { hasKreditkarteGroup: false }
    );
    expect(out).toEqual(new Set(["a", "b"]));
  });

  it("matched NICHT bei 4 Tagen Differenz", () => {
    const out = detectUmbuchungen(
      [
        tx({ id: "a", betrag: -100, kontogruppeId: 1, buchungstag: "2024-06-10" }),
        tx({ id: "b", betrag: 100, kontogruppeId: 2, buchungstag: "2024-06-14" }),
      ],
      { hasKreditkarteGroup: false }
    );
    expect(out.size).toBe(0);
  });

  it("matched NICHT bei gleicher Kontogruppe (kein echter Transfer)", () => {
    const out = detectUmbuchungen(
      [
        tx({ id: "a", betrag: -100, kontogruppeId: 1, buchungstag: "2024-06-10" }),
        tx({ id: "b", betrag: 100, kontogruppeId: 1, buchungstag: "2024-06-10" }),
      ],
      { hasKreditkarteGroup: false }
    );
    expect(out.size).toBe(0);
  });

  it("matched NICHT, wenn eine Seite keine Kontogruppe hat", () => {
    const out = detectUmbuchungen(
      [
        tx({ id: "a", betrag: -100, kontogruppeId: 1 }),
        tx({ id: "b", betrag: 100, kontogruppeId: null }),
      ],
      { hasKreditkarteGroup: false }
    );
    expect(out.size).toBe(0);
  });

  it("bevorzugt nächstes Datum bei mehreren Kandidaten (greedy)", () => {
    const out = detectUmbuchungen(
      [
        tx({ id: "neg", betrag: -50, kontogruppeId: 1, buchungstag: "2024-06-10" }),
        tx({ id: "far", betrag: 50, kontogruppeId: 2, buchungstag: "2024-06-13" }),
        tx({ id: "near", betrag: 50, kontogruppeId: 2, buchungstag: "2024-06-11" }),
      ],
      { hasKreditkarteGroup: false }
    );
    expect(out.has("neg")).toBe(true);
    expect(out.has("near")).toBe(true);
    expect(out.has("far")).toBe(false);
  });

  it("matched nicht doppelt: zweite Negative bekommt keinen schon vergebenen Counterpart", () => {
    const out = detectUmbuchungen(
      [
        tx({ id: "n1", betrag: -75, kontogruppeId: 1, buchungstag: "2024-06-10" }),
        tx({ id: "n2", betrag: -75, kontogruppeId: 1, buchungstag: "2024-06-10" }),
        tx({ id: "p1", betrag: 75, kontogruppeId: 2, buchungstag: "2024-06-10" }),
      ],
      { hasKreditkarteGroup: false }
    );
    // Genau ein Paar matched, die andere Negative bleibt allein.
    expect(out.size).toBe(2);
    expect(out.has("p1")).toBe(true);
  });

  it("Betrag muss exakt übereinstimmen (auf 2 Nachkommastellen)", () => {
    const out = detectUmbuchungen(
      [
        tx({ id: "a", betrag: -100.5, kontogruppeId: 1 }),
        tx({ id: "b", betrag: 100.51, kontogruppeId: 2 }),
      ],
      { hasKreditkarteGroup: false }
    );
    expect(out.size).toBe(0);
  });
});

describe("detectUmbuchungen — IBAN-Match", () => {
  it("Counterparty-IBAN ist eigene IBAN → markiert", () => {
    const out = detectUmbuchungen(
      [
        tx({
          id: "a",
          ibanKonto: "DE111",
          kontogruppeId: 1,
          buchungstag: "2024-06-10",
        }),
        tx({
          id: "b",
          ibanKonto: "DE222",
          ibanZahlungsbeteiligter: "DE111",
          betrag: -200,
          kontogruppeId: 2,
          buchungstag: "2024-06-10",
        }),
      ],
      { hasKreditkarteGroup: false }
    );
    expect(out.has("b")).toBe(true);
  });
});

describe("detectUmbuchungen — Kreditkarten-Settlement", () => {
  it("Mastercard-Abrechnung wird ohne KK-Gruppe nicht markiert", () => {
    const out = detectUmbuchungen(
      [
        tx({
          id: "a",
          betrag: -500,
          nameZahlungsbeteiligter: "MASTERCARD",
          kontogruppeId: 1,
        }),
      ],
      { hasKreditkarteGroup: false }
    );
    expect(out.size).toBe(0);
  });

  it("Mastercard-Abrechnung wird mit KK-Gruppe markiert", () => {
    const out = detectUmbuchungen(
      [
        tx({
          id: "a",
          betrag: -500,
          nameZahlungsbeteiligter: "MASTERCARD GmbH",
          kontogruppeId: 1,
        }),
      ],
      { hasKreditkarteGroup: true }
    );
    expect(out.has("a")).toBe(true);
  });

  it("KK-Settlement gilt nur für negative Beträge", () => {
    const out = detectUmbuchungen(
      [
        tx({
          id: "a",
          betrag: 500,
          nameZahlungsbeteiligter: "Visa Europe",
          kontogruppeId: 1,
        }),
      ],
      { hasKreditkarteGroup: true }
    );
    expect(out.size).toBe(0);
  });
});

describe("detectUmbuchungen — Fenster-Override", () => {
  it("windowDays=0 erlaubt nur exaktes Datum", () => {
    const out = detectUmbuchungen(
      [
        tx({ id: "a", betrag: -100, kontogruppeId: 1, buchungstag: "2024-06-10" }),
        tx({ id: "b", betrag: 100, kontogruppeId: 2, buchungstag: "2024-06-11" }),
      ],
      { hasKreditkarteGroup: false, windowDays: 0 }
    );
    expect(out.size).toBe(0);
  });
});
