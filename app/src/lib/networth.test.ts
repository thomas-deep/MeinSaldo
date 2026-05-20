import { describe, expect, it } from "vitest";
import { buildMonthlyNetWorthHistory } from "./networth";

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
