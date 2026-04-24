import { useParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { PageError } from '@/components/ui/page-states';
import { FarmColourDot } from '@/components/FarmColourDot';
import { FillLevelBadge } from '@/components/FillLevelBadge';
import {
  useFarm,
  useFarmFinances,
  useFarmVehicles,
  useFarmFields,
  useFarmStatistics,
  type FinanceSnapshot,
  type Vehicle,
  type Farmland,
} from '@/api/hooks/useFarms';
import { formatMoney, formatHa, formatHours, formatRelativeTime } from '@/lib/formatters';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const MAX_LOAN = 2_000_000;

function incomeTotal(s: FinanceSnapshot): number {
  return (
    (s.harvest_income ?? 0) +
    (s.mission_income ?? 0) +
    (s.sold_milk ?? 0) +
    (s.sold_wool ?? 0) +
    (s.sold_products ?? 0) +
    (s.sold_bales ?? 0) +
    (s.sold_wood ?? 0) +
    (s.income_bga ?? 0) +
    (s.sold_animals ?? 0)
  );
}

function expenseTotal(s: FinanceSnapshot): number {
  return (
    (s.new_vehicles_cost ?? 0) +
    (s.field_purchase ?? 0) +
    (s.purchase_fuel ?? 0) +
    (s.purchase_seeds ?? 0) +
    (s.purchase_fertilizer ?? 0) +
    (s.loan_interest ?? 0) +
    (s.vehicle_running_cost ?? 0) +
    (s.production_costs ?? 0) +
    (s.construction_cost ?? 0) +
    (s.wage_payment ?? 0)
  );
}

// ─── Overview tab ────────────────────────────────────────────────────────────

function OverviewTab({ farmId }: { farmId: number }) {
  const { data: farm, isLoading } = useFarm(farmId);
  const { data: vehicles = [] } = useFarmVehicles(farmId);
  const { data: fields = [] } = useFarmFields(farmId);
  const { data: stats = [] } = useFarmStatistics(farmId);

  const latestStats = stats[0] ?? null;
  const totalHa = (fields as Farmland[]).reduce((sum, f) => sum + (f.area_ha ?? 0), 0);
  const loanPct = farm ? Math.min((farm.loan / MAX_LOAN) * 100, 100) : 0;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((n) => <Skeleton key={n} className="h-32" />)}
      </div>
    );
  }

  if (!farm) return <p className="text-muted-foreground">Farm not found.</p>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Balance */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-3xl font-bold ${farm.money >= 0 ? 'text-positive' : 'text-destructive'}`}
            >
              {formatMoney(farm.money)}
            </p>
          </CardContent>
        </Card>

        {/* Loan */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Loan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className={`text-2xl font-semibold ${farm.loan > 0 ? 'text-destructive' : 'text-positive'}`}>
              {formatMoney(farm.loan)}
            </p>
            <Progress value={loanPct} className="h-2" />
            <p className="text-xs text-muted-foreground">{loanPct.toFixed(0)}% of max loan</p>
          </CardContent>
        </Card>

        {/* Players */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Players</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {farm.players && farm.players.length > 0 ? (
              farm.players.map((p) => (
                <div key={p.unique_user_id} className="flex justify-between text-sm">
                  <span className="font-medium">{p.last_nickname ?? 'Unknown'}</span>
                  <span className="text-muted-foreground text-xs">
                    {p.farm_manager ? '★ ' : ''}{formatRelativeTime(p.time_last_connected)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No players assigned</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Land owned</p>
            <p className="text-xl font-semibold">{formatHa(totalHa)}</p>
            <p className="text-xs text-muted-foreground">{fields.length} parcels</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Vehicles</p>
            <p className="text-xl font-semibold">{vehicles.length}</p>
            <p className="text-xs text-muted-foreground">
              {vehicles.filter((v) => v.is_ai_active).length} AI active
            </p>
          </CardContent>
        </Card>
        {latestStats && (
          <>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Worked</p>
                <p className="text-xl font-semibold">{formatHa(latestStats.worked_hectares ?? 0)}</p>
                <p className="text-xs text-muted-foreground">
                  {formatHours(latestStats.play_time ?? 0)} play time
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Fuel used</p>
                <p className="text-xl font-semibold">
                  {((latestStats.fuel_usage ?? 0) / 1000).toFixed(1)}kL
                </p>
                <p className="text-xs text-muted-foreground">
                  {latestStats.mission_count ?? 0} missions
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Finances tab ─────────────────────────────────────────────────────────────

function FinancesTab({ farmId }: { farmId: number }) {
  const { data: finances = [], isLoading } = useFarmFinances(farmId);
  const sorted = [...finances].sort((a, b) => a.in_game_day - b.in_game_day);

  const chartData = sorted.map((s) => ({
    day: `D${s.in_game_day}`,
    Income: Math.round(incomeTotal(s)),
    Expenses: Math.round(expenseTotal(s)),
  }));

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (finances.length === 0) {
    return <p className="text-muted-foreground text-sm">No finance data recorded yet.</p>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">Daily Income vs Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#a1a1aa' }} />
              <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#a1a1aa' }} />
              <Tooltip
                formatter={(value) => formatMoney(Number(value))}
                contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 6 }}
                labelStyle={{ color: '#a1a1aa' }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Income" fill="#22c55e" radius={[2, 2, 0, 0]} />
              <Bar dataKey="Expenses" fill="#ef4444" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detail table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">Daily Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-xs">
                <th className="text-left py-2 pr-4">Day</th>
                <th className="text-right py-2 pr-4">Harvest</th>
                <th className="text-right py-2 pr-4">Missions</th>
                <th className="text-right py-2 pr-4">Livestock</th>
                <th className="text-right py-2 pr-4">Other Income</th>
                <th className="text-right py-2 pr-4 text-destructive">Vehicles</th>
                <th className="text-right py-2 pr-4 text-destructive">Inputs</th>
                <th className="text-right py-2">Net</th>
              </tr>
            </thead>
            <tbody>
              {[...sorted].reverse().map((s) => {
                const income = incomeTotal(s);
                const expenses = expenseTotal(s);
                const net = income - expenses;
                return (
                  <tr key={s.id} className="border-b border-border/40 hover:bg-muted/20">
                    <td className="py-2 pr-4 font-mono text-xs text-muted-foreground">D{s.in_game_day}</td>
                    <td className="py-2 pr-4 text-right text-positive">{formatMoney(s.harvest_income ?? 0)}</td>
                    <td className="py-2 pr-4 text-right text-positive">{formatMoney(s.mission_income ?? 0)}</td>
                    <td className="py-2 pr-4 text-right text-positive">
                      {formatMoney((s.sold_milk ?? 0) + (s.sold_wool ?? 0) + (s.sold_animals ?? 0))}
                    </td>
                    <td className="py-2 pr-4 text-right text-positive">
                      {formatMoney((s.sold_products ?? 0) + (s.sold_bales ?? 0) + (s.sold_wood ?? 0) + (s.income_bga ?? 0))}
                    </td>
                    <td className="py-2 pr-4 text-right text-destructive">
                      {formatMoney((s.new_vehicles_cost ?? 0) + (s.vehicle_running_cost ?? 0) + (s.purchase_fuel ?? 0))}
                    </td>
                    <td className="py-2 pr-4 text-right text-destructive">
                      {formatMoney((s.purchase_seeds ?? 0) + (s.purchase_fertilizer ?? 0) + (s.loan_interest ?? 0) + (s.production_costs ?? 0) + (s.construction_cost ?? 0) + (s.wage_payment ?? 0) + (s.field_purchase ?? 0))}
                    </td>
                    <td className={`py-2 text-right font-semibold ${net >= 0 ? 'text-positive' : 'text-destructive'}`}>
                      {formatMoney(net)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Vehicles tab ─────────────────────────────────────────────────────────────

function VehiclesTab({ farmId }: { farmId: number }) {
  const { data: vehicles = [], isLoading } = useFarmVehicles(farmId);

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (vehicles.length === 0) {
    return <p className="text-muted-foreground text-sm">No vehicles recorded for this farm.</p>;
  }

  const owned = vehicles.filter((v) => v.property_state === 'OWNED');
  const mission = vehicles.filter((v) => v.property_state !== 'OWNED');

  function VehicleGroup({ list, label }: { list: Vehicle[]; label: string }) {
    if (list.length === 0) return null;
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">{label} ({list.length})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-xs">
                <th className="text-left py-2 pr-3">Name</th>
                <th className="text-left py-2 pr-3">Category</th>
                <th className="text-right py-2 pr-3">Age</th>
                <th className="text-right py-2 pr-3">Damage</th>
                <th className="text-right py-2 pr-3">Wear</th>
                <th className="text-left py-2 pr-3">Fills</th>
                <th className="text-center py-2">AI</th>
              </tr>
            </thead>
            <tbody>
              {list.map((v) => {
                const dmgPct = Math.round(v.damage * 100);
                const wearPct = Math.round(v.wear * 100);
                return (
                  <tr key={v.unique_id} className="border-b border-border/40 hover:bg-muted/20">
                    <td className="py-2 pr-3 font-medium max-w-[180px] truncate">{v.name}</td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground uppercase">{v.category}</td>
                    <td className="py-2 pr-3 text-right text-xs">{v.age}d</td>
                    <td className="py-2 pr-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className={`text-xs ${dmgPct > 50 ? 'text-destructive' : dmgPct > 20 ? 'text-warning' : 'text-positive'}`}>
                          {dmgPct}%
                        </span>
                        <Progress value={dmgPct} className="h-1.5 w-16" />
                      </div>
                    </td>
                    <td className="py-2 pr-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className={`text-xs ${wearPct > 50 ? 'text-destructive' : wearPct > 20 ? 'text-warning' : 'text-positive'}`}>
                          {wearPct}%
                        </span>
                        <Progress value={wearPct} className="h-1.5 w-16" />
                      </div>
                    </td>
                    <td className="py-2 pr-3">
                      <div className="flex flex-wrap gap-1">
                        {(v.fills ?? []).map((f, i) => (
                          <FillLevelBadge key={i} type={f.type} level={f.level} />
                        ))}
                      </div>
                    </td>
                    <td className="py-2 text-center">
                      {v.is_ai_active ? (
                        <span className="text-positive text-xs">●</span>
                      ) : (
                        <span className="text-muted-foreground text-xs">○</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <VehicleGroup list={owned} label="Owned" />
      <VehicleGroup list={mission} label="Mission" />
    </div>
  );
}

// ─── Fields tab ───────────────────────────────────────────────────────────────

function FieldsTab({ farmId }: { farmId: number }) {
  const { data: fields = [], isLoading } = useFarmFields(farmId);

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (fields.length === 0) {
    return <p className="text-muted-foreground text-sm">No land parcels recorded for this farm.</p>;
  }

  const totalHa = (fields as Farmland[]).reduce((sum, f) => sum + (f.area_ha ?? 0), 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">
          {fields.length} parcels · {formatHa(totalHa)} total
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground text-xs">
              <th className="text-left py-2 pr-4">#</th>
              <th className="text-left py-2 pr-4">Name</th>
              <th className="text-right py-2 pr-4">Area</th>
              <th className="text-right py-2">Value</th>
            </tr>
          </thead>
          <tbody>
            {(fields as Farmland[]).map((f) => (
              <tr key={f.farmland_id} className="border-b border-border/40 hover:bg-muted/20">
                <td className="py-2 pr-4 font-mono text-xs text-muted-foreground">{f.farmland_id}</td>
                <td className="py-2 pr-4">{f.name ?? `Parcel ${f.farmland_id}`}</td>
                <td className="py-2 pr-4 text-right">{f.area_ha != null ? formatHa(f.area_ha) : '—'}</td>
                <td className="py-2 text-right text-muted-foreground">
                  {f.current_price != null ? formatMoney(f.current_price) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

// ─── Page root ────────────────────────────────────────────────────────────────

export function FarmDashboard() {
  const { id } = useParams<{ id: string }>();
  const farmId = id ? parseInt(id, 10) : null;
  const { data: farm, isLoading, isError, refetch } = useFarm(farmId);

  if (farmId === null) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">No farm selected.</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6">
        <PageError message="Could not load farm data." onRetry={() => void refetch()} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        {isLoading ? (
          <Skeleton className="h-7 w-48" />
        ) : farm ? (
          <>
            <FarmColourDot colour={farm.colour_hex ?? null} />
            <h1 className="text-2xl font-semibold">{farm.name}</h1>
            <Badge variant="outline" className="ml-auto">
              Farm {farmId}
            </Badge>
          </>
        ) : (
          <h1 className="text-2xl font-semibold text-muted-foreground">Farm not found</h1>
        )}
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="finances">Finances</TabsTrigger>
          <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
          <TabsTrigger value="fields">Fields</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab farmId={farmId} />
        </TabsContent>
        <TabsContent value="finances" className="mt-4">
          <FinancesTab farmId={farmId} />
        </TabsContent>
        <TabsContent value="vehicles" className="mt-4">
          <VehiclesTab farmId={farmId} />
        </TabsContent>
        <TabsContent value="fields" className="mt-4">
          <FieldsTab farmId={farmId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
