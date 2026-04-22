import fs from 'fs';
import path from 'path';
import { parsePrecisionFarming } from '../../src/parser/precisionFarmingParser';

const fixture = (name: string) =>
  fs.readFileSync(path.resolve(__dirname, '..', 'fixtures', name), 'utf-8');

describe('parsePrecisionFarming', () => {
  it('2.11 — parses farmlandStats from fixture', async () => {
    const feed = await parsePrecisionFarming(fixture('precisionFarming.xml'));
    expect(feed.farmlandStats.length).toBeGreaterThan(0);
  });

  it('2.11 — each stat has a numeric farmlandId', async () => {
    const feed = await parsePrecisionFarming(fixture('precisionFarming.xml'));
    for (const stat of feed.farmlandStats) {
      expect(typeof stat.farmlandId).toBe('number');
      expect(stat.farmlandId).toBeGreaterThan(0);
    }
  });

  it('2.11 — each stat has periodCounter and totalCounter with numeric fields', async () => {
    const feed = await parsePrecisionFarming(fixture('precisionFarming.xml'));
    const stat = feed.farmlandStats[0];
    expect(typeof stat.periodCounter.usedFuel).toBe('number');
    expect(typeof stat.periodCounter.yield).toBe('number');
    expect(typeof stat.totalCounter.usedFuel).toBe('number');
    expect(typeof stat.totalCounter.yield).toBe('number');
  });
});
