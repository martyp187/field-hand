import { parseStringPromise } from 'xml2js';
import { Invoice, InvoiceLineItem, InvoicesFeed } from '../types/invoices';
import { toArray, safeFloat, safeInt } from './utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = Record<string, any>;

export async function parseInvoices(xml: string): Promise<InvoicesFeed> {
  const raw: Raw = await parseStringPromise(xml, {
    explicitArray: false,
    trim: true,
    charkey: '_',
  });

  const root: Raw = raw?.invoices ?? raw?.Invoices ?? raw ?? {};
  const invoiceItems = toArray<Raw>(root?.invoice ?? root?.Invoice);

  const invoices: Invoice[] = invoiceItems.map((inv: Raw) => {
    const a = inv?.$ ?? inv;
    const createdAt: Raw = inv?.createdAt ?? inv?.CreatedAt ?? {};
    const caAttrs = createdAt?.$ ?? createdAt;
    const lineItemsNode: Raw = inv?.lineItems ?? inv?.LineItems ?? {};
    const lineItems: InvoiceLineItem[] = toArray<Raw>(
      lineItemsNode?.item ?? lineItemsNode?.Item,
    ).map((item: Raw) => {
      const ia = item?.$ ?? item;
      return {
        workTypeId: safeInt(ia?.workTypeId),
        amount: safeFloat(ia?.amount),
        quantity: safeFloat(ia?.quantity),
        unitType: safeInt(ia?.unitType),
        fieldId: safeInt(ia?.fieldId),
        fieldArea: safeFloat(ia?.fieldArea),
        note: String(ia?.note ?? ''),
      };
    });

    return {
      id: safeInt(a?.id),
      senderFarmId: safeInt(a?.senderFarmId),
      recipientFarmId: safeInt(a?.recipientFarmId),
      state: safeInt(a?.state),
      createdAtDay: safeInt(caAttrs?.day),
      lineItems,
    };
  });

  return { invoices };
}
