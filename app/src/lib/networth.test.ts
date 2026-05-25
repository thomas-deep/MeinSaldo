import { describe, expect, it } from "vitest";
import {
  buildMonthlyNetWorthHistory,
  balanceAsOf,
  reconstructKontoMonthlySnapshots,
} from "./networth";

describe("balanceAsOf", () => {
  const bookings = [
    { date: "2025-01-10", betrag: -50 },
    { date: "2025-02-15", betrag: 200 },
    { date: "2025-03-20", betrag: -30 },
  ];

  it("gibt den Ankerwert zurück, wenn Stichtag = Ankerdatum", () => {
    expect(balanceAsOf("2025-02-15", 1000, bookings, "2025-02-15")).toBe(1000);
  });

  it("addiert spätere Buchungen vorwärts", () => {
    // Anker 2025-02-15 = 1000, danach -30 am 2025-03-20
    expect(balanceAsOf("2025-02-15", 1000, bookings, "2025-03-31")).toBe(970);
  });

  it("subtrahiert frühere Buchungen rückwärts", () => {
    // Anker 2025-02-15 = 1000; die Buchung +200 am 2025-02-15 ist im Anker
    // enthalten, davor war der Stand 1000 - 200 = 800
    expect(balanceAsOf("2025-02-15", 1000, bookings, "2025-02-14")).toBe(800);
  });

  it("rekonstruiert ganz nach vorn vor allen Buchungen", () => {
    // vor dem 2025-01-10: 800 minus die -50 vom 2025-01-10 → 850
    expect(balanceAsOf("2025-02-15", 1000, bookings, "2025-01-01")).toBe(850);
  });

  it("Buchungen am Ankertag zählen als im Anker enthalten", () => {
    const sameDay = [{ date: "2025-02-15", betrag: 100 }];
    expect(balanceAsOf("2025-02-15", 500, sameDay, "2025-02-15")).toBe(500);
    expect(balanceAsOf("2025-02-15", 500, sameDay, "2025-02-14")).toBe(400);
  });
});

describe("buildMonthlyNetWorthHistory", () => {
  it("liefert leere Liste ohne Snapshots", () => {
    expect(buildMonthlyNetWorthHistory([], [])).toEqual([]);
  });

  it("monatlicher Zeitstrahl mit Forward-Fill je Entity", () => {
    const result = buildMonthlyNetWorthHistory(
      [
        { entityId: 1, date: "2025-01-15", value: 10000 },
        { entityId: 2, date: "2025-01-31", value: 5000 },
        { entityId: 1, date: "2025-03-10", value: 11000 },
      ],
      [{ entityId: 10, date: "2025-02-01", value: 2000 }]
    );
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      date: "2025-01-01",
      assets: 15000,
      liabilities: 0,
      net: 15000,
    });
    expect(result[1]).toEqual({
      date: "2025-02-01",
      assets: 15000,
      liabilities: 2000,
      net: 13000,
    });
    expect(result[2]).toEqual({
      date: "2025-03-01",
      assets: 16000,
      liabilities: 2000,
      net: 14000,
    });
  });

  it("verschiedene Entities werden über Forward-Fill addiert", () => {
    const result = buildMonthlyNetWorthHistory(
      [
        { entityId: 1, date: "2025-01-01", value: 100 },
        { entityId: 2, date: "2025-02-01", value: 200 },
      ],
      []
    );
    expect(result[0].assets).toBe(100);
    expect(result[1].assets).toBe(300);
  });
});

describe("reconstructKontoMonthlySnapshots", () => {
  it("ohne Anker: nimmt saldoNachBuchung des letzten Tags je Monat", () => {
    const result = reconstructKontoMonthlySnapshots({
      bookings: [
        { date: "2026-01-10", betrag: 100, saldo: 1100 },
        { date: "2026-01-20", betrag: 200, saldo: 1300 },
        { date: "2026-02-05", betrag: -50, saldo: 1250 },
      ],
      anchorDate: null,
      anchorValue: null,
    });
    expect(result).toEqual([
      { date: "2026-01-31", value: 1300 },
      { date: "2026-02-28", value: 1250 },
    ]);
  });

  it("mit Anker: rekonstruiert Saldo vorwärts und rückwärts", () => {
    // Anker: 28.02. = 1000 EUR (Saldo Ende Februar bekannt)
    // Buchung 01.02. +200 → ist Teil des Anker-Werts, also Jan-Ende = 800
    // Apr -50 → Saldo Ende Apr = 1000 - 50 = 950
    const result = reconstructKontoMonthlySnapshots({
      bookings: [
        { date: "2026-01-15", betrag: 0, saldo: 0 }, // markiert nur Monat Jan
        { date: "2026-02-01", betrag: 200, saldo: 0 },
        { date: "2026-04-10", betrag: -50, saldo: 0 },
      ],
      anchorDate: "2026-02-28",
      anchorValue: 1000,
    });
    expect(result).toEqual([
      { date: "2026-01-31", value: 800 },
      { date: "2026-02-28", value: 1000 },
      { date: "2026-04-30", value: 950 },
    ]);
  });

  it("asLiability: nimmt absoluten Wert (negativer Saldo wird positiv ausgewiesen)", () => {
    const result = reconstructKontoMonthlySnapshots({
      bookings: [{ date: "2026-01-15", betrag: -500, saldo: -500 }],
      anchorDate: null,
      anchorValue: null,
      asLiability: true,
    });
    expect(result).toEqual([{ date: "2026-01-31", value: 500 }]);
  });

  it("liefert leere Liste wenn keine Buchungen und kein Anker", () => {
    expect(
      reconstructKontoMonthlySnapshots({
        bookings: [],
        anchorDate: null,
        anchorValue: null,
      })
    ).toEqual([]);
  });

  it("liefert auch nur den Anker-Monat wenn keine Buchungen aber Anker da", () => {
    const result = reconstructKontoMonthlySnapshots({
      bookings: [],
      anchorDate: "2026-05-15",
      anchorValue: 7500,
    });
    expect(result).toEqual([{ date: "2026-05-31", value: 7500 }]);
  });
});
