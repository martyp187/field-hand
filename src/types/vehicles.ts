import { FillLevel } from './common';

export interface VehicleFull {
  uniqueId: string;
  filename: string;
  name: string;
  category: string;
  type: string;
  farmId: number;
  propertyState: 'OWNED' | 'MISSION' | 'NONE' | string;
  age: number;
  purchasePrice: number;
  operatingTime: number; // hours
  damage: number; // 0–1
  wear: number; // 0–1
  dirt: number; // 0–1
  fills: FillLevel[];
  x: number;
  y: number;
  z: number;
  isAIActive: boolean;
  attachedVehicleIds: string[];
}

export interface VehiclesFeed {
  vehicles: VehicleFull[];
}
