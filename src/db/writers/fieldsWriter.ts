import type { Database } from 'better-sqlite3';
import defaultDb from '../connection';
import type { FieldsFeed } from '../../types/fields';

export function writeFields(feed: FieldsFeed, db: Database = defaultDb): void {
  const now = new Date().toISOString();

  const upsert = db.prepare(`
    INSERT INTO fields (
      field_id, fruit_type, planned_fruit, growth_state, last_growth_state,
      ground_type, weed_state, spray_type, spray_level, lime_level, roller_level,
      plow_level, stubble_shred_level, water_level, stone_level, last_updated
    ) VALUES (
      @fieldId, @fruitType, @plannedFruit, @growthState, @lastGrowthState,
      @groundType, @weedState, @sprayType, @sprayLevel, @limeLevel, @rollerLevel,
      @plowLevel, @stubbleShredLevel, @waterLevel, @stoneLevel, @now
    )
    ON CONFLICT(field_id) DO UPDATE SET
      fruit_type          = excluded.fruit_type,
      planned_fruit       = excluded.planned_fruit,
      growth_state        = excluded.growth_state,
      last_growth_state   = excluded.last_growth_state,
      ground_type         = excluded.ground_type,
      weed_state          = excluded.weed_state,
      spray_type          = excluded.spray_type,
      spray_level         = excluded.spray_level,
      lime_level          = excluded.lime_level,
      roller_level        = excluded.roller_level,
      plow_level          = excluded.plow_level,
      stubble_shred_level = excluded.stubble_shred_level,
      water_level         = excluded.water_level,
      stone_level         = excluded.stone_level,
      last_updated        = excluded.last_updated
  `);

  const writeAll = db.transaction(() => {
    for (const f of feed.fields) {
      upsert.run({
        fieldId: f.id,
        fruitType: f.fruitType,
        plannedFruit: f.plannedFruit,
        growthState: f.growthState,
        lastGrowthState: f.lastGrowthState,
        groundType: f.groundType,
        weedState: f.weedState,
        sprayType: f.sprayType,
        sprayLevel: f.sprayLevel,
        limeLevel: f.limeLevel,
        rollerLevel: f.rollerLevel,
        plowLevel: f.plowLevel,
        stubbleShredLevel: f.stubbleShredLevel,
        waterLevel: f.waterLevel,
        stoneLevel: f.stoneLevel,
        now,
      });
    }
  });

  writeAll();
}
