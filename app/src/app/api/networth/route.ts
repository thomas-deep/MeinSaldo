import { NextResponse } from "next/server";
import {
  getAssets,
  getLiabilities,
  getNetWorthHistory,
} from "../../../lib/db";

export async function GET() {
  const assets = getAssets();
  const liabilities = getLiabilities();
  const history = getNetWorthHistory();
  const assetTotal = assets.reduce((s, a) => s + (a.latestValue ?? 0), 0);
  const liabilityTotal = liabilities.reduce(
    (s, l) => s + (l.latestValue ?? 0),
    0
  );
  return NextResponse.json({
    assets,
    liabilities,
    history,
    totals: {
      assets: assetTotal,
      liabilities: liabilityTotal,
      net: assetTotal - liabilityTotal,
    },
  });
}
