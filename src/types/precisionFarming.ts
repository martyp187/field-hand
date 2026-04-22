export interface FarmlandStatCounter {
  numSoilSamples: number;
  soilSampleCosts: number;
  usedLime: number;
  usedMineralFertilizer: number;
  usedLiquidFertilizer: number;
  usedManure: number;
  usedLiquidManure: number;
  usedSeeds: number;
  usedHerbicide: number;
  yield: number;
  yieldWeight: number;
  yieldBestPrice: number;
  usedFuel: number;
  vehicleCosts: number;
  helperCosts: number;
  subsidies: number;
}

export interface FarmlandStat {
  farmlandId: number;
  periodCounter: FarmlandStatCounter;
  totalCounter: FarmlandStatCounter;
}

export interface PrecisionFarmingFeed {
  farmlandStats: FarmlandStat[];
}
