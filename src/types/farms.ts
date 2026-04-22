export interface FarmPlayer {
  uniqueUserId: string;
  lastNickname: string;
  timeLastConnected: string;
  farmManager: boolean;
  buyVehicle: boolean;
  sellVehicle: boolean;
  buyPlaceable: boolean;
  sellPlaceable: boolean;
  manageContracts: boolean;
  tradeAnimals: boolean;
  createFields: boolean;
  landscaping: boolean;
  hireAssistant: boolean;
  resetVehicle: boolean;
  manageProductions: boolean;
  cutTrees: boolean;
  manageRights: boolean;
  transferMoney: boolean;
  updateFarm: boolean;
  manageContracting: boolean;
}

export interface FarmStatistics {
  workedHectares: number;
  cultivatedHectares: number;
  sownHectares: number;
  threshedHectares: number;
  sprayedHectares: number;
  plowedHectares: number;
  fuelUsage: number;
  revenue: number;
  expenses: number;
  playTime: number;
  missionCount: number;
  baleCount: number;
  breedCowsCount: number;
  breedSheepCount: number;
  breedPigsCount: number;
  breedChickenCount: number;
  breedHorsesCount: number;
  breedGoatsCount: number;
}

export interface FarmFinanceDay {
  day: number;
  newVehiclesCost: number;
  soldVehicles: number;
  fieldPurchase: number;
  fieldSelling: number;
  harvestIncome: number;
  missionIncome: number;
  soldMilk: number;
  soldWool: number;
  soldProducts: number;
  soldBales: number;
  soldWood: number;
  purchaseFuel: number;
  purchaseSeeds: number;
  purchaseFertilizer: number;
  loanInterest: number;
  loan: number;
  invoicePayment: number;
  wagePayment: number;
  other: number;
  newAnimalsCost: number;
  soldAnimals: number;
  constructionCost: number;
  vehicleRunningCost: number;
  productionCosts: number;
  incomeBga: number;
}

export interface Farm {
  farmId: number;
  name: string;
  colorIndex: number;
  colorHex: string;
  money: number;
  loan: number;
  players: FarmPlayer[];
  statistics: FarmStatistics;
  finances: FarmFinanceDay[];
}

export interface FarmsFeed {
  farms: Farm[];
}
