import { parseStringPromise } from 'xml2js';
import { Field, FieldsFeed } from '../types/fields';
import { toArray, safeFloat, safeInt } from './utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = Record<string, any>;

export async function parseFields(xml: string): Promise<FieldsFeed> {
  const raw: Raw = await parseStringPromise(xml, {
    explicitArray: false,
    trim: true,
    charkey: '_',
  });

  const root: Raw = raw?.fields ?? raw?.Fields ?? raw ?? {};
  const fieldItems = toArray<Raw>(root?.field ?? root?.Field);

  const fields: Field[] = fieldItems.map((f: Raw) => {
    const a = f?.$ ?? f;
    return {
      id: safeInt(a?.id),
      fruitType: String(a?.fruitType ?? 'UNKNOWN'),
      plannedFruit: String(a?.plannedFruit ?? 'FALLOW'),
      growthState: safeInt(a?.growthState),
      lastGrowthState: safeInt(a?.lastGrowthState),
      groundType: String(a?.groundType ?? ''),
      weedState: safeInt(a?.weedState),
      sprayType: String(a?.sprayType ?? 'NONE'),
      sprayLevel: safeFloat(a?.sprayLevel),
      limeLevel: safeFloat(a?.limeLevel),
      rollerLevel: safeFloat(a?.rollerLevel),
      plowLevel: safeFloat(a?.plowLevel),
      stubbleShredLevel: safeFloat(a?.stubbleShredLevel),
      waterLevel: safeFloat(a?.waterLevel),
      stoneLevel: safeFloat(a?.stoneLevel),
    };
  });

  return { fields };
}
