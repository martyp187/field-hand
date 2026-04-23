import { useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useFarmlands } from '@/api/hooks/useFarms';
import { useFarms } from '@/api/hooks/useFarms';
import { formatHa, formatMoney } from '@/lib/formatters';

// Riverbend Springs world: 2048×2048 units centred at 0,0
const WORLD_SIZE = 2048;

function worldToRatio(worldX: number, worldZ: number) {
  return {
    rx: (worldX + WORLD_SIZE / 2) / WORLD_SIZE,
    ry: (worldZ + WORLD_SIZE / 2) / WORLD_SIZE,
  };
}

interface TooltipState {
  x: number;
  y: number;
  name: string | null;
  owner: string | null;
  area: number | null;
  price: number | null;
  colour: string | null;
}

export function MapPage() {
  const { data: farmlands = [], isLoading: farmlandsLoading } = useFarmlands();
  const { data: farms = [], isLoading: farmsLoading } = useFarms();
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const farmColours = useMemo(() => {
    const map = new Map<number, string>();
    for (const f of farms) {
      map.set(f.farm_id, f.colour_hex ?? '#6b7280');
    }
    return map;
  }, [farms]);

  const farmNames = useMemo(() => {
    const map = new Map<number, string>();
    for (const f of farms) {
      map.set(f.farm_id, f.name);
    }
    return map;
  }, [farms]);

  const positioned = useMemo(
    () => farmlands.filter((fl) => fl.x != null && fl.z != null),
    [farmlands],
  );

  const isLoading = farmlandsLoading || farmsLoading;

  function handleMouseMove(
    e: React.MouseEvent<SVGCircleElement>,
    fl: (typeof farmlands)[number],
  ) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({
      x: e.clientX - rect.left + 12,
      y: e.clientY - rect.top - 8,
      name: fl.name,
      owner: farmNames.get(fl.owner_farm_id) ?? null,
      area: fl.area_ha,
      price: fl.current_price,
      colour: farmColours.get(fl.owner_farm_id) ?? null,
    });
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Farmland Map</h1>

      <div className="flex flex-wrap gap-3 text-xs">
        {farms.map((f) => (
          <div key={f.farm_id} className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded-full inline-block border border-white/20"
              style={{ backgroundColor: f.colour_hex ?? '#6b7280' }}
            />
            <span className="text-muted-foreground">{f.name}</span>
          </div>
        ))}
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground flex items-center justify-between">
            <span>Parcel positions</span>
            {!isLoading && (
              <Badge variant="outline">
                {positioned.length} / {farmlands.length} mapped
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <Skeleton className="h-[600px] w-full rounded-none" />
          ) : (
            <div ref={containerRef} className="relative select-none" style={{ height: 600 }}>
              <svg
                width="100%"
                height="100%"
                viewBox="0 0 1 1"
                preserveAspectRatio="xMidYMid meet"
                className="absolute inset-0"
                style={{ background: 'hsl(var(--background))' }}
              >
                {/* Grid lines */}
                {[0.25, 0.5, 0.75].map((v) => (
                  <g key={v}>
                    <line
                      x1={v} y1={0} x2={v} y2={1}
                      stroke="rgba(255,255,255,0.05)" strokeWidth={0.002}
                    />
                    <line
                      x1={0} y1={v} x2={1} y2={v}
                      stroke="rgba(255,255,255,0.05)" strokeWidth={0.002}
                    />
                  </g>
                ))}

                {/* Farmland circles */}
                {positioned.map((fl) => {
                  const { rx, ry } = worldToRatio(fl.x!, fl.z!);
                  const colour = farmColours.get(fl.owner_farm_id) ?? '#6b7280';
                  // Radius proportional to area, clamped
                  const r = Math.min(Math.max((fl.area_ha ?? 1) / 2048, 0.004), 0.025);
                  return (
                    <circle
                      key={fl.farmland_id}
                      cx={rx}
                      cy={ry}
                      r={r}
                      fill={colour}
                      fillOpacity={0.55}
                      stroke={colour}
                      strokeWidth={0.002}
                      strokeOpacity={0.9}
                      className="cursor-pointer transition-opacity hover:fill-opacity-80"
                      onMouseMove={(e) => handleMouseMove(e, fl)}
                      onMouseLeave={() => setTooltip(null)}
                    />
                  );
                })}
              </svg>

              {/* Tooltip */}
              {tooltip && (
                <div
                  className="absolute pointer-events-none z-10 rounded-md border border-border bg-card shadow-lg px-3 py-2 text-xs space-y-0.5"
                  style={{ left: tooltip.x, top: tooltip.y, maxWidth: 200 }}
                >
                  <p className="font-semibold text-foreground">
                    {tooltip.name ?? 'Unnamed parcel'}
                  </p>
                  {tooltip.owner && (
                    <p className="flex items-center gap-1 text-muted-foreground">
                      <span
                        className="w-2 h-2 rounded-full inline-block"
                        style={{ backgroundColor: tooltip.colour ?? '#6b7280' }}
                      />
                      {tooltip.owner}
                    </p>
                  )}
                  {tooltip.area != null && (
                    <p className="text-muted-foreground">{formatHa(tooltip.area)}</p>
                  )}
                  {tooltip.price != null && (
                    <p className="text-muted-foreground">{formatMoney(tooltip.price)}</p>
                  )}
                </div>
              )}

              {positioned.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-muted-foreground text-sm">
                    No farmland position data available yet.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {farmlands.length - positioned.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {farmlands.length - positioned.length} parcels have no position data and are not shown.
        </p>
      )}
    </div>
  );
}
