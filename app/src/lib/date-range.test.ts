import { describe, expect, it } from "vitest";
import { isWithin, rangeFor, shiftByYear } from "./date-range";

const D = (s: string) => new Date(s + "T12:00:00Z");

describe("rangeFor", () => {
  it("alle → unbegrenzt", () => {
    expect(rangeFor("alle", D("2024-06-15"))).toEqual({ from: null, to: null });
  });

  it("lfdMonat im Juni 2024", () => {
    expect(rangeFor("lfdMonat", D("2024-06-15"))).toEqual({
      from: "2024-06-01",
      to: "2024-06-30",
    });
  });

  it("Vormonat im Januar → Dezember Vorjahr", () => {
    expect(rangeFor("vormonat", D("2024-01-10"))).toEqual({
      from: "2023-12-01",
      to: "2023-12-31",
    });
  });

  it("lfdQuartal Q2", () => {
    expect(rangeFor("lfdQuartal", D("2024-05-15"))).toEqual({
      from: "2024-04-01",
      to: "2024-06-30",
    });
  });

  it("Vorquartal im Q1 → Q4 Vorjahr", () => {
    expect(rangeFor("vorquartal", D("2024-02-15"))).toEqual({
      from: "2023-10-01",
      to: "2023-12-31",
    });
  });

  it("lfdJahr und Vorjahr", () => {
    expect(rangeFor("lfdJahr", D("2024-06-15"))).toEqual({
      from: "2024-01-01",
      to: "2024-12-31",
    });
    expect(rangeFor("vorjahr", D("2024-06-15"))).toEqual({
      from: "2023-01-01",
      to: "2023-12-31",
    });
  });

  it("letzte12Monate vom 15.6.24 → Juli 23 bis Juni 24", () => {
    expect(rangeFor("letzte12Monate", D("2024-06-15"))).toEqual({
      from: "2023-07-01",
      to: "2024-06-30",
    });
  });

  it("Februar mit Schaltjahr: lfdMonat endet am 29.", () => {
    expect(rangeFor("lfdMonat", D("2024-02-15"))).toEqual({
      from: "2024-02-01",
      to: "2024-02-29",
    });
  });
});

describe("shiftByYear", () => {
  it("verschiebt Range exakt um 1 Jahr zurück", () => {
    expect(
      shiftByYear({ from: "2024-04-01", to: "2024-06-30" }, 1)
    ).toEqual({ from: "2023-04-01", to: "2023-06-30" });
  });

  it("verschiebt 29.02. eines Schaltjahres auf 28.02. im Nicht-Schaltjahr", () => {
    expect(
      shiftByYear({ from: "2024-02-29", to: "2024-02-29" }, 1)
    ).toEqual({ from: "2023-02-28", to: "2023-02-28" });
  });

  it("ist no-op bei null-Grenzen", () => {
    expect(shiftByYear({ from: null, to: null }, 1)).toEqual({
      from: null,
      to: null,
    });
  });
});

describe("isWithin", () => {
  const range = { from: "2024-04-01", to: "2024-06-30" };
  it("Datum im Bereich → true", () => {
    expect(isWithin("2024-05-15", range)).toBe(true);
    expect(isWithin("2024-04-01", range)).toBe(true);
    expect(isWithin("2024-06-30", range)).toBe(true);
  });
  it("außerhalb → false", () => {
    expect(isWithin("2024-03-31", range)).toBe(false);
    expect(isWithin("2024-07-01", range)).toBe(false);
  });
  it("leerer String → false", () => {
    expect(isWithin("", range)).toBe(false);
  });
  it("offene Grenzen erlauben alles", () => {
    expect(isWithin("2024-01-01", { from: null, to: null })).toBe(true);
    expect(isWithin("1999-12-31", { from: null, to: "2024-06-30" })).toBe(true);
    expect(isWithin("2099-01-01", { from: "2024-01-01", to: null })).toBe(true);
  });
});
