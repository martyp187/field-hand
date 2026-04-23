import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useMarketVehicles } from '@/api/hooks/useEconomy';
import { formatMoney, formatHours, formatRelativeTime } from '@/lib/formatters';
import { cn } from '@/lib/utils';

function vehicleDisplayName(filename: string): string {
  // e.g. "data/vehicles/fendt/vario500/vario500.xml" → "Vario500 (Fendt)"
  const parts = filename.replace('.xml', '').split('/');
  if (parts.length >= 2) {
    const manufacturer = parts[parts.length - 2] ?? '';
    const model = parts[parts.length - 1] ?? '';
    if (manufacturer.toLowerCase() !== model.toLowerCase()) {
      return `${model} (${manufacturer})`;
    }
    return model;
  }
  return parts[parts.length - 1] ?? filename;
}

function conditionColour(ratio: number): string {
  if (ratio < 0.2) return 'text-positive';
  if (ratio < 0.5) return 'text-warning';
  return 'text-destructive';
}

function conditionBarColour(ratio: number): string {
  if (ratio < 0.2) return 'bg-positive';
  if (ratio < 0.5) return 'bg-warning';
  return 'bg-destructive';
}

function ConditionBar({ value, label }: { value: number | null; label: string }) {
  if (value == null) return <span className="text-xs text-muted-foreground">—</span>;
  const pct = Math.min(value * 100, 100);
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn('font-mono', conditionColour(value))}>{pct.toFixed(0)}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full', conditionBarColour(value))}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function UsedVehicles() {
  const { data: vehicles = [], isLoading } = useMarketVehicles();
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [search, setSearch] = useState('');

  const filtered = vehicles.filter((v) => {
    const name = vehicleDisplayName(v.vehicle_filename).toLowerCase();
    if (search && !name.includes(search.toLowerCase())) return false;
    if (minPrice && (v.price ?? 0) < parseFloat(minPrice)) return false;
    if (maxPrice && (v.price ?? 0) > parseFloat(maxPrice)) return false;
    return true;
  });

  const lastUpdated = vehicles[0]?.last_updated ?? null;

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Used Vehicle Market</h1>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Used Vehicle Market</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Vehicles available on the in-game used market.
            {lastUpdated && (
              <span className="ml-2 text-xs">Updated {formatRelativeTime(lastUpdated)}</span>
            )}
          </p>
        </div>
        <Badge variant="secondary" className="text-xs">{filtered.length} vehicles</Badge>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Input
          className="h-7 text-xs w-48"
          placeholder="Search name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Price:</span>
          <Input
            className="h-7 text-xs w-28"
            type="number"
            placeholder="Min $"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
          />
          <span className="text-xs text-muted-foreground">–</span>
          <Input
            className="h-7 text-xs w-28"
            type="number"
            placeholder="Max $"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          />
        </div>
      </div>

      {vehicles.length === 0 ? (
        <p className="text-sm text-muted-foreground">No vehicles in the used market yet.</p>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">{filtered.length} of {vehicles.length} vehicles</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-xs">
                    <th className="text-left py-2 px-3">Vehicle</th>
                    <th className="text-right py-2 px-3">Price</th>
                    <th className="text-left py-2 px-3 w-40">Damage / Wear</th>
                    <th className="text-right py-2 px-3">Hours</th>
                    <th className="text-right py-2 px-3">Age (days)</th>
                    <th className="text-right py-2 px-3">Time left</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((v) => (
                    <tr key={v.id} className="border-b border-border/40 hover:bg-muted/20">
                      <td className="py-2.5 px-3">
                        <p className="text-sm font-medium">{vehicleDisplayName(v.vehicle_filename)}</p>
                        {v.is_generated === 1 && (
                          <Badge variant="secondary" className="text-xs h-4 mt-0.5">Generated</Badge>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-sm">
                        {v.price != null ? formatMoney(v.price) : '—'}
                      </td>
                      <td className="py-2.5 px-3 space-y-1 w-40">
                        <ConditionBar value={v.damage} label="Damage" />
                        <ConditionBar value={v.wear} label="Wear" />
                      </td>
                      <td className="py-2.5 px-3 text-right text-xs text-muted-foreground font-mono">
                        {v.operating_time != null ? formatHours(v.operating_time / 3600) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right text-xs text-muted-foreground">
                        {v.age != null ? `${v.age}d` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right text-xs text-muted-foreground">
                        {v.time_left != null ? (
                          <span className={v.time_left <= 3 ? 'text-destructive' : ''}>
                            {v.time_left}d
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                        No vehicles match the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
