import type { Database } from 'better-sqlite3';
import defaultDb from '../connection';
import type { FarmsFeed } from '../../types/farms';

export function writeFarms(feed: FarmsFeed, db: Database = defaultDb): void {
  const now = new Date().toISOString();

  const upsertFarm = db.prepare(`
    INSERT INTO farms (farm_id, name, colour_index, colour_hex, money, loan, last_updated)
    VALUES (@farmId, @name, @colourIndex, @colourHex, @money, @loan, @now)
    ON CONFLICT(farm_id) DO UPDATE SET
      name         = excluded.name,
      colour_index = excluded.colour_index,
      colour_hex   = excluded.colour_hex,
      money        = excluded.money,
      loan         = excluded.loan,
      last_updated = excluded.last_updated
  `);

  const upsertPlayer = db.prepare(`
    INSERT INTO players (unique_user_id, last_nickname, time_last_connected, last_seen_farm_id)
    VALUES (@uniqueUserId, @lastNickname, @timeLastConnected, @farmId)
    ON CONFLICT(unique_user_id) DO UPDATE SET
      last_nickname       = excluded.last_nickname,
      time_last_connected = excluded.time_last_connected,
      last_seen_farm_id   = excluded.last_seen_farm_id
  `);

  const upsertFarmPlayer = db.prepare(`
    INSERT INTO farm_players (
      farm_id, unique_user_id, farm_manager, last_nickname, time_last_connected,
      buy_vehicle, sell_vehicle, buy_placeable, sell_placeable, manage_contracts,
      trade_animals, create_fields, landscaping, hire_assistant, reset_vehicle,
      manage_productions, cut_trees, manage_rights, transfer_money, update_farm,
      manage_contracting
    ) VALUES (
      @farmId, @uniqueUserId, @farmManager, @lastNickname, @timeLastConnected,
      @buyVehicle, @sellVehicle, @buyPlaceable, @sellPlaceable, @manageContracts,
      @tradeAnimals, @createFields, @landscaping, @hireAssistant, @resetVehicle,
      @manageProductions, @cutTrees, @manageRights, @transferMoney, @updateFarm,
      @manageContracting
    )
    ON CONFLICT(farm_id, unique_user_id) DO UPDATE SET
      farm_manager       = excluded.farm_manager,
      last_nickname      = excluded.last_nickname,
      time_last_connected = excluded.time_last_connected,
      buy_vehicle        = excluded.buy_vehicle,
      sell_vehicle       = excluded.sell_vehicle,
      buy_placeable      = excluded.buy_placeable,
      sell_placeable     = excluded.sell_placeable,
      manage_contracts   = excluded.manage_contracts,
      trade_animals      = excluded.trade_animals,
      create_fields      = excluded.create_fields,
      landscaping        = excluded.landscaping,
      hire_assistant     = excluded.hire_assistant,
      reset_vehicle      = excluded.reset_vehicle,
      manage_productions = excluded.manage_productions,
      cut_trees          = excluded.cut_trees,
      manage_rights      = excluded.manage_rights,
      transfer_money     = excluded.transfer_money,
      update_farm        = excluded.update_farm,
      manage_contracting = excluded.manage_contracting
  `);

  // INSERT OR REPLACE so the latest values for a given farm+day are always current
  const upsertFinance = db.prepare(`
    INSERT OR REPLACE INTO farm_finance_snapshots (
      farm_id, snapshot_time, in_game_day,
      new_vehicles_cost, sold_vehicles, field_purchase, field_selling, harvest_income,
      mission_income, sold_milk, sold_wool, sold_products, sold_bales, sold_wood,
      purchase_fuel, purchase_seeds, purchase_fertilizer, loan_interest, loan,
      invoice_payment, wage_payment, other, new_animals_cost, sold_animals,
      construction_cost, vehicle_running_cost, production_costs, income_bga
    ) VALUES (
      @farmId, @snapshotTime, @inGameDay,
      @newVehiclesCost, @soldVehicles, @fieldPurchase, @fieldSelling, @harvestIncome,
      @missionIncome, @soldMilk, @soldWool, @soldProducts, @soldBales, @soldWood,
      @purchaseFuel, @purchaseSeeds, @purchaseFertilizer, @loanInterest, @loan,
      @invoicePayment, @wagePayment, @other, @newAnimalsCost, @soldAnimals,
      @constructionCost, @vehicleRunningCost, @productionCosts, @incomeBga
    )
  `);

  const insertStats = db.prepare(`
    INSERT INTO farm_statistics_snapshots (
      farm_id, snapshot_time,
      worked_hectares, cultivated_hectares, sown_hectares, threshed_hectares,
      sprayed_hectares, plowed_hectares, fuel_usage, revenue, expenses, play_time,
      mission_count, bale_count, breed_cows_count, breed_sheep_count, breed_pigs_count,
      breed_chicken_count, breed_horses_count, breed_goats_count
    ) VALUES (
      @farmId, @snapshotTime,
      @workedHectares, @cultivatedHectares, @sownHectares, @threshedHectares,
      @sprayedHectares, @plowedHectares, @fuelUsage, @revenue, @expenses, @playTime,
      @missionCount, @baleCount, @breedCowsCount, @breedSheepCount, @breedPigsCount,
      @breedChickenCount, @breedHorsesCount, @breedGoatsCount
    )
  `);

  const writeAll = db.transaction(() => {
    for (const farm of feed.farms) {
      upsertFarm.run({
        farmId: farm.farmId,
        name: farm.name,
        colourIndex: farm.colorIndex,
        colourHex: farm.colorHex,
        money: farm.money,
        loan: farm.loan,
        now,
      });

      for (const p of farm.players) {
        upsertPlayer.run({
          uniqueUserId: p.uniqueUserId,
          lastNickname: p.lastNickname,
          timeLastConnected: p.timeLastConnected,
          farmId: farm.farmId,
        });

        upsertFarmPlayer.run({
          farmId: farm.farmId,
          uniqueUserId: p.uniqueUserId,
          farmManager: p.farmManager ? 1 : 0,
          lastNickname: p.lastNickname,
          timeLastConnected: p.timeLastConnected,
          buyVehicle: p.buyVehicle ? 1 : 0,
          sellVehicle: p.sellVehicle ? 1 : 0,
          buyPlaceable: p.buyPlaceable ? 1 : 0,
          sellPlaceable: p.sellPlaceable ? 1 : 0,
          manageContracts: p.manageContracts ? 1 : 0,
          tradeAnimals: p.tradeAnimals ? 1 : 0,
          createFields: p.createFields ? 1 : 0,
          landscaping: p.landscaping ? 1 : 0,
          hireAssistant: p.hireAssistant ? 1 : 0,
          resetVehicle: p.resetVehicle ? 1 : 0,
          manageProductions: p.manageProductions ? 1 : 0,
          cutTrees: p.cutTrees ? 1 : 0,
          manageRights: p.manageRights ? 1 : 0,
          transferMoney: p.transferMoney ? 1 : 0,
          updateFarm: p.updateFarm ? 1 : 0,
          manageContracting: p.manageContracting ? 1 : 0,
        });
      }

      for (const fin of farm.finances) {
        upsertFinance.run({
          farmId: farm.farmId,
          snapshotTime: now,
          inGameDay: fin.day,
          newVehiclesCost: fin.newVehiclesCost,
          soldVehicles: fin.soldVehicles,
          fieldPurchase: fin.fieldPurchase,
          fieldSelling: fin.fieldSelling,
          harvestIncome: fin.harvestIncome,
          missionIncome: fin.missionIncome,
          soldMilk: fin.soldMilk,
          soldWool: fin.soldWool,
          soldProducts: fin.soldProducts,
          soldBales: fin.soldBales,
          soldWood: fin.soldWood,
          purchaseFuel: fin.purchaseFuel,
          purchaseSeeds: fin.purchaseSeeds,
          purchaseFertilizer: fin.purchaseFertilizer,
          loanInterest: fin.loanInterest,
          loan: fin.loan,
          invoicePayment: fin.invoicePayment,
          wagePayment: fin.wagePayment,
          other: fin.other,
          newAnimalsCost: fin.newAnimalsCost,
          soldAnimals: fin.soldAnimals,
          constructionCost: fin.constructionCost,
          vehicleRunningCost: fin.vehicleRunningCost,
          productionCosts: fin.productionCosts,
          incomeBga: fin.incomeBga,
        });
      }

      const s = farm.statistics;
      insertStats.run({
        farmId: farm.farmId,
        snapshotTime: now,
        workedHectares: s.workedHectares,
        cultivatedHectares: s.cultivatedHectares,
        sownHectares: s.sownHectares,
        threshedHectares: s.threshedHectares,
        sprayedHectares: s.sprayedHectares,
        plowedHectares: s.plowedHectares,
        fuelUsage: s.fuelUsage,
        revenue: s.revenue,
        expenses: s.expenses,
        playTime: s.playTime,
        missionCount: s.missionCount,
        baleCount: s.baleCount,
        breedCowsCount: s.breedCowsCount,
        breedSheepCount: s.breedSheepCount,
        breedPigsCount: s.breedPigsCount,
        breedChickenCount: s.breedChickenCount,
        breedHorsesCount: s.breedHorsesCount,
        breedGoatsCount: s.breedGoatsCount,
      });
    }
  });

  writeAll();
}
