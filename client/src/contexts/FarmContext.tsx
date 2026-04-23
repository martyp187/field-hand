import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/api/client';
import { usePlayer } from './PlayerContext';

export interface Farm {
  farm_id: number;
  name: string;
  colour_hex: string | null;
  colour_index: number | null;
  money: number;
  loan: number;
  player_count: number;
}

interface FarmContextValue {
  activeFarmId: number | null;
  activeFarm: Farm | null;
  setActiveFarmId: (id: number) => void;
  farms: Farm[];
}

const FarmContext = createContext<FarmContextValue | null>(null);

export function FarmProvider({ children }: { children: ReactNode }) {
  const { nickname } = usePlayer();

  const [activeFarmId, setActiveFarmIdState] = useState<number | null>(() => {
    const stored = localStorage.getItem('fc_farmId');
    return stored ? parseInt(stored, 10) : null;
  });

  const { data: farms = [] } = useQuery<Farm[]>({
    queryKey: ['farms'],
    queryFn: () => apiFetch<Farm[]>('/api/farms'),
  });

  // When nickname changes, auto-resolve farm from /api/players
  useEffect(() => {
    if (!nickname || activeFarmId) return;
    apiFetch<{ farm_id: number | null }[]>('/api/players')
      .then((players) => {
        const match = players.find(
          (p) =>
            (p as { last_nickname?: string }).last_nickname?.toLowerCase() ===
            nickname.toLowerCase(),
        );
        if (match?.farm_id) {
          setActiveFarmId(match.farm_id);
        }
      })
      .catch(() => {
        // Players endpoint unavailable — no farm auto-resolve
      });
  }, [nickname, activeFarmId]);

  const setActiveFarmId = (id: number) => {
    localStorage.setItem('fc_farmId', String(id));
    setActiveFarmIdState(id);
  };

  const activeFarm = farms.find((f) => f.farm_id === activeFarmId) ?? null;

  return (
    <FarmContext.Provider value={{ activeFarmId, activeFarm, setActiveFarmId, farms }}>
      {children}
    </FarmContext.Provider>
  );
}

export function useFarm() {
  const ctx = useContext(FarmContext);
  if (!ctx) throw new Error('useFarm must be used inside FarmProvider');
  return ctx;
}
