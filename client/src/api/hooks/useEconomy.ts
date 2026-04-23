import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/api/client';

export interface EconomyPrice {
  id: number;
  fill_type: string;
  period_name: string;
  price: number;
  last_updated: string;
}

export interface MarketVehicle {
  id: number;
  vehicle_filename: string;
  time_left: number | null;
  age: number | null;
  price: number | null;
  damage: number | null;
  wear: number | null;
  operating_time: number | null;
  is_generated: number;
  last_updated: string;
}

export function useEconomyPrices() {
  return useQuery<Record<string, EconomyPrice[]>>({
    queryKey: ['economy', 'prices'],
    queryFn: () => apiFetch<Record<string, EconomyPrice[]>>('/api/economy/prices'),
  });
}

export function useMarketVehicles() {
  return useQuery<MarketVehicle[]>({
    queryKey: ['market', 'vehicles'],
    queryFn: () => apiFetch<MarketVehicle[]>('/api/market/vehicles'),
  });
}

export function usePollerHealth() {
  return useQuery<{ pollerHealth: unknown[]; unresolvedAlerts: unknown[] }>({
    queryKey: ['poller', 'health'],
    queryFn: () =>
      apiFetch<{ pollerHealth: unknown[]; unresolvedAlerts: unknown[] }>('/api/poller/health'),
    refetchInterval: 30_000,
  });
}
