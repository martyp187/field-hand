import { parseStringPromise } from 'xml2js';
import { Player, PlayersFeed } from '../types/players';
import { toArray } from './utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = Record<string, any>;

export async function parsePlayers(xml: string): Promise<PlayersFeed> {
  const raw: Raw = await parseStringPromise(xml, {
    explicitArray: false,
    trim: true,
    charkey: '_',
  });

  const root: Raw = raw?.players ?? raw?.Players ?? raw ?? {};
  const playerItems = toArray<Raw>(root?.player ?? root?.Player);

  const players: Player[] = playerItems.map((p: Raw) => {
    const a = p?.$ ?? p;
    return {
      uniqueUserId: String(a?.uniqueUserId ?? ''),
      timeLastConnected: String(a?.timeLastConnected ?? ''),
    };
  });

  return { players };
}
