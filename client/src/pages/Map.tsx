import { useMemo, useRef, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useFarmlands, useFarms } from '@/api/hooks/useFarms';
import { formatHa } from '@/lib/formatters';
import { useFormatMoney } from '@/api/hooks/useServer';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/api/client';

interface MapImageStatus { source: 'upload' | 'url' | 'none'; }

// Riverbend Springs world: 2048×2048 units centred at 0,0
const WORLD_SIZE = 2048;

function worldToRatio(worldX: number, worldZ: number) {
  return {
    rx: (worldX + WORLD_SIZE / 2) / WORLD_SIZE,
    ry: (worldZ + WORLD_SIZE / 2) / WORLD_SIZE,
  };
}

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
}

interface ViewBox { x: number; y: number; w: number; h: number; }
const INITIAL_VB: ViewBox = { x: 0, y: 0, w: 1, h: 1 };

interface TooltipState {
  x: number; y: number;
  name: string | null; owner: string | null;
  area: number | null; price: number | null; colour: string | null;
}

interface DragAnchor {
  startClientX: number; startClientY: number;
  startVb: ViewBox;
}

export function MapPage() {
  const { data: farmlands = [], isLoading: farmlandsLoading } = useFarmlands();
  const { data: farms = [], isLoading: farmsLoading } = useFarms();
  const fmt = useFormatMoney();

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<DragAnchor | null>(null);

  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [vb, setVb] = useState<ViewBox>(INITIAL_VB);

  const { data: mapStatus } = useQuery<MapImageStatus>({
    queryKey: ['server', 'map-image-status'],
    queryFn: () => apiFetch<MapImageStatus>('/api/server/map-image/status'),
    refetchInterval: 30_000,
  });

  const imageOk = mapStatus?.source !== 'none' && !imageLoadError;

  // Attach wheel listener as non-passive so we can call preventDefault()
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 1.25 : 0.8;

      setVb((prev) => {
        const newW = clamp(prev.w * factor, 0.04, 1);
        const newH = clamp(prev.h * factor, 0.04, 1);

        // Convert cursor to SVG coordinates to zoom toward cursor
        const svgEl = svgRef.current;
        if (!svgEl) return prev;
        const ctm = svgEl.getScreenCTM();
        if (!ctm) return prev;
        const pt = svgEl.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const { x: cx, y: cy } = pt.matrixTransform(ctm.inverse());

        return {
          w: newW,
          h: newH,
          x: clamp(cx - (cx - prev.x) * (newW / prev.w), 0, 1 - newW),
          y: clamp(cy - (cy - prev.y) * (newH / prev.h), 0, 1 - newH),
        };
      });
    }

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  function handlePointerDown(e: React.PointerEvent<SVGSVGElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      startClientX: e.clientX,
      startClientY: e.clientY,
      startVb: vb,
    };
    setIsDragging(true);
    setTooltip(null);
  }

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!dragRef.current) return;
    const { startClientX, startClientY, startVb } = dragRef.current;
    const svgEl = svgRef.current!;
    const svgRect = svgEl.getBoundingClientRect();
    // With preserveAspectRatio meet + square viewBox, the rendered content
    // fills the smaller container dimension.
    const renderedPx = Math.min(svgRect.width, svgRect.height);
    const pxPerUnit = renderedPx / startVb.w;

    const dVbX = -(e.clientX - startClientX) / pxPerUnit;
    const dVbY = -(e.clientY - startClientY) / pxPerUnit;

    setVb({
      ...startVb,
      x: clamp(startVb.x + dVbX, 0, 1 - startVb.w),
      y: clamp(startVb.y + dVbY, 0, 1 - startVb.h),
    });
  }

  function handlePointerUp(e: React.PointerEvent<SVGSVGElement>) {
    e.currentTarget.releasePointerCapture(e.pointerId);
    dragRef.current = null;
    setIsDragging(false);
  }

  function zoomBy(factor: number) {
    setVb((prev) => {
      const newW = clamp(prev.w * factor, 0.04, 1);
      const newH = clamp(prev.h * factor, 0.04, 1);
      const cx = prev.x + prev.w / 2;
      const cy = prev.y + prev.h / 2;
      return {
        w: newW, h: newH,
        x: clamp(cx - newW / 2, 0, 1 - newW),
        y: clamp(cy - newH / 2, 0, 1 - newH),
      };
    });
  }

  const farmColours = useMemo(() => {
    const map = new Map<number, string>();
    for (const f of farms) map.set(f.farm_id, f.colour_hex ?? '#6b7280');
    return map;
  }, [farms]);

  const farmNames = useMemo(() => {
    const map = new Map<number, string>();
    for (const f of farms) map.set(f.farm_id, f.name);
    return map;
  }, [farms]);

  const positioned = useMemo(
    () => farmlands.filter((fl) => fl.x != null && fl.z != null),
    [farmlands],
  );

  const isLoading = farmlandsLoading || farmsLoading;

  function handleCircleMouseMove(
    e: React.MouseEvent<SVGCircleElement>,
    fl: (typeof farmlands)[number],
  ) {
    if (isDragging) return;
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

  const zoomPct = Math.round((1 / vb.w) * 100);

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
            <div className="flex items-center gap-2">
              {/* Zoom controls */}
              <div className="flex items-center gap-1">
                <Button
                  variant="outline" size="sm"
                  className="h-6 w-6 p-0 text-xs"
                  onClick={() => zoomBy(1.25)}
                  title="Zoom out"
                >−</Button>
                <span className="text-xs text-muted-foreground w-12 text-center">
                  {zoomPct}%
                </span>
                <Button
                  variant="outline" size="sm"
                  className="h-6 w-6 p-0 text-xs"
                  onClick={() => zoomBy(0.8)}
                  title="Zoom in"
                >+</Button>
                <Button
                  variant="outline" size="sm"
                  className="h-6 px-1.5 text-xs ml-1"
                  onClick={() => setVb(INITIAL_VB)}
                  title="Reset view"
                  disabled={vb.w === 1 && vb.x === 0 && vb.y === 0}
                >⟲</Button>
              </div>
              {!isLoading && (
                <Badge variant="outline">
                  {positioned.length} / {farmlands.length} mapped
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <Skeleton className="h-[600px] w-full rounded-none" />
          ) : (
            <div ref={containerRef} className="relative select-none" style={{ height: 600 }}>
              <svg
                ref={svgRef}
                width="100%"
                height="100%"
                viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
                preserveAspectRatio="xMidYMid meet"
                className="absolute inset-0"
                style={{
                  background: imageOk ? 'transparent' : 'hsl(var(--background))',
                  cursor: isDragging ? 'grabbing' : 'grab',
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
              >
                {/* Map background image inside SVG so it zooms/pans with circles */}
                {imageOk && (
                  <image
                    href="/api/server/map-image"
                    x={0} y={0} width={1} height={1}
                    preserveAspectRatio="xMidYMid meet"
                    onError={() => setImageLoadError(true)}
                  />
                )}

                {/* Grid lines (only shown without map image) */}
                {!imageOk && [0.25, 0.5, 0.75].map((v) => (
                  <g key={v}>
                    <line x1={v} y1={0} x2={v} y2={1} stroke="rgba(255,255,255,0.05)" strokeWidth={0.002} />
                    <line x1={0} y1={v} x2={1} y2={v} stroke="rgba(255,255,255,0.05)" strokeWidth={0.002} />
                  </g>
                ))}

                {/* Farmland circles */}
                {positioned.map((fl) => {
                  const { rx, ry } = worldToRatio(fl.x!, fl.z!);
                  const colour = farmColours.get(fl.owner_farm_id) ?? '#6b7280';
                  const r = Math.min(Math.max((fl.area_ha ?? 1) / 2048, 0.004), 0.025);
                  return (
                    <circle
                      key={fl.farmland_id}
                      cx={rx} cy={ry} r={r}
                      fill={colour} fillOpacity={0.55}
                      stroke={colour} strokeWidth={0.002} strokeOpacity={0.9}
                      style={{ cursor: isDragging ? 'grabbing' : 'pointer' }}
                      onMouseMove={(e) => handleCircleMouseMove(e, fl)}
                      onMouseLeave={() => setTooltip(null)}
                    />
                  );
                })}
              </svg>

              {/* No-image hint (outside SVG so it doesn't zoom) */}
              {mapStatus && !imageOk && (
                <div className="absolute inset-0 flex items-end justify-end p-3 pointer-events-none">
                  <p className="text-xs text-muted-foreground bg-card/80 px-2 py-1 rounded">
                    No map image — set a URL in Settings ⚙
                  </p>
                </div>
              )}

              {/* Tooltip (outside SVG, screen-space coords — correct at any zoom) */}
              {tooltip && !isDragging && (
                <div
                  className="absolute pointer-events-none z-10 rounded-md border border-border bg-card shadow-lg px-3 py-2 text-xs space-y-0.5"
                  style={{ left: tooltip.x, top: tooltip.y, maxWidth: 200 }}
                >
                  <p className="font-semibold text-foreground">{tooltip.name ?? 'Unnamed parcel'}</p>
                  {tooltip.owner && (
                    <p className="flex items-center gap-1 text-muted-foreground">
                      <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: tooltip.colour ?? '#6b7280' }} />
                      {tooltip.owner}
                    </p>
                  )}
                  {tooltip.area != null && <p className="text-muted-foreground">{formatHa(tooltip.area)}</p>}
                  {tooltip.price != null && <p className="text-muted-foreground">{fmt(tooltip.price)}</p>}
                </div>
              )}

              {positioned.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-muted-foreground text-sm">No farmland position data available yet.</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Scroll to zoom · Drag to pan
        {farmlands.length - positioned.length > 0 && (
          <span className="ml-3">{farmlands.length - positioned.length} parcels have no position data and are not shown.</span>
        )}
      </p>
    </div>
  );
}
