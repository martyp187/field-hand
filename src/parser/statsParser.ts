import { parseStringPromise } from 'xml2js';
import { ServerStats, PlayerSlot, FarmlandEntry, VehicleStatEntry, ModEntry } from '../types/stats';
import { parseDayTime, parseFillTypes, toArray, safeFloat, safeInt, safeBool } from './utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = Record<string, any>;

function parseSlots(raw: Raw): ServerStats['slots'] {
  const slotsRaw = raw?.Slots ?? raw?.slots ?? {};
  // FS25 uses <Player> elements inside <Slots>
  const slotItems = toArray<Raw>(slotsRaw?.Player ?? slotsRaw?.player);

  const players: PlayerSlot[] = slotItems.map((s: Raw) => {
    const attrs = s?.$ ?? s;
    return {
      isUsed: safeBool(attrs?.isUsed),
      isAdmin: safeBool(attrs?.isAdmin),
      name: String(s?._ ?? s?._text ?? attrs?.name ?? '').trim(),
      uploadSpeed: safeInt(attrs?.uploadSpeed),
      downloadSpeed: safeInt(attrs?.downloadSpeed),
      numSessionPlayers: safeInt(attrs?.numSessionPlayers),
      ping: safeInt(attrs?.ping),
    };
  });

  return {
    capacity: safeInt(slotsRaw?.$?.capacity ?? slotsRaw?.capacity),
    numUsed: safeInt(slotsRaw?.$?.numUsed ?? slotsRaw?.numUsed),
    players,
  };
}

function parseFarmlands(raw: Raw): FarmlandEntry[] {
  const farmlandsRaw = raw?.Farmlands ?? raw?.farmlands ?? {};
  return toArray<Raw>(farmlandsRaw?.Farmland ?? farmlandsRaw?.farmland).map((f: Raw) => {
    const attrs = f?.$ ?? f;
    const ownerFarmId = safeInt(attrs?.owner);
    return {
      id: safeInt(attrs?.id),
      name: String(attrs?.name ?? ''),
      ownerFarmId,
      isOwned: ownerFarmId !== 0,
      areaHa: safeFloat(attrs?.area),
      price: safeFloat(attrs?.price),
      x: safeFloat(attrs?.x),
      z: safeFloat(attrs?.z),
    };
  });
}

function parseVehicles(raw: Raw): VehicleStatEntry[] {
  const vehiclesRaw = raw?.Vehicles ?? raw?.vehicles ?? {};
  return toArray<Raw>(vehiclesRaw?.Vehicle ?? vehiclesRaw?.vehicle).map((v: Raw) => {
    const attrs = v?.$ ?? v;
    const fillTypes = String(attrs?.fillTypes ?? attrs?.fillType ?? '');
    const fillLevels = String(attrs?.fillLevels ?? attrs?.fillLevel ?? '');
    return {
      name: String(attrs?.name ?? ''),
      type: String(attrs?.type ?? ''),
      category: String(attrs?.category ?? ''),
      x: safeFloat(attrs?.x),
      y: safeFloat(attrs?.y),
      z: safeFloat(attrs?.z),
      fills: parseFillTypes(fillTypes, fillLevels),
    };
  });
}

function parseMods(raw: Raw): ModEntry[] {
  const modsRaw = raw?.Mods ?? raw?.mods ?? {};
  return toArray<Raw>(modsRaw?.Mod ?? modsRaw?.mod).map((m: Raw) => {
    const attrs = m?.$ ?? m;
    return {
      name: String(m?._ ?? m?._text ?? attrs?.name ?? '').trim(),
      author: String(attrs?.author ?? ''),
      version: String(attrs?.version ?? ''),
      hash: String(attrs?.hash ?? ''),
    };
  });
}

export async function parseStats(xml: string): Promise<ServerStats> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw: Raw = await parseStringPromise(xml, {
    explicitArray: false,
    trim: true,
    charkey: '_',
  });

  // Root element may be 'Server' or wrapped
  const server: Raw = raw?.Server ?? raw?.server ?? raw ?? {};
  const attrs: Raw = server?.$ ?? server;

  const dayTimeMs = safeInt(attrs?.dayTime);

  return {
    serverName: String(attrs?.name ?? ''),
    mapName: String(attrs?.mapName ?? ''),
    mapOverviewFilename: String(attrs?.mapOverviewFilename ?? ''),
    gameVersion: String(attrs?.version ?? ''),
    dayTimeMs,
    dayTimeFormatted: parseDayTime(dayTimeMs),
    slots: parseSlots(server),
    farmlands: parseFarmlands(server),
    vehicles: parseVehicles(server),
    mods: parseMods(server),
  };
}
