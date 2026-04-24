import { parseStringPromise } from 'xml2js';
import { toArray, safeFloat, safeInt, safeBool } from './utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = Record<string, any>;

export interface ElsLoanSummary {
  farmId: number;
  totalLoan: number;
}

export async function parseElsLoans(xml: string): Promise<ElsLoanSummary[]> {
  const raw: Raw = await parseStringPromise(xml, {
    explicitArray: false,
    trim: true,
    charkey: '_',
  });

  const root: Raw = raw?.loans ?? {};
  const farmIdNodes = toArray<Raw>(root?.farmId);

  return farmIdNodes.map((node: Raw) => {
    const a = node?.$ ?? node;
    const farmId = safeInt(a?.farmId);
    const loans = toArray<Raw>(node?.loan);
    const totalLoan = loans
      .filter((l: Raw) => {
        const la = l?.$ ?? l;
        return !safeBool(la?.paidOff);
      })
      .reduce((sum: number, l: Raw) => {
        const la = l?.$ ?? l;
        return sum + safeFloat(la?.restAmount);
      }, 0);
    return { farmId, totalLoan };
  });
}
