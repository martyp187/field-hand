import type { Database } from 'better-sqlite3';
import defaultDb from '../connection';
import type { InvoicesFeed } from '../../types/invoices';

export function writeInvoices(feed: InvoicesFeed, db: Database = defaultDb): void {
  const now = new Date().toISOString();

  const upsert = db.prepare(`
    INSERT INTO invoices (
      invoice_id, sender_farm_id, recipient_farm_id, state, created_at_day,
      line_items_json, last_updated
    ) VALUES (@invoiceId, @senderFarmId, @recipientFarmId, @state, @createdAtDay, @lineItemsJson, @now)
    ON CONFLICT(invoice_id) DO UPDATE SET
      sender_farm_id    = excluded.sender_farm_id,
      recipient_farm_id = excluded.recipient_farm_id,
      state             = excluded.state,
      created_at_day    = excluded.created_at_day,
      line_items_json   = excluded.line_items_json,
      last_updated      = excluded.last_updated
  `);

  const writeAll = db.transaction(() => {
    for (const inv of feed.invoices) {
      upsert.run({
        invoiceId: inv.id,
        senderFarmId: inv.senderFarmId,
        recipientFarmId: inv.recipientFarmId,
        state: inv.state,
        createdAtDay: inv.createdAtDay,
        lineItemsJson: JSON.stringify(inv.lineItems),
        now,
      });
    }
  });

  writeAll();
}
