export type SeasonPeriod =
  | 'EARLY_SPRING'
  | 'MID_SPRING'
  | 'LATE_SPRING'
  | 'EARLY_SUMMER'
  | 'MID_SUMMER'
  | 'LATE_SUMMER'
  | 'EARLY_AUTUMN'
  | 'MID_AUTUMN'
  | 'LATE_AUTUMN'
  | 'EARLY_WINTER'
  | 'MID_WINTER'
  | 'LATE_WINTER'
  | string;

export interface PricePoint {
  period: SeasonPeriod;
  price: number;
}

export interface CropPrices {
  fillType: string;
  prices: PricePoint[];
}

export interface EconomyFeed {
  crops: CropPrices[];
}
