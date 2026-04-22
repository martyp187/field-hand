import { FillLevel } from './common';

export interface PlayerSlot {
  isUsed: boolean;
  isAdmin: boolean;
  name: string; // empty string when slot is unused
  uploadSpeed: number;
  downloadSpeed: number;
  numSessionPlayers: number;
  ping: number;
}

export interface FarmlandEntry {
  id: number;
  name: string;
  ownerFarmId: number; // 0 = unowned
  isOwned: boolean; // derived: ownerFarmId !== 0
  areaHa: number;
  price: number;
  x: number;
  z: number;
}

export interface VehicleStatEntry {
  name: string;
  type: string;
  category: string;
  x: number;
  y: number;
  z: number;
  fills: FillLevel[];
}

export interface ModEntry {
  name: string;
  author: string;
  version: string;
  hash: string;
}

export interface ServerStats {
  serverName: string;
  mapName: string;
  mapOverviewFilename: string;
  gameVersion: string;
  dayTimeMs: number;
  dayTimeFormatted: string;
  slots: {
    capacity: number;
    numUsed: number;
    players: PlayerSlot[];
  };
  farmlands: FarmlandEntry[];
  vehicles: VehicleStatEntry[];
  mods: ModEntry[];
}
