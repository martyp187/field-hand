import type { Database } from 'better-sqlite3';
import defaultDb from '../connection';
import type { VehiclesFeed } from '../../types/vehicles';

export function writeVehicles(feed: VehiclesFeed, db: Database = defaultDb): void {
  const now = new Date().toISOString();

  const upsert = db.prepare(`
    INSERT INTO vehicles (
      unique_id, filename, name, category, type, farm_id, property_state, age,
      purchase_price, operating_time, damage, wear, dirt, fills_json,
      x, y, z, is_ai_active, attached_vehicle_ids_json, last_updated
    ) VALUES (
      @uniqueId, @filename, @name, @category, @type, @farmId, @propertyState, @age,
      @purchasePrice, @operatingTime, @damage, @wear, @dirt, @fillsJson,
      @x, @y, @z, @isAIActive, @attachedVehicleIdsJson, @now
    )
    ON CONFLICT(unique_id) DO UPDATE SET
      filename                 = excluded.filename,
      name                     = excluded.name,
      category                 = excluded.category,
      type                     = excluded.type,
      farm_id                  = excluded.farm_id,
      property_state           = excluded.property_state,
      age                      = excluded.age,
      purchase_price           = excluded.purchase_price,
      operating_time           = excluded.operating_time,
      damage                   = excluded.damage,
      wear                     = excluded.wear,
      dirt                     = excluded.dirt,
      fills_json               = excluded.fills_json,
      x                        = excluded.x,
      y                        = excluded.y,
      z                        = excluded.z,
      is_ai_active             = excluded.is_ai_active,
      attached_vehicle_ids_json = excluded.attached_vehicle_ids_json,
      last_updated             = excluded.last_updated
  `);

  const writeAll = db.transaction(() => {
    for (const v of feed.vehicles) {
      upsert.run({
        uniqueId: v.uniqueId,
        filename: v.filename,
        name: v.name,
        category: v.category,
        type: v.type,
        farmId: v.farmId,
        propertyState: v.propertyState,
        age: v.age,
        purchasePrice: v.purchasePrice,
        operatingTime: v.operatingTime,
        damage: v.damage,
        wear: v.wear,
        dirt: v.dirt,
        fillsJson: JSON.stringify(v.fills),
        x: v.x,
        y: v.y,
        z: v.z,
        isAIActive: v.isAIActive ? 1 : 0,
        attachedVehicleIdsJson: JSON.stringify(v.attachedVehicleIds),
        now,
      });
    }
  });

  writeAll();
}
