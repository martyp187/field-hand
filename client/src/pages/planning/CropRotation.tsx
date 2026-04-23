import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAllFields } from '@/api/hooks/useFarms';
import { formatRelativeTime } from '@/lib/formatters';

const CROP_COLOURS: Record<string, string> = {
  WHEAT: '#f59e0b',
  BARLEY: '#d97706',
  CANOLA: '#84cc16',
  RAPE: '#84cc16',
  CORN: '#eab308',
  SOYBEAN: '#65a30d',
  SUNFLOWER: '#f97316',
  POTATO: '#a16207',
  SUGARBEET: '#ec4899',
  BEETROOT: '#db2777',
  OAT: '#ca8a04',
  RYE: '#92400e',
  RICE: '#4ade80',
  COTTON: '#e5e7eb',
  GRASS: '#22c55e',
  POPLAR: '#166534',
  FALLOW: '#6b7280',
  UNKNOWN: '#374151',
};

function cropColour(crop: string | null): string {
  if (!crop) return '#374151';
  return CROP_COLOURS[crop.toUpperCase()] ?? '#6366f1';
}

function growthLabel(groundType: string | null, growthState: number): string {
  const gt = (groundType ?? '').toUpperCase();
  if (gt === 'HARVEST_READY') return 'Harvest ready';
  if (gt === 'PLOWED') return 'Plowed';
  if (gt === 'CULTIVATED') return 'Cultivated';
  if (gt === 'SEEDED') return 'Seeded';
  if (growthState === 0) return 'Bare';
  if (growthState === 1) return 'Germinating';
  if (growthState === 2) return 'Seedling';
  if (growthState <= 4) return 'Growing';
  if (growthState === 5) return 'Established';
  if (growthState === 6) return 'Mature';
  if (growthState >= 7) return 'Ready';
  return `Stage ${growthState}`;
}

function soilHealth(lime: number, spray: number): { label: string; colour: string } {
  const avg = (lime + spray) / 2;
  if (avg >= 2) return { label: 'Good', colour: 'text-positive' };
  if (avg >= 1) return { label: 'Fair', colour: 'text-warning' };
  return { label: 'Poor', colour: 'text-destructive' };
}

function CropBadge({ crop }: { crop: string | null }) {
  const label = crop ?? 'NONE';
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-mono px-1.5 py-0.5 rounded"
      style={{
        backgroundColor: cropColour(crop) + '22',
        color: cropColour(crop),
        border: `1px solid ${cropColour(crop)}44`,
      }}
    >
      {label}
    </span>
  );
}

export function CropRotation() {
  const { data: fields = [], isLoading } = useAllFields();
  const [search, setSearch] = useState('');

  const filtered = search
    ? fields.filter(
        (f) =>
          String(f.field_id).includes(search) ||
          (f.fruit_type ?? '').toLowerCase().includes(search.toLowerCase()) ||
          (f.planned_fruit ?? '').toLowerCase().includes(search.toLowerCase()) ||
          (f.ground_type ?? '').toLowerCase().includes(search.toLowerCase()),
      )
    : fields;

  const lastUpdated = fields[0]?.last_updated ?? null;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Field State Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Current crop, growth stage, and soil health for all fields.
            {lastUpdated && (
              <span className="ml-2 text-xs">Updated {formatRelativeTime(lastUpdated)}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            className="h-7 text-xs w-48"
            placeholder="Filter fields..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Badge variant="secondary" className="text-xs shrink-0">{filtered.length} fields</Badge>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              {fields.length} fields tracked
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-xs">
                    <th className="text-left py-2 px-3 w-16">Field</th>
                    <th className="text-left py-2 px-3">Current Crop</th>
                    <th className="text-left py-2 px-3">Planned</th>
                    <th className="text-left py-2 px-3">Stage</th>
                    <th className="text-left py-2 px-3">Soil</th>
                    <th className="text-left py-2 px-3">Weed</th>
                    <th className="text-left py-2 px-3">Lime</th>
                    <th className="text-left py-2 px-3">Spray</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((f) => {
                    const health = soilHealth(f.lime_level, f.spray_level);
                    return (
                      <tr key={f.field_id} className="border-b border-border/40 hover:bg-muted/20">
                        <td className="py-2 px-3 text-xs font-mono text-muted-foreground">
                          #{f.field_id}
                        </td>
                        <td className="py-2 px-3">
                          <CropBadge crop={f.fruit_type} />
                        </td>
                        <td className="py-2 px-3">
                          {f.planned_fruit && f.planned_fruit !== 'FALLOW' ? (
                            <CropBadge crop={f.planned_fruit} />
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-xs text-muted-foreground">
                          {growthLabel(f.ground_type, f.growth_state)}
                        </td>
                        <td className="py-2 px-3">
                          <span className={`text-xs font-medium ${health.colour}`}>
                            {health.label}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-xs text-muted-foreground">
                          {f.weed_state > 0 ? (
                            <span className="text-warning">Stage {f.weed_state}</span>
                          ) : (
                            'None'
                          )}
                        </td>
                        <td className="py-2 px-3 text-xs text-muted-foreground">
                          {f.lime_level > 0 ? `${f.lime_level.toFixed(0)}` : '—'}
                        </td>
                        <td className="py-2 px-3 text-xs text-muted-foreground">
                          {f.spray_level > 0 ? `${f.spray_level.toFixed(1)}` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                        {search ? 'No fields match the filter.' : 'No field data available yet.'}
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
