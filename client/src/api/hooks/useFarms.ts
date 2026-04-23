import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiMutate } from '@/api/client';
import type { Farm } from '@/contexts/FarmContext';

export interface Player {
  unique_user_id: string;
  last_nickname: string | null;
  time_last_connected: string | null;
  farm_id: number | null;
  farm_manager: number;
}

export interface FarmDetail extends Farm {
  players: Player[];
}

export interface FinanceSnapshot {
  id: number;
  farm_id: number;
  snapshot_time: string;
  in_game_day: number;
  harvest_income: number | null;
  mission_income: number | null;
  sold_milk: number | null;
  sold_wool: number | null;
  sold_products: number | null;
  sold_bales: number | null;
  sold_wood: number | null;
  income_bga: number | null;
  sold_animals: number | null;
  new_vehicles_cost: number | null;
  field_purchase: number | null;
  field_selling: number | null;
  purchase_fuel: number | null;
  purchase_seeds: number | null;
  purchase_fertilizer: number | null;
  loan_interest: number | null;
  vehicle_running_cost: number | null;
  production_costs: number | null;
  new_animals_cost: number | null;
  construction_cost: number | null;
  wage_payment: number | null;
}

export interface Vehicle {
  unique_id: string;
  name: string;
  category: string;
  type: string;
  farm_id: number;
  property_state: string;
  age: number;
  purchase_price: number;
  operating_time: number;
  damage: number;
  wear: number;
  dirt: number;
  fills: { type: string; level: number }[];
  x: number;
  y: number;
  z: number;
  is_ai_active: number;
  last_updated: string;
}

export interface Farmland {
  farmland_id: number;
  name: string | null;
  owner_farm_id: number;
  area_ha: number | null;
  current_price: number | null;
  x: number | null;
  z: number | null;
  period_counter_json?: string;
  total_counter_json?: string;
}

export function useFarms() {
  return useQuery<Farm[]>({
    queryKey: ['farms'],
    queryFn: () => apiFetch<Farm[]>('/api/farms'),
    refetchInterval: 60_000,
  });
}

export function useFarm(id: number | null) {
  return useQuery<FarmDetail>({
    queryKey: ['farms', id],
    queryFn: () => apiFetch<FarmDetail>(`/api/farms/${id}`),
    enabled: id !== null,
  });
}

export function useFarmFinances(id: number | null) {
  return useQuery<FinanceSnapshot[]>({
    queryKey: ['farms', id, 'finances'],
    queryFn: () => apiFetch<FinanceSnapshot[]>(`/api/farms/${id}/finances`),
    enabled: id !== null,
  });
}

export function useFarmVehicles(id: number | null) {
  return useQuery<Vehicle[]>({
    queryKey: ['vehicles', id],
    queryFn: () => apiFetch<Vehicle[]>(`/api/farms/${id}/vehicles`),
    enabled: id !== null,
    refetchInterval: 60_000,
  });
}

export function useFarmFields(id: number | null) {
  return useQuery<Farmland[]>({
    queryKey: ['fields', id],
    queryFn: () => apiFetch<Farmland[]>(`/api/farms/${id}/fields`),
    enabled: id !== null,
  });
}

export function useFarmlands() {
  return useQuery<Farmland[]>({
    queryKey: ['farmlands'],
    queryFn: () => apiFetch<Farmland[]>('/api/farmlands'),
  });
}

export interface FieldState {
  field_id: number;
  fruit_type: string | null;
  planned_fruit: string | null;
  growth_state: number;
  last_growth_state: number;
  ground_type: string | null;
  weed_state: number;
  spray_type: string | null;
  spray_level: number;
  lime_level: number;
  roller_level: number;
  plow_level: number;
  stubble_shred_level: number;
  water_level: number;
  stone_level: number;
  last_updated: string;
}

export function useAllFields() {
  return useQuery<FieldState[]>({
    queryKey: ['fields', 'all'],
    queryFn: () => apiFetch<FieldState[]>('/api/fields'),
  });
}

export interface FarmStatistics {
  id: number;
  farm_id: number;
  snapshot_time: string;
  worked_hectares: number | null;
  cultivated_hectares: number | null;
  sown_hectares: number | null;
  threshed_hectares: number | null;
  sprayed_hectares: number | null;
  plowed_hectares: number | null;
  fuel_usage: number | null;
  revenue: number | null;
  expenses: number | null;
  play_time: number | null;
  mission_count: number | null;
  bale_count: number | null;
  breed_cows_count: number | null;
  breed_sheep_count: number | null;
  breed_pigs_count: number | null;
  breed_chicken_count: number | null;
  breed_horses_count: number | null;
  breed_goats_count: number | null;
}

export function useFarmStatistics(id: number | null) {
  return useQuery<FarmStatistics[]>({
    queryKey: ['farms', id, 'statistics'],
    queryFn: () => apiFetch<FarmStatistics[]>(`/api/farms/${id}/statistics`),
    enabled: id !== null,
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiMutate<Record<string, unknown>>('/api/tasks', 'POST', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}
