import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { useEconomyPrices } from '@/api/hooks/useEconomy';
import { useServerStatus } from '@/api/hooks/useServer';
import { formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';

const PERIOD_ORDER = [
  'EARLY_SPRING', 'MID_SPRING', 'LATE_SPRING',
  'EARLY_SUMMER', 'MID_SUMMER', 'LATE_SUMMER',
  'EARLY_AUTUMN', 'MID_AUTUMN', 'LATE_AUTUMN',
  'EARLY_WINTER', 'MID_WINTER', 'LATE_WINTER',
];

const PERIOD_LABELS: Record<string, string> = {
  EARLY_SPRING: 'E.Spr', MID_SPRING: 'M.Spr', LATE_SPRING: 'L.Spr',
  EARLY_SUMMER: 'E.Sum', MID_SUMMER: 'M.Sum', LATE_SUMMER: 'L.Sum',
  EARLY_AUTUMN: 'E.Aut', MID_AUTUMN: 'M.Aut', LATE_AUTUMN: 'L.Aut',
  EARLY_WINTER: 'E.Win', MID_WINTER: 'M.Win', LATE_WINTER: 'L.Win',
};

function CustomDot(props: Record<string, unknown>) {
  const { cx, cy, payload, bestPeriod } = props as {
    cx: number; cy: number;
    payload: { period: string };
    bestPeriod: string | null;
  };
  const isBest = payload.period === bestPeriod;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={isBest ? 5 : 3}
      fill={isBest ? '#22c55e' : '#4b5563'}
      stroke={isBest ? '#16a34a' : 'none'}
      strokeWidth={1}
    />
  );
}

export function MarketPrices() {
  const { data: prices, isLoading } = useEconomyPrices();
  const { data: serverStatus } = useServerStatus();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  const currentSeason = serverStatus?.snapshot?.season?.toUpperCase() ?? null;

  const fillTypes = prices
    ? Object.keys(prices)
        .filter((ft) => prices[ft].some((p) => p.price > 0))
        .sort()
    : [];

  const filtered = search
    ? fillTypes.filter((ft) => ft.toLowerCase().includes(search.toLowerCase()))
    : fillTypes;

  const activeFillType = selected && fillTypes.includes(selected)
    ? selected
    : filtered[0] ?? null;

  const chartData = activeFillType && prices?.[activeFillType]
    ? PERIOD_ORDER.map((period) => {
        const entry = prices[activeFillType].find((p) => p.period_name === period);
        return { period, label: PERIOD_LABELS[period] ?? period, price: entry?.price ?? 0 };
      })
    : [];

  const maxPrice = chartData.length ? Math.max(...chartData.map((d) => d.price)) : 0;
  const bestPeriod = chartData.find((d) => d.price === maxPrice)?.period ?? null;

  const currentSeasonPeriods = currentSeason
    ? PERIOD_ORDER.filter((p) => p.endsWith(currentSeason))
    : [];

  const sortedForTable = [...chartData].sort((a, b) => b.price - a.price);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Market Prices</h1>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!prices || fillTypes.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Market Prices</h1>
        <p className="text-sm text-muted-foreground mt-4">No price data available yet. Run the poller to populate.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Market Prices</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Seasonal price curves — sell in the highlighted period for best returns.
          {currentSeason && (
            <span className="text-warning ml-2">▲ marks the current season ({currentSeason})</span>
          )}
        </p>
      </div>

      <div className="flex gap-4 h-[calc(100vh-220px)] min-h-[500px]">
        {/* Fill type list */}
        <Card className="w-52 shrink-0 flex flex-col">
          <CardHeader className="pb-2 shrink-0">
            <Input
              className="h-7 text-xs"
              placeholder="Search fill types..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto">
            {filtered.map((ft) => (
              <button
                key={ft}
                className={cn(
                  'w-full text-left px-3 py-1.5 text-xs font-mono hover:bg-muted/50 transition-colors',
                  activeFillType === ft && 'bg-muted font-semibold',
                )}
                onClick={() => setSelected(ft)}
              >
                {ft}
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Chart + table */}
        <div className="flex-1 space-y-4 overflow-y-auto min-w-0">
          {activeFillType ? (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="text-base font-mono">{activeFillType}</CardTitle>
                    {bestPeriod && (
                      <Badge variant="outline" className="text-xs border-positive text-positive">
                        Best: {bestPeriod.replace(/_/g, ' ')} — {formatMoney(maxPrice)}/unit
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} width={65} />
                      <Tooltip
                        formatter={(value) => [formatMoney(Number(value)), 'Price']}
                        labelFormatter={(label) => {
                          const entry = chartData.find((d) => d.label === label);
                          return entry?.period.replace(/_/g, ' ') ?? label;
                        }}
                      />
                      {currentSeasonPeriods.map((p) => (
                        <ReferenceLine
                          key={p}
                          x={PERIOD_LABELS[p]}
                          stroke="#f59e0b"
                          strokeDasharray="4 4"
                          label={{ value: '▲', position: 'insideTop', fontSize: 9, fill: '#f59e0b' }}
                        />
                      ))}
                      {bestPeriod && (
                        <ReferenceLine
                          x={PERIOD_LABELS[bestPeriod]}
                          stroke="#22c55e"
                          strokeDasharray="3 3"
                          label={{ value: '★', position: 'insideTop', fontSize: 10, fill: '#22c55e' }}
                        />
                      )}
                      <Line
                        type="monotone"
                        dataKey="price"
                        stroke="#6b7280"
                        strokeWidth={2}
                        dot={(props) => <CustomDot {...props} bestPeriod={bestPeriod} />}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground text-xs">
                        <th className="text-left py-2 px-3">Period</th>
                        <th className="text-right py-2 px-3">Price / unit</th>
                        <th className="py-2 px-3 w-24" />
                      </tr>
                    </thead>
                    <tbody>
                      {sortedForTable.map((row) => (
                        <tr
                          key={row.period}
                          className={cn(
                            'border-b border-border/40',
                            row.period === bestPeriod && 'bg-positive/5',
                          )}
                        >
                          <td className="py-1.5 px-3 text-xs">{row.period.replace(/_/g, ' ')}</td>
                          <td className="py-1.5 px-3 text-xs text-right font-mono">
                            {formatMoney(row.price)}
                          </td>
                          <td className="py-1.5 px-3 text-xs">
                            <div className="flex gap-1">
                              {row.period === bestPeriod && (
                                <Badge variant="outline" className="text-xs border-positive text-positive h-5 px-1">
                                  Best ★
                                </Badge>
                              )}
                              {currentSeasonPeriods.includes(row.period) && (
                                <Badge variant="outline" className="text-xs border-warning text-warning h-5 px-1">
                                  Now
                                </Badge>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </>
          ) : (
            <p className="text-sm text-muted-foreground pt-8 text-center">
              Select a fill type to view its price curve.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
