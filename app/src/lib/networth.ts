import { NetWorthHistoryPoint } from "./types";

export interface SnapshotInput {
  entityId: number;
  date: string;
  value: number;
}

export interface KontoBooking {
  date: string;
  betrag: number;
}

/** Saldo eines Kontos zu einem Stichtag, ausgehend von einem Anker-Wert.
 *  `anchorValue` ist der bekannte Kontostand AM `anchorDate` (inkl. aller
 *  Buchungen dieses Tages). Für spätere Stichtage werden Buchungen addiert,
 *  für frühere subtrahiert. So lässt sich der Verlauf rückwärts und vorwärts
 *  rekonstruieren, auch wenn die CSV keinen brauchbaren Saldo liefert. */
export function balanceAsOf(
  anchorDate: string,
  anchorValue: number,
  bookings: KontoBooking[],
  asOf: string
): number {
  let bal = anchorValue;
  for (const b of bookings) {
    if (b.date > anchorDate && b.date <= asOf) {
      bal += b.betrag;
    } else if (b.date > asOf && b.date <= anchorDate) {
      bal -= b.betrag;
    }
  }
  return bal;
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

  // date ist ISO (`YYYY-MM-DD`), reiner String-Compare ist locale-stabil
  const byDateAsc = (a: SnapshotInput, b: SnapshotInput) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
  const assetsSorted = [...assetSnapshots].sort(byDateAsc);
  const liabilitiesSorted = [...liabilitySnapshots].sort(byDateAsc);

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
