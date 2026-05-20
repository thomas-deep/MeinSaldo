import { NetWorthHistoryPoint } from "./types";

export interface SnapshotInput {
  entityId: number;
  date: string;
  value: number;
}

/** Baut eine monatliche Net-Worth-Historie aus Asset- und Liability-Snapshots.
 *  Pro Monat wird der jeweils zuletzt-bekannte Wert je Entity verwendet
 *  (forward-fill): Wer einmal einen Wert hatte, behält ihn, bis ein neuer
 *  Snapshot kommt. Monate ohne irgendeinen Snapshot werden übersprungen. */
export function buildMonthlyNetWorthHistory(
  assetSnapshots: SnapshotInput[],
  liabilitySnapshots: SnapshotInput[]
): NetWorthHistoryPoint[] {
  const monthlyKeys = new Set<string>();
  for (const s of assetSnapshots) monthlyKeys.add(s.date.slice(0, 7));
  for (const s of liabilitySnapshots) monthlyKeys.add(s.date.slice(0, 7));
  const months = Array.from(monthlyKeys).sort();
  if (months.length === 0) return [];

  const assetsSorted = [...assetSnapshots].sort((a, b) =>
    a.date.localeCompare(b.date)
  );
  const liabilitiesSorted = [...liabilitySnapshots].sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  function sumAt(snapshots: SnapshotInput[], monthEnd: string): number {
    const latestByEntity = new Map<number, number>();
    for (const s of snapshots) {
      if (s.date.slice(0, 7) > monthEnd) break;
      latestByEntity.set(s.entityId, s.value);
    }
    let total = 0;
    for (const v of latestByEntity.values()) total += v;
    return total;
  }

  return months.map((m) => {
    const assets = sumAt(assetsSorted, m);
    const liabilities = sumAt(liabilitiesSorted, m);
    return {
      date: `${m}-01`,
      assets,
      liabilities,
      net: assets - liabilities,
    };
  });
}
