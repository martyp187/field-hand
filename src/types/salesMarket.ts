export interface SaleItem {
  xmlFilename: string;
  timeLeft: number; // in-game days remaining
  age: number; // in-game months
  price: number;
  damage: number; // 0–1
  wear: number; // 0–1
  operatingTime: number; // hours
  isGenerated: boolean;
}

export interface SalesMarketFeed {
  items: SaleItem[];
}
