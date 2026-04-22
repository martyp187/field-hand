import { parseStringPromise } from 'xml2js';
import { Farm, FarmPlayer, FarmStatistics, FarmFinanceDay, FarmsFeed } from '../types/farms';
import { getFarmColour } from './farmColours';
import { toArray, safeFloat, safeInt, safeBool } from './utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = Record<string, any>;

function childFloat(node: Raw, key: string): number {
  return safeFloat(node?.[key]);
}

function childInt(node: Raw, key: string): number {
  return safeInt(node?.[key]);
}

function parsePlayers(playersNode: Raw): FarmPlayer[] {
  return toArray<Raw>(playersNode?.player).map((p: Raw) => {
    const a = p?.$ ?? p;
    return {
      uniqueUserId: String(a?.uniqueUserId ?? ''),
      lastNickname: String(a?.lastNickname ?? ''),
      timeLastConnected: String(a?.timeLastConnected ?? ''),
      farmManager: safeBool(a?.farmManager),
      buyVehicle: safeBool(a?.buyVehicle),
      sellVehicle: safeBool(a?.sellVehicle),
      buyPlaceable: safeBool(a?.buyPlaceable),
      sellPlaceable: safeBool(a?.sellPlaceable),
      manageContracts: safeBool(a?.manageContracts),
      tradeAnimals: safeBool(a?.tradeAnimals),
      createFields: safeBool(a?.createFields),
      landscaping: safeBool(a?.landscaping),
      hireAssistant: safeBool(a?.hireAssistant),
      resetVehicle: safeBool(a?.resetVehicle),
      manageProductions: safeBool(a?.manageProductions),
      cutTrees: safeBool(a?.cutTrees),
      manageRights: safeBool(a?.manageRights),
      transferMoney: safeBool(a?.transferMoney),
      updateFarm: safeBool(a?.updateFarm),
      manageContracting: safeBool(a?.manageContracting),
    };
  });
}

function parseStatistics(statsNode: Raw): FarmStatistics {
  return {
    workedHectares: childFloat(statsNode, 'workedHectares'),
    cultivatedHectares: childFloat(statsNode, 'cultivatedHectares'),
    sownHectares: childFloat(statsNode, 'sownHectares'),
    threshedHectares: childFloat(statsNode, 'threshedHectares'),
    sprayedHectares: childFloat(statsNode, 'sprayedHectares'),
    plowedHectares: childFloat(statsNode, 'plowedHectares'),
    fuelUsage: childFloat(statsNode, 'fuelUsage'),
    revenue: childFloat(statsNode, 'revenue'),
    expenses: childFloat(statsNode, 'expenses'),
    playTime: childFloat(statsNode, 'playTime'),
    missionCount: childInt(statsNode, 'missionCount'),
    baleCount: childInt(statsNode, 'baleCount'),
    breedCowsCount: childInt(statsNode, 'breedCowsCount'),
    breedSheepCount: childInt(statsNode, 'breedSheepCount'),
    breedPigsCount: childInt(statsNode, 'breedPigsCount'),
    breedChickenCount: childInt(statsNode, 'breedChickenCount'),
    breedHorsesCount: childInt(statsNode, 'breedHorsesCount'),
    breedGoatsCount: childInt(statsNode, 'breedGoatsCount'),
  };
}

function parseFinances(financesNode: Raw): FarmFinanceDay[] {
  return toArray<Raw>(financesNode?.stats).map((s: Raw) => {
    const day = safeInt(s?.$?.day ?? s?.day);
    return {
      day,
      newVehiclesCost: childFloat(s, 'newVehiclesCost'),
      soldVehicles: childFloat(s, 'soldVehicles'),
      fieldPurchase: childFloat(s, 'fieldPurchase'),
      fieldSelling: childFloat(s, 'fieldSelling'),
      harvestIncome: childFloat(s, 'harvestIncome'),
      missionIncome: childFloat(s, 'missionIncome'),
      soldMilk: childFloat(s, 'soldMilk'),
      soldWool: childFloat(s, 'soldWool'),
      soldProducts: childFloat(s, 'soldProducts'),
      soldBales: childFloat(s, 'soldBales'),
      soldWood: childFloat(s, 'soldWood'),
      purchaseFuel: childFloat(s, 'purchaseFuel'),
      purchaseSeeds: childFloat(s, 'purchaseSeeds'),
      purchaseFertilizer: childFloat(s, 'purchaseFertilizer'),
      loanInterest: childFloat(s, 'loanInterest'),
      loan: childFloat(s, 'loan'),
      invoicePayment: childFloat(s, 'invoicePayment'),
      wagePayment: childFloat(s, 'wagePayment'),
      other: childFloat(s, 'other'),
      newAnimalsCost: childFloat(s, 'newAnimalsCost'),
      soldAnimals: childFloat(s, 'soldAnimals'),
      constructionCost: childFloat(s, 'constructionCost'),
      vehicleRunningCost: childFloat(s, 'vehicleRunningCost'),
      productionCosts: childFloat(s, 'productionCosts'),
      incomeBga: childFloat(s, 'incomeBga'),
    };
  });
}

export async function parseFarms(xml: string, ignoredFarmIds: number[] = []): Promise<FarmsFeed> {
  const raw: Raw = await parseStringPromise(xml, {
    explicitArray: false,
    trim: true,
    charkey: '_',
  });

  const root: Raw = raw?.farms ?? raw?.Farms ?? raw ?? {};
  const farmItems = toArray<Raw>(root?.farm ?? root?.Farm);

  const farms: Farm[] = farmItems
    .map((f: Raw) => {
      const a = f?.$ ?? f;
      const farmId = safeInt(a?.farmId);
      const colorIndex = safeInt(a?.color);
      return {
        farmId,
        name: String(a?.name ?? ''),
        colorIndex,
        colorHex: getFarmColour(colorIndex),
        money: safeFloat(a?.money),
        loan: safeFloat(a?.loan),
        players: parsePlayers(f?.players ?? {}),
        statistics: parseStatistics(f?.statistics ?? {}),
        finances: parseFinances(f?.finances ?? {}),
      };
    })
    .filter((farm) => !ignoredFarmIds.includes(farm.farmId));

  return { farms };
}
