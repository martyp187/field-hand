import { parseStringPromise } from 'xml2js';
import type { PrecisionFarmingFeed, FarmlandStatCounter, FarmlandStat } from '../types/precisionFarming';
import { toArray, safeFloat, safeInt } from './utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = Record<string, any>;

function parseCounter(node: Raw): FarmlandStatCounter {
  const a = node?.$ ?? node ?? {};
  return {
    numSoilSamples: safeInt(a.numSoilSamples),
    soilSampleCosts: safeFloat(a.soilSampleCosts),
    usedLime: safeFloat(a.usedLime),
    usedMineralFertilizer: safeFloat(a.usedMineralFertilizer),
    usedLiquidFertilizer: safeFloat(a.usedLiquidFertilizer),
    usedManure: safeFloat(a.usedManure),
    usedLiquidManure: safeFloat(a.usedLiquidManure),
    usedSeeds: safeFloat(a.usedSeeds),
    usedHerbicide: safeFloat(a.usedHerbicide),
    yield: safeFloat(a.yield),
    yieldWeight: safeFloat(a.yieldWeight),
    yieldBestPrice: safeFloat(a.yieldBestPrice),
    usedFuel: safeFloat(a.usedFuel),
    vehicleCosts: safeFloat(a.vehicleCosts),
    helperCosts: safeFloat(a.helperCosts),
    subsidies: safeFloat(a.subsidies),
  };
}

export async function parsePrecisionFarming(xml: string): Promise<PrecisionFarmingFeed> {
  const raw: Raw = await parseStringPromise(xml, {
    explicitArray: false,
    trim: true,
    charkey: '_',
  });

  const root: Raw = raw?.precisionFarming ?? raw ?? {};
  const statsItems = toArray<Raw>(root?.farmlandStatistics?.farmlandStatistic ?? []);

  const farmlandStats: FarmlandStat[] = statsItems.map((item: Raw) => {
    const a = item?.$ ?? item;
    return {
      farmlandId: safeInt(a?.farmlandId),
      periodCounter: parseCounter(item?.periodCounter ?? {}),
      totalCounter: parseCounter(item?.totalCounter ?? {}),
    };
  });

  return { farmlandStats };
}
