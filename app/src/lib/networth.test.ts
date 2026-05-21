import { describe, expect, it } from "vitest";
import { buildMonthlyNetWorthHistory, balanceAsOf } from "./networth";

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
