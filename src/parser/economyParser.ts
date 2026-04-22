import { parseStringPromise } from 'xml2js';
import { EconomyFeed, CropPrices, PricePoint } from '../types/economy';
import { toArray, safeFloat } from './utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = Record<string, any>;

export async function parseEconomy(xml: string): Promise<EconomyFeed> {
  const raw: Raw = await parseStringPromise(xml, {
    explicitArray: false,
    trim: true,
    charkey: '_',
  });

  // Structure: <economy><fillTypes><fillType fillType="WHEAT"><history><period period="...">price</period>
  const root: Raw = raw?.economy ?? raw?.Economy ?? raw ?? {};
  const fillTypesWrapper: Raw = root?.fillTypes ?? root?.FillTypes ?? {};
  const cropItems = toArray<Raw>(fillTypesWrapper?.fillType ?? fillTypesWrapper?.FillType);

  const crops: CropPrices[] = cropItems
    .map((item: Raw) => {
      const attrs = item?.$ ?? item;
      const fillType = String(attrs?.fillType ?? attrs?.name ?? '');

      const history: Raw = item?.history ?? item?.History ?? {};
      const periodItems = toArray<Raw>(history?.period ?? history?.Period);

      const prices: PricePoint[] = periodItems.map((p: Raw) => {
        const pAttrs = p?.$ ?? {};
        return {
          period: String(pAttrs?.period ?? pAttrs?.name ?? ''),
          price: safeFloat(p?._ ?? p),
        };
      });

      return { fillType, prices };
    })
    .filter((c) => c.fillType && c.prices.length > 0); // skip UNKNOWN and empty entries

  return { crops };
}
