export interface Field {
  id: number;
  fruitType: string;
  plannedFruit: string;
  growthState: number;
  lastGrowthState: number;
  groundType: string;
  weedState: number;
  sprayType: string;
  sprayLevel: number;
  limeLevel: number;
  rollerLevel: number;
  plowLevel: number;
  stubbleShredLevel: number;
  waterLevel: number;
  stoneLevel: number;
}

export interface FieldsFeed {
  fields: Field[];
}
