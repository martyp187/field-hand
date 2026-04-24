import type { Database } from 'better-sqlite3';
import { getDefaultPalette } from '../parser/farmColours';

export function initSchema(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS server_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      snapshot_time TEXT NOT NULL,
      server_name TEXT,
      map_name TEXT,
      day_time_ms INTEGER,
      day_time_formatted TEXT,
      in_game_day INTEGER,
      season TEXT,
      player_count INTEGER,
      game_version TEXT,
      slots_capacity INTEGER,
      slots_used INTEGER
    );

    CREATE TABLE IF NOT EXISTS farms (
      farm_id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      colour_index INTEGER,
      colour_hex TEXT,
      money REAL,
      loan REAL,
      last_updated TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS farm_finance_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      farm_id INTEGER NOT NULL REFERENCES farms(farm_id),
      snapshot_time TEXT NOT NULL,
      in_game_day INTEGER NOT NULL,
      new_vehicles_cost REAL,
      sold_vehicles REAL,
      field_purchase REAL,
      field_selling REAL,
      harvest_income REAL,
      mission_income REAL,
      sold_milk REAL,
      sold_wool REAL,
      sold_products REAL,
      sold_bales REAL,
      sold_wood REAL,
      purchase_fuel REAL,
      purchase_seeds REAL,
      purchase_fertilizer REAL,
      loan_interest REAL,
      loan REAL,
      invoice_payment REAL,
      wage_payment REAL,
      other REAL,
      new_animals_cost REAL,
      sold_animals REAL,
      construction_cost REAL,
      vehicle_running_cost REAL,
      production_costs REAL,
      income_bga REAL,
      UNIQUE(farm_id, in_game_day)
    );

    CREATE TABLE IF NOT EXISTS farm_statistics_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      farm_id INTEGER NOT NULL REFERENCES farms(farm_id),
      snapshot_time TEXT NOT NULL,
      worked_hectares REAL,
      cultivated_hectares REAL,
      sown_hectares REAL,
      threshed_hectares REAL,
      sprayed_hectares REAL,
      plowed_hectares REAL,
      fuel_usage REAL,
      revenue REAL,
      expenses REAL,
      play_time REAL,
      mission_count INTEGER,
      bale_count INTEGER,
      breed_cows_count INTEGER,
      breed_sheep_count INTEGER,
      breed_pigs_count INTEGER,
      breed_chicken_count INTEGER,
      breed_horses_count INTEGER,
      breed_goats_count INTEGER
    );

    CREATE TABLE IF NOT EXISTS players (
      unique_user_id TEXT PRIMARY KEY,
      last_nickname TEXT,
      time_last_connected TEXT,
      last_seen_farm_id INTEGER
    );

    CREATE TABLE IF NOT EXISTS farm_players (
      farm_id INTEGER NOT NULL REFERENCES farms(farm_id),
      unique_user_id TEXT NOT NULL REFERENCES players(unique_user_id),
      farm_manager INTEGER NOT NULL DEFAULT 0,
      last_nickname TEXT,
      time_last_connected TEXT,
      buy_vehicle INTEGER DEFAULT 0,
      sell_vehicle INTEGER DEFAULT 0,
      buy_placeable INTEGER DEFAULT 0,
      sell_placeable INTEGER DEFAULT 0,
      manage_contracts INTEGER DEFAULT 0,
      trade_animals INTEGER DEFAULT 0,
      create_fields INTEGER DEFAULT 0,
      landscaping INTEGER DEFAULT 0,
      hire_assistant INTEGER DEFAULT 0,
      reset_vehicle INTEGER DEFAULT 0,
      manage_productions INTEGER DEFAULT 0,
      cut_trees INTEGER DEFAULT 0,
      manage_rights INTEGER DEFAULT 0,
      transfer_money INTEGER DEFAULT 0,
      update_farm INTEGER DEFAULT 0,
      manage_contracting INTEGER DEFAULT 0,
      PRIMARY KEY (farm_id, unique_user_id)
    );

    CREATE TABLE IF NOT EXISTS farmlands (
      farmland_id INTEGER PRIMARY KEY,
      name TEXT,
      owner_farm_id INTEGER NOT NULL DEFAULT 0,
      area_ha REAL,
      current_price REAL,
      x REAL,
      z REAL,
      last_updated TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS farmland_price_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      farmland_id INTEGER NOT NULL REFERENCES farmlands(farmland_id),
      snapshot_time TEXT NOT NULL,
      price REAL NOT NULL,
      owner_farm_id INTEGER
    );

    CREATE TABLE IF NOT EXISTS fields (
      field_id INTEGER PRIMARY KEY,
      fruit_type TEXT,
      planned_fruit TEXT,
      growth_state INTEGER,
      last_growth_state INTEGER,
      ground_type TEXT,
      weed_state INTEGER,
      spray_type TEXT,
      spray_level REAL,
      lime_level REAL,
      roller_level REAL,
      plow_level REAL,
      stubble_shred_level REAL,
      water_level REAL,
      stone_level REAL,
      last_updated TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      unique_id TEXT PRIMARY KEY,
      filename TEXT,
      name TEXT,
      category TEXT,
      type TEXT,
      farm_id INTEGER,
      property_state TEXT,
      age REAL,
      purchase_price REAL,
      operating_time REAL,
      damage REAL,
      wear REAL,
      dirt REAL,
      fills_json TEXT,
      x REAL,
      y REAL,
      z REAL,
      is_ai_active INTEGER NOT NULL DEFAULT 0,
      attached_vehicle_ids_json TEXT,
      last_updated TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS environment_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      snapshot_time TEXT NOT NULL,
      current_day INTEGER,
      current_monotonic_day INTEGER,
      season TEXT,
      day_time REAL,
      time_since_last_rain REAL,
      weather_forecast_json TEXT
    );

    CREATE TABLE IF NOT EXISTS economy_prices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fill_type TEXT NOT NULL,
      period_name TEXT NOT NULL,
      price REAL NOT NULL,
      last_updated TEXT NOT NULL,
      UNIQUE(fill_type, period_name)
    );

    CREATE TABLE IF NOT EXISTS invoices (
      invoice_id INTEGER PRIMARY KEY,
      sender_farm_id INTEGER,
      recipient_farm_id INTEGER,
      state INTEGER,
      created_at_day INTEGER,
      line_items_json TEXT,
      last_updated TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sales_market (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_filename TEXT NOT NULL UNIQUE,
      time_left INTEGER,
      age INTEGER,
      price REAL,
      damage REAL,
      wear REAL,
      operating_time REAL,
      is_generated INTEGER NOT NULL DEFAULT 0,
      last_updated TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      farm_id INTEGER,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT,
      priority TEXT NOT NULL DEFAULT 'MEDIUM',
      status TEXT NOT NULL DEFAULT 'OPEN',
      due_date TEXT,
      created_by_nickname TEXT,
      created_at TEXT NOT NULL,
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS task_claims (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id),
      player_nickname TEXT NOT NULL,
      claimed_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS server_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      target_value REAL,
      current_value REAL NOT NULL DEFAULT 0,
      unit TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at TEXT NOT NULL,
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS recurring_task_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      farm_id INTEGER,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT,
      priority TEXT NOT NULL DEFAULT 'MEDIUM',
      trigger_type TEXT,
      trigger_value TEXT,
      last_generated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS farmland_precision_stats (
      farmland_id INTEGER PRIMARY KEY,
      period_counter_json TEXT NOT NULL,
      total_counter_json TEXT NOT NULL,
      last_updated TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS poller_health (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_name TEXT NOT NULL UNIQUE,
      last_poll_at TEXT,
      last_success_at TEXT,
      last_error TEXT,
      consecutive_failures INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'UNKNOWN'
    );

    CREATE TABLE IF NOT EXISTS data_quality_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      alert_time TEXT NOT NULL,
      source TEXT NOT NULL,
      validator_name TEXT NOT NULL,
      description TEXT,
      resolved INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT,
      data_json TEXT,
      farm_id INTEGER,
      dedup_key TEXT UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

export function seedSettings(db: Database): void {
  const now = new Date().toISOString();
  const defaults: [string, string][] = [
    ['httpPollIntervalSeconds', '60'],
    ['ftpPollIntervalSeconds', '180'],
    ['ignoredFarmIds', '[2]'],
    ['mapImageUrl', 'null'],
    ['serverTimezone', 'UTC'],
    ['notificationsEnabled', 'true'],
    ['rawRetentionDays', '7'],
    ['hourlyRetentionDays', '90'],
    ['farmColourPalette', JSON.stringify(getDefaultPalette())],
  ];

  const stmt = db.prepare(
    `INSERT OR IGNORE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)`,
  );
  const insertAll = db.transaction(() => {
    for (const [key, value] of defaults) {
      stmt.run(key, value, now);
    }
  });
  insertAll();
}
