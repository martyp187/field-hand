# FS25 Farm Companion — Full Build Plan & Context

> This document is the authoritative reference for building the FS25 Farm Companion application.
> It was produced through detailed analysis of real server data across multiple snapshots.
> Read this entire document before writing any code.

---

## 1. Project Overview

### Purpose
A browser-based companion web application for a dedicated Farming Simulator 25 multiplayer server. The app serves all players on the server and has two core functions:

1. **Live server monitoring** — display real-time data about the server, farms, players, vehicles, fields and economy pulled automatically from the game server
2. **Planning & task management** — help players plan crop rotations, manage finances, track goals, assign and claim tasks, and optimise decisions around selling vs growing resources

The live data is the **foundation**, not the main feature. The planning tools are the primary value.

### Server Details
- **Game:** Farming Simulator 25 v1.18.0.0
- **Map:** Riverbend Springs (MapUS), 2048×2048 units
- **Server name:** Adam's Abandoned Farm
- **Server IP:** 149.102.148.127
- **HTTP port:** 8590
- **Max players:** 6 slots
- **Economic difficulty:** NORMAL
- **Time scale:** 5× (game time runs 5× faster than real time)
- **Growth mode:** 1
- **Initial money per farm:** $1,000,000
- **Autosave interval:** 180 seconds (read dynamically — do not hardcode)

### Audience
All players on the server. No authentication required — the app is open to anyone with the URL.

---

## 2. Tech Stack

### Design Constraints
- Hosted on a simple VPS (single machine, no container orchestration)
- Must be maintainable by a low-skill developer after the initial build
- Maintainer will only ever touch config files and environment variables in normal operation — never TypeScript source directly
- UI should use a well-documented component library to ensure consistency and reduce the amount of custom code written

### Stack Decisions

| Layer | Choice | Reason |
|---|---|---|
| **Backend runtime** | Node.js + Express | Most documented Node.js framework, enormous community, simple to read |
| **Backend language** | TypeScript (compiled to JS) | Catches bugs during build phase; maintainer only ever runs compiled JS output |
| **Database** | MariaDB | Robust, standard VPS database — familiar SQL, good tooling |
| **XML Parsing** | `xml2js` | Robust, widely used, well documented |
| **FTP Client** | `basic-ftp` | FTPS support, promise-based, simple API |
| **Scheduler** | `node-cron` | Simplest Node.js scheduling, universally understood cron syntax |
| **Frontend framework** | React + Vite | Most documented frontend framework, largest community, fast builds |
| **Frontend language** | TypeScript (compiled) | Same rationale as backend |
| **Styling** | Tailwind CSS | Rapid development, pairs naturally with shadcn/ui |
| **UI component library** | shadcn/ui | Tailwind-native, Radix UI primitives, excellent docs, huge community, highly customisable, reduces custom code significantly |
| **Charts** | Recharts | React-native, integrates naturally with shadcn/ui |
| **Realtime updates** | Server-Sent Events (SSE) | Server-to-client push only — simpler than WebSocket, works over standard HTTP, built-in browser reconnection, no upgrade handshake |
| **Testing** | Jest + ts-jest | Most documented JS testing framework, provides safety net for maintainer |
| **Process manager** | PM2 | Standard for Node.js on VPS, auto-restart, built-in log management |
| **Reverse proxy** | Nginx | Standard, well documented, handles HTTPS termination |

### Key Technology Notes

**TypeScript:** Claude Code handles all TypeScript during the build. The compiled JavaScript output in `/dist` is what PM2 runs in production. A maintainer making config or environment changes never needs to touch `.ts` files or run the TypeScript compiler manually.

**shadcn/ui:** Components are added to the project individually via the shadcn CLI (`npx shadcn-ui@latest add [component]`). They live in `/src/components/ui/` as editable source files — not a black-box npm package. This means full customisability without fighting the library. Use the [shadcn/ui docs](https://ui.shadcn.com) as the reference for all UI components.

**Server-Sent Events vs WebSocket:** SSE is a one-way push channel from server to browser. The browser connects to `/api/events` and receives a stream of named events (e.g. `server-update`, `farm-update`, `task-update`). Task claiming and other user actions use normal REST API calls — SSE is only for broadcasting live data changes. SSE has native browser reconnection built in, removing the need for custom reconnect logic on the client.

**MariaDB vs SQLite:** MariaDB was chosen as the stated preference. If the deployment is ever simplified or the VPS is low-resource, SQLite is a viable alternative — it is a single file, requires no separate database server process, and backups are just a file copy. The schema and query patterns used should be compatible with both.

---

## 3. Infrastructure Architecture

```
[FS25 Dedicated Server]
  ├── HTTP endpoints (stats, vehicles, economy, savegame feeds)
  └── FTP savegame folder (farms, fields, environment, players, etc.)
          │
          ▼
[Node.js Backend — separate VPS]
  ├── HTTP Poller Service (node-cron, dynamic interval)
  ├── FTP Poller Service (node-cron, dynamic interval)
  ├── XML Parser Layer (typed, defensive)
  ├── Data Validator Layer (anomaly detection)
  ├── Database Write Layer (upsert with diff detection)
  ├── Express REST API (/api/...)
  └── SSE Event Stream (/api/events — server-to-client live push)
          │
          ▼
[MariaDB Database]
  (snapshots, farm data, tasks, finance history, settings)
          │
          ▼
[React Frontend — served as static files via Nginx]
  ├── shadcn/ui components
  ├── Tailwind CSS
  └── Recharts
```

---

## 4. Data Sources

### 4.1 HTTP Endpoints

All HTTP endpoints are on the game server. No authentication required. HTTP only (not HTTPS). The base URL and query code are stored in environment variables.

**Base URL pattern:** `http://{FS25_HTTP_BASE_URL}:{FS25_HTTP_PORT}/feed/{endpoint}?code={FS25_STATS_CODE}`

| File | Endpoint Path | Poll Rate | Key Data |
|---|---|---|---|
| `dedicated-server-stats.xml` | `/feed/dedicated-server-stats.xml` | Dynamic (read from server config, min 60s, default 60s) | Players online, positions, uptime, admin status, farmland ownership, farmland prices, field owned status, vehicle list with fill levels and AI status, in-game dayTime, mods list |
| `dedicated-server-vehicles.xml` | `/feed/dedicated-server-vehicles.xml` | Same as savegame interval (180s default) | Full vehicle data with **farmId** (ownership), propertyState (OWNED/MISSION/NONE), operating hours, wear, damage, fill details, attached implement chains |
| `dedicated-server-economy.xml` | `/feed/dedicated-server-economy.xml` | On startup + once daily | Seasonal crop prices for all crop types across 12 periods (EARLY_SPRING through LATE_WINTER) |
| `dedicated-server-savegame.xml` | `/feed/dedicated-server-savegame.xml` | On startup only | Server settings including `autoSaveInterval`, `timeScale`, `economicDifficulty`, `growthMode` |

**Critical note on HTTP poll interval:** The stats.xml update frequency is a server-side setting. It cannot be read from the stats.xml file itself. It must be stored as a configurable app setting with a default of 60 seconds.

### 4.2 FTP Files

Located in the game server's savegame folder. Accessible via FTP (confirm FTPS support). The exact path is configurable. Files update on the game's autosave cycle (read `autoSaveInterval` from `careerSavegame.xml` — currently 180 seconds).

**FTP Base Path** (configurable in config.json): `/gameserver/saves/savegame1`

| File | Key Data |
|---|---|
| `farms.xml` | **Per-farm: name, colour index, current bank balance (money), current loan amount.** Per-farm player roster with uniqueUserId, lastNickname, farmManager flag, all permission flags. Per-farm operational statistics (workedHectares, cultivatedHectares, threshedHectares, fuelUsage, revenue, expenses, playTime, animal breed counts, baleCount, missionCount). Per-farm per-day itemised finances (newVehiclesCost, fieldPurchase, harvestIncome, soldMilk, soldWool, soldProducts, purchaseFuel, purchaseSeeds, loanInterest, invoicePayment, missionIncome and ~20 more categories) indexed by `day` attribute |
| `fields.xml` | Per-field: fruitType (crop), growthState (numeric), groundType (SOWN/CULTIVATED/HARVEST_READY/HARVEST_READY_OTHER/GRASS), weedState (0–9), sprayLevel, limeLevel, plowLevel, plannedFruit, stubbleShredLevel, waterLevel, stoneLevel |
| `environment.xml` | currentDay, currentMonotonicDay, current season (inferred from weather forecast), weather forecast (up to 15 in-game days ahead) with typeName (SUN/CLOUDY/RAIN/SNOW/HAIL), season, startDay, duration |
| `players.xml` | Global player registry: uniqueUserId, timeLastConnected, character style details |
| `careerSavegame.xml` | `autoSaveInterval` (seconds), `timeScale`, all server settings. **Read this first on startup to set FTP poll interval.** |
| `vehicles.xml` (FTP) | Full vehicle state: farmId, propertyState (OWNED/MISSION/NONE), age, purchase price, operatingTime, wear, damage, dirt, fuel/fill levels, attached implement chains via attachedVehicleUniqueId, mod-specific settings (Courseplay, AutoDrive etc.) |
| `invoices.xml` | Inter-farm invoice records (populated by FS25_Invoices mod). Currently may be empty on a new save. |
| `sales.xml` | Used vehicle market listings: vehicle filename, price, damage, wear percentage, operatingTime, timeLeft in market |
| `precisionFarming.xml` | Per-farmland: tramline settings, soil sample coverage percentage, fertiliser usage history (lime, mineral, liquid, manure), yield data vs benchmark, tillage area breakdown, harvested state flags |
| `farmland.xml` | Additional farmland data (supplement to stats.xml farmland data) |
| `economy.xml` (FTP) | Same crop price data as HTTP economy endpoint — use whichever is fresher |
| `items.xml` | Placed world items (bales, pallets etc.) — useful for tracking produce on the ground |

### 4.3 Map Image

The map overview image path is given in `stats.xml` as a relative path:
`data/maps/mapUS/textures/ui/overview.png`

The full URL construction is not confirmed. Test whether it resolves at:
`http://{server}:{port}/data/maps/mapUS/textures/ui/overview.png`

If not resolvable automatically, fall back to a manually configured URL in app settings. The map coordinate system runs from approximately -1024 to +1024 on both X and Z axes for a 2048-unit map.

---

## 5. Critical Data Notes

### Farm IDs
- **Farm 0** — reserved (unowned land / map-owned vehicles like the train)
- **Farm 1** — first player farm ("test farm 1" in development)
- **Farm 2** — AI/system farm used by the `FS25_WorkingNeighborOnField` mod. **Must be excluded from all player-facing displays, statistics, and the database.** The ignored farm ID list is configurable in app settings.
- **Farm 3+** — additional player farms

Farm names and colours come from `farms.xml` (FTP), not from `stats.xml`. The colour field is a numeric index — map to a defined hex palette.

### Vehicle Ownership
Vehicle `farmId` is available in `dedicated-server-vehicles.xml` (HTTP) and `vehicles.xml` (FTP). Always use this attribute directly — never infer ownership from vehicle location, as farms cooperate and vehicles move between farm territories.

**Vehicle propertyState values:**
- `NONE` — map-owned (train wagons, ignore these)
- `OWNED` — purchased by the farm
- `MISSION` — borrowed for a contract (ephemeral — disappears when contract ends)

Vehicles with `propertyState="MISSION"` disappearing between polls is normal and expected — handle gracefully.

### Player Identity
Players are identified by `uniqueUserId` (a base64 hash, stable across sessions) in `farms.xml` and `players.xml`. The `lastNickname` field provides the display name. In `stats.xml` (HTTP), the player's text content is their nickname. Cross-reference by nickname for real-time online status, by uniqueUserId for historical records.

### dayTime Conversion
`dayTime` in `stats.xml` is in milliseconds from midnight of the current in-game day.
Formula: `HH:MM = floor(dayTime / 3600000) + ":" + floor((dayTime % 3600000) / 60000)`
Real-world time elapsed ≠ in-game time elapsed due to `timeScale` (currently 5×).

### Farmland Prices Are Dynamic
The `price` attribute on `<Farmland>` elements in `stats.xml` is **not** a fixed purchase price — it reflects the current market value of the land, which fluctuates due to the `FS25_DynamicFieldPrices` and `FS25_ZYX_SeasonalPrices` mods. Track this value over time to show land portfolio market value trends.

### finances day Attribute — CRITICAL UNKNOWN
The `<stats day="0">` structure in `farms.xml` may either:
- Accumulate new entries (`day="1"`, `day="2"` etc.) as in-game days pass, OR
- Only ever contain the current day's running totals (overwriting each day)

**This must be tested in Phase 3** before designing the finance history schema. Advance the in-game date and re-fetch `farms.xml`. Design the database to store our own per-snapshot financial records regardless — never rely solely on the game maintaining its own history.

### Fill Type Parsing
Some vehicles report multiple fill types as space-separated strings:
`fillTypes="DIESEL DEF AIR"` / `fillLevels="610.000 70.000 2111.039"`
These must be split and zipped into paired objects: `[{type: "DIESEL", level: 610}, {type: "DEF", level: 70}, ...]`

### Active Mods of Note
These mods affect the data we see and how we interpret it:
- `FS25_WorkingNeighborOnField` — creates the AI Farm 2
- `FS25_DynamicFieldPrices` + `FS25_ZYX_SeasonalPrices` — make farmland prices dynamic
- `FS25_precisionFarming` — enables soil health data in precisionFarming.xml
- `FS25_EnhancedLoanSystem` — loan system settings in els_loans.xml
- `FS25_Invoices` — inter-farm invoicing in invoices.xml
- `FS25_BetterContracts` — affects contract/mission data
- `FS25_Courseplay` + `FS25_AutoDrive` — AI vehicle operation (isAIActive flag)

---

## 6. Settings Architecture

Settings are resolved in priority order (highest first):

```
1. Database app_settings table  (admin-configurable at runtime via UI)
2. config.json                  (structural defaults, committed to source control)
3. .env                         (sensitive credentials, never committed)
4. Hardcoded fallbacks          (absolute last resort)
```

### 6.1 Environment Variables (.env)

```env
# Game Server HTTP
FS25_HTTP_BASE_URL=149.102.148.127
FS25_HTTP_PORT=8590
FS25_STATS_CODE=UJbUIL4Z1aMHgWZw

# FTP
FTP_HOST=149.102.148.127
FTP_PORT=21
FTP_USER=fs25reader
FTP_PASSWORD=changeme
FTP_SECURE=true

# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=fs25companion
DB_USER=appuser
DB_PASSWORD=changeme

# App
APP_PORT=3000
NODE_ENV=production
```

### 6.2 Config File (config.json)

```json
{
  "ftp": {
    "savegamePath": "/gameserver/saves/savegame1",
    "files": {
      "farms":            "farms.xml",
      "fields":           "fields.xml",
      "environment":      "environment.xml",
      "players":          "players.xml",
      "invoices":         "invoices.xml",
      "sales":            "sales.xml",
      "precisionFarming": "precisionFarming.xml",
      "careerSavegame":   "careerSavegame.xml",
      "vehicles":         "vehicles.xml",
      "economy":          "economy.xml",
      "farmland":         "farmland.xml",
      "items":            "items.xml"
    },
    "fallbackPollIntervalSeconds": 180
  },
  "http": {
    "endpoints": {
      "stats":    "/feed/dedicated-server-stats.xml",
      "vehicles": "/feed/dedicated-server-vehicles.xml",
      "economy":  "/feed/dedicated-server-economy.xml",
      "savegame": "/feed/dedicated-server-savegame.xml"
    },
    "fallbackPollIntervalSeconds": 60
  },
  "dataRetention": {
    "rawRetentionDays": 7,
    "hourlyRetentionDays": 90
  },
  "ignoredFarmIds": [2],
  "mapImageUrl": null
}
```

### 6.3 Database app_settings Table

| Key | Default Value | Description |
|---|---|---|
| `httpPollIntervalSeconds` | `60` | HTTP stats.xml poll frequency |
| `ftpPollIntervalSeconds` | `180` | FTP savegame poll frequency (auto-read from careerSavegame.xml) |
| `ignoredFarmIds` | `[2]` | JSON array of farm IDs to exclude from all views |
| `mapImageUrl` | `null` | Manual override if auto-fetch fails |
| `serverTimezone` | `UTC` | For real-world timestamp display |
| `notificationsEnabled` | `true` | Global push notification kill switch |
| `rawRetentionDays` | `7` | Full-resolution data retention |
| `hourlyRetentionDays` | `90` | Hourly aggregate retention |
| `farmColourPalette` | `{...}` | JSON map of colour index → hex value |

---

## 7. Startup Sequence

The backend must start in this exact order:

```
1. Load .env
2. Load config.json
3. Connect to database — load app_settings overrides
4. Attempt FTP connection — list savegame directory, confirm all expected files present
5. Fetch careerSavegame.xml via FTP → read autoSaveInterval → set FTP poll interval
6. Fetch dedicated-server-savegame.xml via HTTP → confirm server reachable, read game version
7. Fetch dedicated-server-stats.xml → confirm server live, extract initial state
8. Validate all expected FTP files are present and readable
9. Start HTTP poller on resolved interval
10. Start FTP poller on resolved interval
11. Start Express API + WebSocket server
12. Log startup summary — each source shown as GREEN / AMBER / RED
```

Any failure in steps 4–8 must log clearly but **must not crash the app**. Start in degraded state with health warnings rather than refusing to run.

---

## 8. Known Risks & Mitigations

### Risk 1: File Mid-Write (FTP)
The game server writes save files during autosave. Downloading mid-write produces corrupt XML.

**Mitigation:**
- Wrap every XML parse in try/catch with validation
- If parsing fails, log failure, discard result, keep last good snapshot in DB
- Compare file size on two rapid FTP checks — if size is still changing, wait and retry
- Record `last_valid_parse` timestamp per source in poller health log

### Risk 2: Dynamic Poll Interval Circular Dependency
FTP poll interval is read from `careerSavegame.xml` which is itself an FTP file. On first startup or FTP failure, no interval value is available.

**Mitigation:**
- Always attempt `careerSavegame.xml` first before starting any other pollers
- If it fails, use `fallbackPollIntervalSeconds` from config.json and log a warning
- Re-read interval on every successful FTP cycle so changes are picked up without restart
- HTTP stats interval cannot be auto-detected — it is always a manual app setting

### Risk 3: HTTP Response Corruption
Stats.xml may be empty or malformed if fetched exactly during server regeneration.

**Mitigation:**
- Validate HTTP response is non-empty and parseable before processing
- Compare `dayTime` between polls — if it goes backwards or jumps unrealistically, flag as suspect and discard

### Risk 4: AI Farm ID Hardcoding
Farm 2 is the AI farm in the current save but may not always be. Other installations may differ.

**Mitigation:**
- `ignoredFarmIds` is a configurable app setting (not hardcoded)
- Admin can update it via UI
- Log a warning if a previously ignored farm suddenly gains human player members in farms.xml

### Risk 5: finances day Structure Unknown
It is unknown whether `farms.xml` accumulates `<stats day="N">` entries per in-game day or overwrites them.

**Mitigation:**
- Test in Phase 3 by advancing the in-game date and re-fetching farms.xml
- Regardless of outcome, store our own per-snapshot financial records in the database
- Never rely solely on the game maintaining its own financial history

### Risk 6: Game Version Updates Breaking XML Schema
A future FS25 update could rename fields, restructure files, or add/remove elements.

**Mitigation:**
- Parse defensively — always use optional chaining and typed defaults, never assume field exists
- Store game version from stats.xml in every snapshot row
- If version changes between polls, trigger a loud warning in poller health log
- Write parser unit tests against real XML snapshot fixtures — they will fail immediately if schema changes

### Risk 7: FTP Security
Plain FTP sends credentials in cleartext.

**Mitigation:**
- Explicitly configure and prefer FTPS (FTP over TLS) — `FTP_SECURE=true` in .env
- If only plain FTP is available, use read-only credentials scoped to the savegame folder only
- Document risk in README
- Never use server admin credentials for FTP access

### Risk 8: Database Growth
Polling every 60 seconds = 1,440 snapshots/day. Indefinite retention will cause unbounded growth.

**Mitigation:**
- Data retention policy built into schema from day one
- Keep full-resolution data for `rawRetentionDays` (default 7)
- Keep hourly aggregates for `hourlyRetentionDays` (default 90)
- Keep daily aggregates indefinitely
- Nightly archival job rolls up and prunes old rows
- Retention values are configurable in app_settings

### Risk 9: Map Image URL Unknown
`mapOverviewFilename` in stats.xml is a relative path, not a full URL.

**Mitigation:**
- Test construction: `http://{server}:{port}/data/maps/mapUS/textures/ui/overview.png`
- If not resolvable, fall back to manually configured `mapImageUrl` in app_settings
- Use a generic placeholder if both fail

### Risk 10: SSE Connection Loss
Backend restart drops all frontend SSE connections. Unlike WebSocket, the browser's native EventSource API handles reconnection automatically with built-in exponential backoff.

**Mitigation:**
- Use the native browser `EventSource` API — reconnection is automatic and built in
- Surface connection status visually in the UI so players know if they are receiving live data
- On reconnection, the frontend should re-fetch current state via REST API to catch any updates missed during the disconnection window
- Design this into the SSE client from Phase 7 onwards

### Risk 11: FTP Savegame Path Variability
Savegame folder path may change across server reinstalls or if multiple saves exist.

**Mitigation:**
- `ftp.savegamePath` is configurable in config.json and overridable in app_settings
- Phase 2 diagnostic tool connects to FTP and lists directory structure to help admin identify correct path

### Risk 12: Concurrent Poll Overlap
If an FTP or HTTP poll takes longer than the interval, a second cycle could start before the first finishes.

**Mitigation:**
- Per-source lock flag — if a poll is already in progress, skip that cycle and log it
- Never run two polls of the same source concurrently

---

## 9. Testing Strategy

### 9.1 Unit Tests (written alongside parsers in Phase 1–2)

| Test | Validates |
|---|---|
| XML parser — valid input | Feed known valid XML → assert typed output matches expected shape |
| XML parser — corrupt input | Feed partial/empty XML → assert graceful failure, no crash |
| dayTime conversion | Known ms values → correct HH:MM output |
| Fill type zip parser | `"DIESEL DEF AIR"` + `"610 70 2111"` → three paired objects |
| Farm filter | farms.xml with Farm 2 in ignored list → Farm 2 excluded from output |
| autoSaveInterval reader | Known careerSavegame.xml → correct interval extracted |
| Version change detection | XML with different version string → warning triggered |
| Farmland price tracker | Two snapshots with changed prices → delta recorded correctly |
| Vehicle propertyState | MISSION vehicle disappears between polls → handled gracefully |

### 9.2 Integration Tests (Phase 3–4)

| Test | Validates |
|---|---|
| Full HTTP poll cycle | Fetch → parse → write → query back → assert data integrity |
| Full FTP poll cycle | Connect → detect change → download → parse → write → assert |
| No-change poll | Two polls with identical data → no duplicate rows written |
| Farm 2 exclusion | No Farm 2 rows exist in farms table after a full cycle |
| Stale data fallback | Simulate FTP failure → last good data remains in DB, health log updated |
| Poll overlap guard | Two concurrent polls triggered → second skipped and logged |
| Interval change | Change autoSaveInterval in test fixture → poller reschedules correctly |
| Database retention | Insert data older than rawRetentionDays → archival job removes it |

### 9.3 Data Quality Validators (run after every poll, failures written to data_quality_alerts table)

| Validator | Flags When |
|---|---|
| Balance sanity check | Farm balance changes by more than $500k in a single poll |
| dayTime regression | dayTime value is lower than previous poll (unexplained server restart) |
| Field count drop | Number of fields in fields.xml drops by more than 5 in one poll |
| Vehicle farm mismatch | Vehicle farmId doesn't match any known farm in farms.xml |
| Missing required fields | Expected field is null or missing in parsed object |
| FTP file age check | File modified timestamp hasn't changed after 3× expected interval |
| Game version change | Version string in stats.xml differs from last recorded version |

---

## 10. Database Schema Overview

### Core Tables

**`server_snapshots`** — top-level server state per HTTP poll
`id, timestamp, server_name, map_name, day_time_ms, day_time_formatted, in_game_day, season, player_count, game_version`

**`farms`** — current farm state (upserted each FTP poll)
`farm_id, name, colour_index, colour_hex, money, loan, last_updated`

**`farm_finance_snapshots`** — snapshot of farms.xml finances per poll
`id, farm_id, snapshot_time, in_game_day, new_vehicles_cost, field_purchase, harvest_income, sold_milk, sold_wool, sold_products, purchase_fuel, purchase_seeds, purchase_fertilizer, loan_interest, loan, invoice_payment, mission_income, other, expenses, revenue` (+ all other finance categories)

**`farm_statistics_snapshots`** — operational stats per poll
`id, farm_id, snapshot_time, worked_hectares, cultivated_hectares, sown_hectares, threshed_hectares, fuel_usage, revenue, expenses, play_time, mission_count, bale_count` (+ all other stat fields)

**`players`** — global player registry
`unique_user_id, last_nickname, time_last_connected, last_seen_farm_id`

**`farm_players`** — farm membership and permissions
`farm_id, unique_user_id, farm_manager, last_nickname, time_last_connected, buy_vehicle, sell_vehicle, manage_contracts, trade_animals, create_fields, manage_rights, transfer_money` (+ all other permission flags)

**`farmlands`** — current state per farmland (upserted per HTTP poll)
`farmland_id, owner_farm_id, area_ha, current_price, x, z`

**`farmland_price_history`** — price snapshots over time
`id, farmland_id, snapshot_time, price`

**`fields`** — current field state per FTP poll (upserted)
`field_id, fruit_type, growth_state, ground_type, weed_state, spray_level, lime_level, plow_level, planned_fruit, stone_level, water_level, stubble_shred_level, last_updated`

**`vehicles`** — current vehicle state (upserted per vehicle poll)
`unique_id, name, category, type, farm_id, property_state, age, purchase_price, operating_time, damage, wear, fill_types_json, x, y, z, is_ai_active, last_updated`

**`environment_snapshots`** — weather and time state
`id, snapshot_time, current_day, current_monotonic_day, season, weather_forecast_json`

**`economy_prices`** — seasonal crop prices (refreshed daily)
`id, fill_type, period_name, price, last_updated`

**`invoices`** — inter-farm invoices
`invoice_id, from_farm_id, to_farm_id, amount, description, status, created_at`

**`sales_market`** — used vehicle listings
`id, vehicle_filename, price, damage, wear, operating_time, time_left, last_updated`

**`tasks`** — farm task board
`id, farm_id (nullable for server-wide), title, description, category, priority, status, due_date, created_by_nickname, created_at, completed_at`

**`task_claims`** — who has claimed a task
`id, task_id, player_nickname, claimed_at`

**`server_goals`** — shared server-wide milestone goals
`id, title, description, target_value, current_value, unit, status, created_at, completed_at`

**`recurring_task_templates`** — templates for auto-generated repeating tasks
`id, farm_id, title, description, category, priority, trigger_type, trigger_value, last_generated_at`

**`poller_health`** — per-source poll status
`id, source_name, last_poll_at, last_success_at, last_error, consecutive_failures, status`

**`data_quality_alerts`** — anomaly flags from validators
`id, alert_time, source, validator_name, description, resolved`

**`app_settings`** — runtime-configurable settings
`key, value, updated_at`

---

## 11. API Endpoints

All prefixed with `/api/`

| Method | Path | Description |
|---|---|---|
| GET | `/server/status` | Live server snapshot |
| GET | `/server/weather` | Current season, day, forecast |
| GET | `/farms` | All farms (excluding ignored farm IDs) |
| GET | `/farms/:id` | Single farm detail |
| GET | `/farms/:id/finances` | Daily finance history |
| GET | `/farms/:id/statistics` | Operational stats history |
| GET | `/farms/:id/fields` | Owned fields with crop state |
| GET | `/farms/:id/vehicles` | Owned vehicle fleet |
| GET | `/players` | All known players |
| GET | `/players/:nickname/tasks` | Personal task list |
| GET | `/fields` | All fields server-wide |
| GET | `/farmlands` | All farmlands with ownership and price |
| GET | `/economy/prices` | Seasonal crop price table |
| GET | `/market/vehicles` | Used vehicle listings |
| GET | `/tasks` | All tasks (filterable by farmId, status, category) |
| POST | `/tasks` | Create a task |
| PATCH | `/tasks/:id/claim` | Claim a task |
| PATCH | `/tasks/:id/status` | Update task status |
| GET | `/goals` | Server-wide goals |
| GET | `/poller/health` | Poller status per source |

---

## 12. Build Plan — Phases & Tasks

**Legend:** ⬜ Not started | 🔄 In progress | ✅ Complete | ❌ Blocked

---

### Phase 0 — Project Scaffolding
> Goal: Repo structure, tooling, environment. Nothing runs yet.

- ⬜ 0.1 — Initialise Node.js + Express project with TypeScript
- ⬜ 0.2 — Set up ESLint, Prettier, `.env` config, `config.json`
- ⬜ 0.3 — Set up MariaDB on VPS, create database and app user
- ⬜ 0.4 — Confirm FTP access — test FTPS vs plain FTP, determine protocol
- ⬜ 0.5 — Define folder structure: `/src/poller`, `/src/parser`, `/src/db`, `/src/api`, `/src/tools`, `/tests`
- ⬜ 0.6 — Set up Git repository with `.gitignore` (exclude `.env`, `config.json` if sensitive)
- ⬜ 0.7 — Set up Jest + ts-jest for testing

---

### Phase 1 — HTTP Poller & Data Validation Tools
> Goal: Fetch, parse and inspect every HTTP endpoint. No database writes yet — CLI output only.

- ⬜ 1.1 — Build HTTP fetcher for `dedicated-server-stats.xml`
- ⬜ 1.2 — Build typed XML parser for stats.xml → TypeScript interfaces
- ⬜ 1.3 — Build CLI inspection tool: pretty-print parsed stats.xml output
- ⬜ 1.4 — Build HTTP fetcher + parser for `dedicated-server-vehicles.xml`
- ⬜ 1.5 — Build HTTP fetcher + parser for `dedicated-server-economy.xml`
- ⬜ 1.6 — Build HTTP fetcher + parser for `dedicated-server-savegame.xml`
- ⬜ 1.7 — Build CLI tool to print all four HTTP sources in a readable summary
- ⬜ 1.8 — Validate multi-value fill type parsing (zip DIESEL/DEF/AIR pairs)
- ⬜ 1.9 — Validate dayTime ms → HH:MM conversion with timeScale awareness
- ⬜ 1.10 — Read and log `autoSaveInterval` from savegame — confirm dynamic scheduling logic
- ⬜ 1.11 — Write unit tests for all parsers using real XML fixture files

---

### Phase 2 — FTP Poller & Data Validation Tools
> Goal: Fetch, parse and inspect every FTP file. Still no database writes.

- ⬜ 2.1 — Build FTP client using `basic-ftp`, FTPS preferred, `.env` driven
- ⬜ 2.2 — Build diagnostic tool: connect to FTP, list savegame directory, confirm all expected files present
- ⬜ 2.3 — Build file change detection (compare remote file modified timestamp before downloading)
- ⬜ 2.4 — Fetch and parse `careerSavegame.xml` — extract autoSaveInterval, confirm poll scheduling
- ⬜ 2.5 — Fetch and parse `farms.xml` → typed objects, CLI print tool
- ⬜ 2.6 — Fetch and parse `fields.xml` → typed objects, CLI print tool
- ⬜ 2.7 — Fetch and parse `environment.xml` → typed objects, CLI print tool
- ⬜ 2.8 — Fetch and parse `players.xml` → typed objects, CLI print tool
- ⬜ 2.9 — Fetch and parse `invoices.xml` → typed objects, CLI print tool
- ⬜ 2.10 — Fetch and parse `sales.xml` → typed objects, CLI print tool
- ⬜ 2.11 — Fetch and parse `precisionFarming.xml` → typed objects, CLI print tool
- ⬜ 2.12 — Fetch and parse `vehicles.xml` (FTP) → typed objects, CLI print tool
- ⬜ 2.13 — Validate `uniqueUserId` cross-reference between `farms.xml` and `players.xml`
- ⬜ 2.14 — Validate farm colour index → hex colour mapping (define palette)
- ⬜ 2.15 — Build FTP retry logic with exponential backoff and failure handling
- ⬜ 2.16 — Confirm stale data fallback behaviour (FTP failure → last good data retained)
- ⬜ 2.17 — Write unit tests for all FTP parsers using real XML fixture files
- ⬜ 2.18 — **Test finances day structure**: advance in-game date, re-fetch farms.xml, confirm whether day entries accumulate or overwrite

---

### Phase 3 — Database Schema & Write Layer
> Goal: All tables created. Parsed data writes correctly. Test harness validates full poll cycle.

- ⬜ 3.1 — Create `server_snapshots` table
- ⬜ 3.2 — Create `farms` table
- ⬜ 3.3 — Create `farm_finance_snapshots` table
- ⬜ 3.4 — Create `farm_statistics_snapshots` table
- ⬜ 3.5 — Create `players` table
- ⬜ 3.6 — Create `farm_players` junction table
- ⬜ 3.7 — Create `farmlands` table + `farmland_price_history` table
- ⬜ 3.8 — Create `fields` table
- ⬜ 3.9 — Create `vehicles` table
- ⬜ 3.10 — Create `environment_snapshots` table
- ⬜ 3.11 — Create `economy_prices` table
- ⬜ 3.12 — Create `invoices` table
- ⬜ 3.13 — Create `sales_market` table
- ⬜ 3.14 — Create `tasks`, `task_claims`, `server_goals`, `recurring_task_templates` tables
- ⬜ 3.15 — Create `poller_health` table
- ⬜ 3.16 — Create `data_quality_alerts` table
- ⬜ 3.17 — Create `app_settings` table + seed with defaults
- ⬜ 3.18 — Build write/upsert layer for all HTTP-sourced data
- ⬜ 3.19 — Build write/upsert layer for all FTP-sourced data
- ⬜ 3.20 — Build test harness: full poll cycle → write → query back → print results
- ⬜ 3.21 — Validate diff detection: two polls with same data → no duplicate rows
- ⬜ 3.22 — Validate Farm 2 filter: no Farm 2 rows in farms table after full cycle
- ⬜ 3.23 — Validate data retention: insert old rows, run archival job, confirm pruning
- ⬜ 3.24 — Write integration tests for write layer

---

### Phase 4 — Poller Service & Scheduling
> Goal: Production-grade background service polling all sources on dynamic schedules.

- ⬜ 4.1 — Build unified poller service using `node-cron`
- ⬜ 4.2 — Implement dynamic HTTP poll interval (configurable, default 60s)
- ⬜ 4.3 — Implement dynamic FTP poll interval (reads autoSaveInterval from careerSavegame.xml, default 180s)
- ⬜ 4.4 — Implement per-source lock flag (prevent concurrent polls of same source)
- ⬜ 4.5 — Implement retry logic with exponential backoff for failed fetches
- ⬜ 4.6 — Implement stale data alerting (flag if source hasn't updated within 2× expected interval)
- ⬜ 4.7 — Build Data Quality Validator layer — run after each parse, write to data_quality_alerts
- ⬜ 4.8 — Build poller health writer (update poller_health table after each poll attempt)
- ⬜ 4.9 — Build nightly archival/retention job
- ⬜ 4.10 — Build startup sequence (steps 1–12 from Section 7)
- ⬜ 4.11 — CLI poller status tool: show last poll result per source
- ⬜ 4.12 — Run poller continuously for 30 minutes, inspect data quality and health log
- ⬜ 4.13 — Write integration tests for scheduling and lock behaviour

---

### Phase 5 — REST API
> Goal: All data accessible via typed API. Tested with Postman before frontend begins.

- ⬜ 5.1 — Set up Express router structure
- ⬜ 5.2 — Implement settings resolution layer (DB > config.json > .env > hardcoded)
- ⬜ 5.3 — `GET /api/server/status`
- ⬜ 5.4 — `GET /api/server/weather`
- ⬜ 5.5 — `GET /api/farms`
- ⬜ 5.6 — `GET /api/farms/:id`
- ⬜ 5.7 — `GET /api/farms/:id/finances`
- ⬜ 5.8 — `GET /api/farms/:id/statistics`
- ⬜ 5.9 — `GET /api/farms/:id/fields`
- ⬜ 5.10 — `GET /api/farms/:id/vehicles`
- ⬜ 5.11 — `GET /api/players`
- ⬜ 5.12 — `GET /api/players/:nickname/tasks`
- ⬜ 5.13 — `GET /api/fields`
- ⬜ 5.14 — `GET /api/farmlands`
- ⬜ 5.15 — `GET /api/economy/prices`
- ⬜ 5.16 — `GET /api/market/vehicles`
- ⬜ 5.17 — `GET /api/tasks` (filterable by farmId, status, category)
- ⬜ 5.18 — `POST /api/tasks`
- ⬜ 5.19 — `PATCH /api/tasks/:id/claim`
- ⬜ 5.20 — `PATCH /api/tasks/:id/status`
- ⬜ 5.21 — `GET /api/goals`
- ⬜ 5.22 — `GET /api/poller/health`
- ⬜ 5.23 — Set up SSE endpoint (`GET /api/events`) using Express response streaming
- ⬜ 5.24 — Implement SSE client registry (track connected clients, handle disconnects cleanly, send named events: `server-update`, `farm-update`, `task-update`, `poller-health`)
- ⬜ 5.25 — Trigger SSE broadcast after each successful poll cycle write
- ⬜ 5.26 — Test all REST endpoints (Postman or equivalent), test SSE stream using browser EventSource or curl

---

### Phase 6 — Task Board Backend
> Goal: Full task data layer and API operational.

- ⬜ 6.1 — Task creation with farm assignment, category, priority, due date
- ⬜ 6.2 — Task claim/unclaim logic (one claim per task at a time)
- ⬜ 6.3 — Task status transitions (Open → Claimed → In Progress → Done)
- ⬜ 6.4 — Personal task list aggregation per player nickname
- ⬜ 6.5 — Server-wide goals: creation, progress tracking, completion detection
- ⬜ 6.6 — Recurring task template engine (generate tasks from templates on schedule or trigger)
- ⬜ 6.7 — Auto-task trigger: vehicle fuel below threshold → generate task
- ⬜ 6.8 — Auto-task trigger: season change detected in environment.xml → generate task
- ⬜ 6.9 — Broadcast SSE `task-update` event when any task is created, claimed, or status-changed

---

### Phase 7 — Frontend Foundation
> Goal: React app scaffolded with routing, shadcn/ui installed, SSE client connected, design system in place. No feature pages yet.

- ⬜ 7.1 — Scaffold React + Vite + TypeScript app
- ⬜ 7.2 — Set up Tailwind CSS
- ⬜ 7.3 — Initialise shadcn/ui (`npx shadcn-ui@latest init`) — configure theme, base components
- ⬜ 7.4 — Add core shadcn/ui components: Button, Card, Badge, Table, Dialog, Sheet, Tabs, Select, Input, Form, Tooltip, Separator, Skeleton
- ⬜ 7.5 — Add Recharts alongside shadcn/ui for all chart components
- ⬜ 7.6 — Set up React Router (all page routes defined)
- ⬜ 7.7 — Build typed API client (typed fetch hooks per endpoint)
- ⬜ 7.8 — Set up SSE client using native browser `EventSource` API — connect to `GET /api/events`
- ⬜ 7.9 — Build connection status indicator (SSE has built-in reconnection but surface status visually)
- ⬜ 7.10 — Build navigation shell using shadcn/ui components
- ⬜ 7.11 — Build farm colour theming system (colour index → CSS variable / Tailwind class)
- ⬜ 7.12 — Build farm selector / active farm context provider

---

### Phase 8 — Server Overview & Farm Dashboard
- ⬜ 8.1 — Server overview page (players online, in-game time, weather, season, slot usage)
- ⬜ 8.2 — Weather forecast widget (multi-day visual forecast)
- ⬜ 8.3 — Farm list / landing page (all farms with balance, ha, vehicle count)
- ⬜ 8.4 — Farm detail page (balance, loan, land portfolio, vehicle fleet)
- ⬜ 8.5 — Farm finance history chart (daily income/expense categories stacked)
- ⬜ 8.6 — Farm operational stats panel (worked ha, fuel, play time)
- ⬜ 8.7 — Vehicle fleet panel (owned vs mission, fill levels, AI active indicator)
- ⬜ 8.8 — Map overlay (farmland ownership by farm colour, player dot positions)

---

### Phase 9 — Task Board UI
- ⬜ 9.1 — Server-wide task board (all farms, filterable)
- ⬜ 9.2 — Farm-specific task board view
- ⬜ 9.3 — Task creation form
- ⬜ 9.4 — Claim / unclaim interaction
- ⬜ 9.5 — Personal task list page (player enters their nickname)
- ⬜ 9.6 — Server-wide goals progress panel

---

### Phase 10 — Planning Tools
- ⬜ 10.1 — Crop rotation planner (per-field, multi-season timeline view)
- ⬜ 10.2 — Field state overview (crop type, growth stage, ground type, soil health per field)
- ⬜ 10.3 — Market prices panel (seasonal price curves per crop, current period highlighted, best sell timing)
- ⬜ 10.4 — Financial planner (goal setting, time-to-goal projection, income trend)
- ⬜ 10.5 — Profit calculator (grow vs buy comparison using economy prices + yield estimates)
- ⬜ 10.6 — Livestock feed tracker and calculator (manual head count, daily requirement, days of feed remaining)
- ⬜ 10.7 — Used vehicle market browser (from sales.xml)

---

### Phase 11 — Notifications & Alerts
- ⬜ 11.1 — In-app notification centre (alert feed)
- ⬜ 11.2 — Browser push notification setup (service worker)
- ⬜ 11.3 — Alert: task due date approaching or overdue
- ⬜ 11.4 — Alert: task claimed or completed by another player
- ⬜ 11.5 — Alert: server-wide goal milestone reached
- ⬜ 11.6 — Alert: vehicle fuel critically low (from fill level data)
- ⬜ 11.7 — Alert: in-game season changing (from environment.xml forecast)
- ⬜ 11.8 — Alert: new farmland acquired by any farm
- ⬜ 11.9 — Alert: livestock feed runway below threshold
- ⬜ 11.10 — Notification preferences per player (stored by nickname)

---

### Phase 12 — Leaderboard & Polish
- ⬜ 12.1 — Leaderboard (largest land ha, highest portfolio value, most vehicle hours, most tasks completed)
- ⬜ 12.2 — Mobile responsive audit and fixes
- ⬜ 12.3 — Performance review (query optimisation, database index review)
- ⬜ 12.4 — Error states and loading skeletons throughout UI
- ⬜ 12.5 — Deployment: PM2 process management, Nginx reverse proxy, HTTPS via Let's Encrypt

---

## 13. Current Status

**Phase:** 0 — Not started  
**Last updated:** 2026-04-22  
**Game version at time of analysis:** 1.18.0.0  
**Save created:** 2026-04-21  

---

## 14. XML Fixture Files

When building parsers, use the real XML samples captured during analysis. Store these in `/tests/fixtures/`:

- `stats_empty.xml` — snapshot with no players online (all slots isUsed="false")
- `stats_player_online.xml` — snapshot with one player online (marty, isAdmin=true)
- `stats_vehicles.xml` — snapshot with full vehicle list including multi-fill-type vehicle
- `farms.xml` — real farms.xml with Farm 1 and Farm 2 data
- `fields.xml` — real fields.xml with full field state data
- `environment.xml` — real environment.xml with weather forecast
- `vehicles_ftp.xml` — real vehicles.xml from FTP with farmId attributes

These fixtures prevent parser regressions when the live server is unavailable.

---

## 15. Notes for Claude Code

- Always read this entire document before starting work on any phase
- Check the current status in Section 13 to know where to begin
- Mark tasks as 🔄 when starting, ✅ when complete
- If you discover new information about the data (e.g. from the finances day test in 2.18), update Section 5 (Critical Data Notes) before proceeding
- The FTP and HTTP credentials in Section 6.1 are examples — real values will be in the `.env` file on the VPS
- Farm 2 must be filtered at the data ingestion layer — it should never appear in any API response or database table (except poller_health and data_quality_alerts which are internal)
- When in doubt about a data assumption, build a diagnostic CLI tool to validate it before writing production code
- All polling intervals are dynamic — never hardcode 60 or 180 seconds anywhere in the codebase
- Realtime updates use Server-Sent Events (SSE), not WebSocket — the browser's native `EventSource` handles the connection to `GET /api/events`. Task actions and all user interactions use standard REST calls
- UI components should use shadcn/ui wherever possible before writing custom components — refer to https://ui.shadcn.com for documentation
