import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiMutate } from '@/api/client';
import { formatMoney } from '@/lib/formatters';

export interface ServerSnapshot {
  server_name: string | null;
  map_name: string | null;
  day_time_ms: number;
  day_time_formatted: string;
  in_game_day: number;
  season: string | null;
  player_count: number;
  game_version: string | null;
  slots_capacity: number;
  slots_used: number;
  snapshot_time: string;
}

export interface PollerHealth {
  source_name: string;
  last_poll_at: string | null;
  last_success_at: string | null;
  last_error: string | null;
  consecutive_failures: number;
  status: string;
}

export interface ServerStatus {
  snapshot: ServerSnapshot | null;
  pollerHealth: PollerHealth[];
}

export interface WeatherInstance {
  typeName: string;
  season: string;
  startDay: number;
  startDayTime: number;
  duration: number;
}

export interface ServerWeather {
  current_day: number;
  current_monotonic_day: number | null;
  season: string | null;
  day_time: number | null;
  weatherForecast: WeatherInstance[];
}

export function useServerStatus() {
  return useQuery<ServerStatus>({
    queryKey: ['server', 'status'],
    queryFn: () => apiFetch<ServerStatus>('/api/server/status'),
    refetchInterval: 30_000,
  });
}

export function useServerWeather() {
  return useQuery<ServerWeather>({
    queryKey: ['server', 'weather'],
    queryFn: () => apiFetch<ServerWeather>('/api/server/weather'),
    refetchInterval: 60_000,
  });
}

export function useSettings() {
  return useQuery<Record<string, string>>({
    queryKey: ['settings'],
    queryFn: () => apiFetch<Record<string, string>>('/api/settings'),
  });
}

export function useCurrencySymbol(): string {
  const { data: settings } = useSettings();
  return settings?.currencySymbol ?? '£';
}

export function useFormatMoney(): (value: number) => string {
  const symbol = useCurrencySymbol();
  return (value: number) => formatMoney(value, symbol);
}

export function useUpdateSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      apiMutate<{ key: string; value: string }>(`/api/settings/${key}`, 'PATCH', { value }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  });
}
