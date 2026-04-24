import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useEconomyPrices } from '@/api/hooks/useEconomy';
import { useFormatMoney } from '@/api/hooks/useServer';

const PERIOD_ORDER = [
  'EARLY_SPRING', 'MID_SPRING', 'LATE_SPRING',
  'EARLY_SUMMER', 'MID_SUMMER', 'LATE_SUMMER',
  'EARLY_AUTUMN', 'MID_AUTUMN', 'LATE_AUTUMN',
  'EARLY_WINTER', 'MID_WINTER', 'LATE_WINTER',
];

// Common sellable crops with typical FS25 yield ranges (t/ha)
const CROP_DEFAULTS: Record<string, { yield: number; seedCost: number; fertCost: number }> = {
  WHEAT:      { yield: 5.0,  seedCost: 280,  fertCost: 350 },
  BARLEY:     { yield: 5.0,  seedCost: 280,  fertCost: 350 },
  OAT:        { yield: 4.5,  seedCost: 250,  fertCost: 300 },
  RYE:        { yield: 4.0,  seedCost: 250,  fertCost: 300 },
  CANOLA:     { yield: 2.5,  seedCost: 380,  fertCost: 400 },
  RAPE:       { yield: 2.5,  seedCost: 380,  fertCost: 400 },
  CORN:       { yield: 10.0, seedCost: 500,  fertCost: 450 },
  SOYBEAN:    { yield: 3.5,  seedCost: 420,  fertCost: 320 },
  SUNFLOWER:  { yield: 3.0,  seedCost: 350,  fertCost: 380 },
  POTATO:     { yield: 35.0, seedCost: 1200, fertCost: 500 },
  SUGARBEET:  { yield: 65.0, seedCost: 1500, fertCost: 600 },
  BEETROOT:   { yield: 40.0, seedCost: 900,  fertCost: 450 },
  RICE:       { yield: 5.0,  seedCost: 350,  fertCost: 350 },
  COTTON:     { yield: 2.0,  seedCost: 600,  fertCost: 400 },
};

function ResultRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`flex justify-between items-center py-2 border-b border-border/40 ${highlight ? 'font-semibold' : ''}`}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-mono ${highlight ? 'text-foreground' : 'text-muted-foreground'}`}>{value}</span>
    </div>
  );
}

export function ProfitCalc() {
  const { data: prices, isLoading } = useEconomyPrices();
  const fmt = useFormatMoney();

  const cropOptions = prices
    ? Object.keys(prices)
        .filter((ft) => prices[ft].some((p) => p.price > 0) && CROP_DEFAULTS[ft])
        .sort()
    : [];

  const [crop, setCrop] = useState('WHEAT');
  const [area, setArea] = useState('10');
  const [yieldPerHa, setYieldPerHa] = useState('5.0');
  const [sellPeriod, setSellPeriod] = useState('_best');
  const [seedCost, setSeedCost] = useState('280');
  const [fertCost, setFertCost] = useState('350');

  function handleCropChange(newCrop: string) {
    setCrop(newCrop);
    const defaults = CROP_DEFAULTS[newCrop];
    if (defaults) {
      setYieldPerHa(String(defaults.yield));
      setSeedCost(String(defaults.seedCost));
      setFertCost(String(defaults.fertCost));
    }
  }

  const periodPrices = useMemo(() => {
    if (!prices?.[crop]) return [];
    return PERIOD_ORDER.map((p) => {
      const entry = prices[crop].find((e) => e.period_name === p);
      return { period: p, price: entry?.price ?? 0 };
    });
  }, [prices, crop]);

  const bestPeriodEntry = periodPrices.reduce(
    (best, cur) => (cur.price > best.price ? cur : best),
    { period: 'EARLY_SPRING', price: 0 },
  );

  const effectivePeriod = sellPeriod === '_best' ? bestPeriodEntry.period : sellPeriod;
  const sellPrice = periodPrices.find((p) => p.period === effectivePeriod)?.price ?? 0;

  const areaNum = parseFloat(area) || 0;
  const yieldNum = parseFloat(yieldPerHa) || 0;
  const seedCostNum = parseFloat(seedCost) || 0;
  const fertCostNum = parseFloat(fertCost) || 0;

  const totalYield = areaNum * yieldNum;
  const revenue = totalYield * sellPrice;
  const totalCosts = (seedCostNum + fertCostNum) * areaNum;
  const profit = revenue - totalCosts;
  const profitPerHa = areaNum > 0 ? profit / areaNum : 0;

  const bestRevenue = totalYield * bestPeriodEntry.price;
  const bestProfit = bestRevenue - totalCosts;

  const isGood = profit > 0;

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Profit Calculator</h1>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Profit Calculator</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Estimate revenue and profit for a crop based on area, yield, and market prices.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input form */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Inputs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Crop type</label>
              <Select value={crop} onValueChange={handleCropChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {cropOptions.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                  {cropOptions.length === 0 && (
                    <SelectItem value="WHEAT">WHEAT</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Area (ha)</label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Yield (t/ha)</label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={yieldPerHa}
                  onChange={(e) => setYieldPerHa(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Sell period</label>
              <Select value={sellPeriod} onValueChange={setSellPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_best">Best available ({bestPeriodEntry.period.replace(/_/g, ' ')})</SelectItem>
                  {PERIOD_ORDER.map((p) => {
                    const entry = periodPrices.find((e) => e.period === p);
                    return (
                      <SelectItem key={p} value={p}>
                        {p.replace(/_/g, ' ')} — {entry ? fmt(entry.price) : '—'}/t
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Seed cost ($/ha)</label>
                <Input
                  type="number"
                  min="0"
                  step="10"
                  value={seedCost}
                  onChange={(e) => setSeedCost(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Fertilizer cost ($/ha)</label>
                <Input
                  type="number"
                  min="0"
                  step="10"
                  value={fertCost}
                  onChange={(e) => setFertCost(e.target.value)}
                />
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => {
                const defaults = CROP_DEFAULTS[crop];
                if (defaults) {
                  setYieldPerHa(String(defaults.yield));
                  setSeedCost(String(defaults.seedCost));
                  setFertCost(String(defaults.fertCost));
                }
              }}
            >
              Reset to {crop} defaults
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Results
              {effectivePeriod !== '_best' && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  Selling in {effectivePeriod.replace(/_/g, ' ')}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <ResultRow label="Total yield" value={`${totalYield.toFixed(1)} t`} />
            <ResultRow label="Sell price" value={`${fmt(sellPrice)}/t`} />
            <ResultRow label="Revenue" value={fmt(revenue)} />
            <ResultRow label="Seed costs" value={`−${fmt(seedCostNum * areaNum)}`} />
            <ResultRow label="Fertilizer costs" value={`−${fmt(fertCostNum * areaNum)}`} />
            <ResultRow label="Total costs" value={`−${fmt(totalCosts)}`} />
            <div className={`flex justify-between items-center py-3 mt-2 rounded-md px-3 ${isGood ? 'bg-positive/10' : 'bg-destructive/10'}`}>
              <span className="text-sm font-semibold">Net profit</span>
              <span className={`text-lg font-bold font-mono ${isGood ? 'text-positive' : 'text-destructive'}`}>
                {isGood ? '' : '−'}{fmt(Math.abs(profit))}
              </span>
            </div>
            <ResultRow label="Profit per ha" value={`${fmt(profitPerHa)}/ha`} />

            {sellPeriod !== '_best' && bestPeriodEntry.price > sellPrice && (
              <div className="mt-3 p-3 rounded-md bg-warning/10 text-warning text-xs">
                <strong>Tip:</strong> Selling in {bestPeriodEntry.period.replace(/_/g, ' ')} instead
                earns {fmt(bestProfit - profit)} more ({fmt(bestProfit)} total).
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
