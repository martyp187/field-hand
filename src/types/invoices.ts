export interface InvoiceLineItem {
  workTypeId: number;
  amount: number;
  quantity: number;
  unitType: number;
  fieldId: number;
  fieldArea: number;
  note: string;
}

export interface Invoice {
  id: number;
  senderFarmId: number;
  recipientFarmId: number;
  state: number;
  createdAtDay: number;
  lineItems: InvoiceLineItem[];
}

export interface InvoicesFeed {
  invoices: Invoice[];
}
