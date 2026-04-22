import { parseStringPromise } from 'xml2js';
import { SaleItem, SalesMarketFeed } from '../types/salesMarket';
import { toArray, safeFloat, safeInt, safeBool } from './utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = Record<string, any>;

export async function parseSales(xml: string): Promise<SalesMarketFeed> {
  const raw: Raw = await parseStringPromise(xml, {
    explicitArray: false,
    trim: true,
    charkey: '_',
  });

  const root: Raw = raw?.sales ?? raw?.Sales ?? raw ?? {};
  const saleItems = toArray<Raw>(root?.item ?? root?.Item);

  const items: SaleItem[] = saleItems.map((s: Raw) => {
    const a = s?.$ ?? s;
    return {
      xmlFilename: String(a?.xmlFilename ?? ''),
      timeLeft: safeInt(a?.timeLeft),
      age: safeInt(a?.age),
      price: safeFloat(a?.price),
      damage: safeFloat(a?.damage),
      wear: safeFloat(a?.wear),
      operatingTime: safeFloat(a?.operatingTime),
      isGenerated: safeBool(a?.isGenerated),
    };
  });

  return { items };
}
