import { parseStringPromise } from 'xml2js';
import { SavegameSettings } from '../types/savegame';
import { safeFloat, safeInt } from './utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = Record<string, any>;

export async function parseSavegame(xml: string): Promise<SavegameSettings> {
  const raw: Raw = await parseStringPromise(xml, {
    explicitArray: false,
    trim: true,
    charkey: '_',
  });

  // Root may be <CareerSavegame>, <Savegame>, <Server>, etc.
  const root: Raw =
    raw?.CareerSavegame ??
    raw?.careerSavegame ??
    raw?.Server ??
    raw?.server ??
    raw?.Savegame ??
    raw?.savegame ??
    raw ??
    {};

  const attrs: Raw = root?.$ ?? root;

  // Settings may be a child element or attributes on root
  const settings: Raw = root?.Settings ?? root?.settings ?? attrs;
  const sAttrs: Raw = settings?.$ ?? settings;

  return {
    autoSaveInterval: safeInt(sAttrs?.autoSaveInterval ?? attrs?.autoSaveInterval, 180),
    timeScale: safeFloat(sAttrs?.timeScale ?? attrs?.timeScale, 5),
    economicDifficulty: String(sAttrs?.economicDifficulty ?? attrs?.economicDifficulty ?? 'NORMAL'),
    growthMode: safeInt(sAttrs?.growthMode ?? attrs?.growthMode, 1),
    mapId: String(sAttrs?.mapId ?? attrs?.mapId ?? ''),
    mapTitle: String(sAttrs?.mapTitle ?? attrs?.mapTitle ?? ''),
    savegameName: String(sAttrs?.savegameName ?? attrs?.savegameName ?? ''),
    creationDate: String(sAttrs?.creationDate ?? attrs?.creationDate ?? ''),
  };
}
