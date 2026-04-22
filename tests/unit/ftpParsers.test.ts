import fs from 'fs';
import path from 'path';
import { parseFarms } from '../../src/parser/farmsParser';
import { parseFields } from '../../src/parser/fieldsParser';
import { parseEnvironment } from '../../src/parser/environmentParser';
import { parsePlayers } from '../../src/parser/playersParser';
import { parseInvoices } from '../../src/parser/invoicesParser';
import { parseSales } from '../../src/parser/salesParser';

const fixture = (name: string) =>
  fs.readFileSync(path.resolve(__dirname, '..', 'fixtures', name), 'utf-8');

describe('farmsParser', () => {
  it('parses farms and excludes ignored IDs', async () => {
    const feed = await parseFarms(fixture('farms.xml'), [2]);
    expect(feed.farms.length).toBeGreaterThan(0);
    expect(feed.farms.every((f) => f.farmId !== 2)).toBe(true);
  });

  it('parses farm money and loan as numbers', async () => {
    const { farms } = await parseFarms(fixture('farms.xml'), [2]);
    const farm = farms[0];
    expect(typeof farm.money).toBe('number');
    expect(typeof farm.loan).toBe('number');
  });

  it('parses farm players with permissions', async () => {
    const { farms } = await parseFarms(fixture('farms.xml'), [2]);
    const farm = farms[0];
    expect(farm.players.length).toBeGreaterThan(0);
    const manager = farm.players.find((p) => p.farmManager);
    expect(manager).toBeDefined();
    expect(manager!.lastNickname).toBeTruthy();
  });

  it('parses farm statistics', async () => {
    const { farms } = await parseFarms(fixture('farms.xml'), [2]);
    const stats = farms[0].statistics;
    expect(typeof stats.workedHectares).toBe('number');
    expect(typeof stats.fuelUsage).toBe('number');
  });

  it('parses finance days', async () => {
    const { farms } = await parseFarms(fixture('farms.xml'), [2]);
    expect(farms[0].finances.length).toBeGreaterThan(0);
    expect(typeof farms[0].finances[0].day).toBe('number');
  });

  it('assigns a colour hex to each farm', async () => {
    const { farms } = await parseFarms(fixture('farms.xml'), [2]);
    farms.forEach((f) => expect(f.colorHex).toMatch(/^#[0-9A-Fa-f]{6}$/));
  });
});

describe('fieldsParser', () => {
  it('parses all fields', async () => {
    const { fields } = await parseFields(fixture('fields.xml'));
    expect(fields.length).toBeGreaterThan(0);
  });

  it('parses field attributes as correct types', async () => {
    const { fields } = await parseFields(fixture('fields.xml'));
    const f = fields[0];
    expect(typeof f.id).toBe('number');
    expect(typeof f.fruitType).toBe('string');
    expect(typeof f.growthState).toBe('number');
    expect(typeof f.weedState).toBe('number');
  });

  it('recognises HARVEST_READY ground type', async () => {
    const { fields } = await parseFields(fixture('fields.xml'));
    const ready = fields.filter((f) => f.groundType.startsWith('HARVEST_READY'));
    expect(ready.length).toBeGreaterThan(0);
  });
});

describe('environmentParser', () => {
  it('parses day and season', async () => {
    const feed = await parseEnvironment(fixture('environment.xml'));
    expect(typeof feed.currentDay).toBe('number');
    expect(feed.currentDay).toBeGreaterThan(0);
    expect(feed.currentSeason).toBeTruthy();
  });

  it('parses weather forecast entries', async () => {
    const feed = await parseEnvironment(fixture('environment.xml'));
    expect(feed.forecast.length).toBeGreaterThan(0);
    const inst = feed.forecast[0];
    expect(inst.typeName).toBeTruthy();
    expect(typeof inst.startDay).toBe('number');
    expect(typeof inst.duration).toBe('number');
  });
});

describe('playersParser', () => {
  it('parses player registry', async () => {
    const { players } = await parsePlayers(fixture('players.xml'));
    expect(players.length).toBeGreaterThan(0);
    players.forEach((p) => {
      expect(p.uniqueUserId).toBeTruthy();
      expect(p.timeLastConnected).toBeTruthy();
    });
  });
});

describe('invoicesParser', () => {
  it('parses invoices', async () => {
    const { invoices } = await parseInvoices(fixture('invoices.xml'));
    expect(invoices.length).toBeGreaterThan(0);
    const inv = invoices[0];
    expect(typeof inv.senderFarmId).toBe('number');
    expect(typeof inv.recipientFarmId).toBe('number');
    expect(inv.lineItems.length).toBeGreaterThan(0);
  });
});

describe('salesParser', () => {
  it('parses used vehicle listings', async () => {
    const { items } = await parseSales(fixture('sales.xml'));
    expect(items.length).toBeGreaterThan(0);
    const item = items[0];
    expect(item.xmlFilename).toBeTruthy();
    expect(item.price).toBeGreaterThan(0);
    expect(item.damage).toBeGreaterThanOrEqual(0);
    expect(item.wear).toBeGreaterThanOrEqual(0);
  });
});
