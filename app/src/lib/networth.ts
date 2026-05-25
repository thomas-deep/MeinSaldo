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

/** Letzter Tag des Monats `YYYY-MM` als ISO-Datum. */
function lastDayOfMonth(yyyymm: string): string {
  const [yStr, mStr] = yyyymm.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  // Date(year, monthIndex+1, 0) liefert den letzten Tag des Vormonats —
  // also genau den gewünschten Tag.
  const d = new Date(Date.UTC(y, m, 0));
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yStr}-${mStr}-${dd}`;
}

/** Rekonstruiert pro Buchungs-Monat einen Snapshot des Kontostands zum
 *  Monatsende. Wenn ein Anker gesetzt ist, kommt der Anker-Monat ebenfalls
 *  rein und der Verlauf wird darüber gestützt — auch rückwirkend. Ohne
 *  Anker fällt der Wert pro Monat auf den `saldoNachBuchung` der letzten
 *  Buchung des Monats zurück.
 *
 *  Die Buchungen müssen aufsteigend nach Datum sortiert sein. */
export function reconstructKontoMonthlySnapshots(opts: {
  bookings: { date: string; betrag: number; saldo: number }[];
  anchorDate: string | null;
  anchorValue: number | null;
  /** Bei Liabilities (Kreditkarte) den Betrag absoluten Wert nehmen. */
  asLiability?: boolean;
}): { date: string; value: number }[] {
  const { bookings, anchorDate, anchorValue, asLiability } = opts;
  if (bookings.length === 0 && anchorDate === null) return [];

  // Distinct months sammeln
  const monthsSet = new Set<string>();
  for (const b of bookings) monthsSet.add(b.date.slice(0, 7));
  if (anchorDate) monthsSet.add(anchorDate.slice(0, 7));
  const months = Array.from(monthsSet).sort();

  const hasAnchor = anchorDate !== null && anchorValue !== null;

  return months.map((m) => {
    const monthEnd = lastDayOfMonth(m);
    let raw: number;
    if (hasAnchor) {
      raw = balanceAsOf(anchorDate, anchorValue, bookings, monthEnd);
    } else {
      // Letzten saldoNachBuchung im oder vor diesem Monat suchen
      let last = 0;
      for (const b of bookings) {
        if (b.date <= monthEnd) last = b.saldo;
        else break;
      }
      raw = last;
    }
    return { date: monthEnd, value: asLiability ? Math.abs(raw) : raw };
  });
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
