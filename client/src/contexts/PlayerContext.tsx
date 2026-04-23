import { createContext, useContext, useState, type ReactNode } from 'react';

interface PlayerContextValue {
  nickname: string | null;
  setNickname: (n: string) => void;
  clearNickname: () => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [nickname, setNicknameState] = useState<string | null>(
    () => localStorage.getItem('fc_nickname'),
  );

  const setNickname = (n: string) => {
    localStorage.setItem('fc_nickname', n);
    setNicknameState(n);
  };

  const clearNickname = () => {
    localStorage.removeItem('fc_nickname');
    setNicknameState(null);
  };

  return (
    <PlayerContext.Provider value={{ nickname, setNickname, clearNickname }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used inside PlayerProvider');
  return ctx;
}
