import { parseStringPromise } from 'xml2js';
import { VehicleFull, VehiclesFeed } from '../types/vehicles';
import { parseFillTypes, toArray, safeFloat, safeInt, safeBool } from './utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = Record<string, any>;

function parseAttachedIds(v: Raw): string[] {
  const attrs = v?.$ ?? v;
  const raw = String(attrs?.attachedVehicleUniqueId ?? attrs?.attachedVehicle ?? '').trim();
  return raw ? raw.split(/\s+/) : [];
}

export async function parseVehicles(xml: string): Promise<VehiclesFeed> {
  const raw: Raw = await parseStringPromise(xml, {
    explicitArray: false,
    trim: true,
    charkey: '_',
  });

  const root: Raw = raw?.Vehicles ?? raw?.vehicles ?? raw ?? {};
  const items = toArray<Raw>(root?.Vehicle ?? root?.vehicle);

  const vehicles: VehicleFull[] = items.map((v: Raw) => {
    const attrs = v?.$ ?? v;
    const fillTypes = String(attrs?.fillTypes ?? attrs?.fillType ?? '');
    const fillLevels = String(attrs?.fillLevels ?? attrs?.fillLevel ?? '');

    return {
      uniqueId: String(attrs?.uniqueId ?? attrs?.id ?? ''),
      filename: String(attrs?.filename ?? ''),
      name: String(attrs?.name ?? ''),
      category: String(attrs?.category ?? ''),
      type: String(attrs?.type ?? ''),
      farmId: safeInt(attrs?.farmId),
      propertyState: String(attrs?.propertyState ?? 'NONE'),
      age: safeFloat(attrs?.age),
      purchasePrice: safeFloat(attrs?.price ?? attrs?.purchasePrice),
      operatingTime: safeFloat(attrs?.operatingTime),
      damage: safeFloat(attrs?.damage),
      wear: safeFloat(attrs?.wear),
      dirt: safeFloat(attrs?.dirt),
      fills: parseFillTypes(fillTypes, fillLevels),
      x: safeFloat(attrs?.x),
      y: safeFloat(attrs?.y),
      z: safeFloat(attrs?.z),
      isAIActive: safeBool(attrs?.isAIActive),
      attachedVehicleIds: parseAttachedIds(v),
    };
  });

  return { vehicles };
}
