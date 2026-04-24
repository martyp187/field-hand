import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/api/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FarmColourDot } from '@/components/FarmColourDot';
import { formatHa, formatMoney } from '@/lib/formatters';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from 'recharts';

interface FarmRow {
  farm_id: number;
  name: string;
  colour_hex: string | null;
}

interface MostLandRow extends FarmRow { total_ha: number; }
interface RichestRow extends FarmRow { money: number; }
interface VehicleHoursRow extends FarmRow { total_hours: number; }
interface TasksDoneRow { nickname: string; farm_id: number | null; colour_hex: string | null; count: number; }

interface LeaderboardData {
  mostLand: MostLandRow[];
  richest: RichestRow[];
  vehicleHours: VehicleHoursRow[];
  tasksDone: TasksDoneRow[];
}

function useLeaderboard() {
  return useQuery<LeaderboardData>({
    queryKey: ['leaderboard'],
    queryFn: () => apiFetch<LeaderboardData>('/api/leaderboard'),
    refetchInterval: 60_000,
  });
}

function rankIcon(index: number): string {
  if (index === 0) return '🏆';
  if (index === 1) return '🥈';
  if (index === 2) return '🥉';
  return `${index + 1}.`;
}

function RankRow({ index, colour, label, value }: {
  index: number;
  colour: string | null;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-border last:border-0">
      <span className="w-6 text-center text-sm shrink-0">{rankIcon(index)}</span>
      <FarmColourDot colour={colour} />
      <span className="flex-1 text-sm font-medium truncate">{label}</span>
      <span className="text-sm text-muted-foreground font-mono">{value}</span>
    </div>
  );
}

interface BarSectionProps<T> {
  data: T[];
  barKey: string;
  nameKey: string;
  colourKey: string;
  formatValue: (v: number) => string;
  formatTooltip: (v: number) => string;
  rank: (row: T, index: number) => { label: string; value: number };
}

function LeaderboardSection<T extends Record<string, unknown>>({
  data,
  barKey,
  nameKey,
  colourKey,
  formatValue,
  rank,
}: BarSectionProps<T>) {
  const chartData = data.map((row) => ({
    name: String(row[nameKey]).length > 10 ? String(row[nameKey]).slice(0, 9) + '…' : String(row[nameKey]),
    value: row[barKey] as number,
    colour: (row[colourKey] as string | null) ?? '#6b7280',
  }));

  return (
    <div className="space-y-6">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={(v: number) => formatValue(v)}
            width={64}
          />
          <Tooltip
            formatter={(v: number) => [formatValue(v)]}
            contentStyle={{ fontSize: 12, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
          />
          <Bar dataKey="value" radius={[3, 3, 0, 0]}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.colour} fillOpacity={0.8} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div>
        {data.map((row, i) => {
          const { label, value } = rank(row, i);
          return (
            <RankRow
              key={i}
              index={i}
              colour={(row[colourKey] as string | null) ?? null}
              label={label}
              value={formatValue(value)}
            />
          );
        })}
        {data.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">No data available.</p>
        )}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-[220px] w-full" />
      {[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
    </div>
  );
}

export function Leaderboard() {
  const { data, isLoading, isError } = useLeaderboard();

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Leaderboard</h1>

      {isError && (
        <p className="text-sm text-destructive">Failed to load leaderboard data.</p>
      )}

      <Tabs defaultValue="land">
        <TabsList>
          <TabsTrigger value="land">🌾 Most Land</TabsTrigger>
          <TabsTrigger value="rich">💰 Richest</TabsTrigger>
          <TabsTrigger value="hours">🚜 Vehicle Hours</TabsTrigger>
          <TabsTrigger value="tasks">✅ Tasks Done</TabsTrigger>
        </TabsList>

        <TabsContent value="land">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Total farmland owned (ha)</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <LoadingSkeleton /> : (
                <LeaderboardSection
                  data={data!.mostLand}
                  barKey="total_ha"
                  nameKey="name"
                  colourKey="colour_hex"
                  formatValue={(v) => formatHa(v)}
                  formatTooltip={(v) => formatHa(v)}
                  rank={(row, i) => ({ label: row.name as string, value: row.total_ha as number })}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rich">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Current farm balance</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <LoadingSkeleton /> : (
                <LeaderboardSection
                  data={data!.richest}
                  barKey="money"
                  nameKey="name"
                  colourKey="colour_hex"
                  formatValue={(v) => formatMoney(v)}
                  formatTooltip={(v) => formatMoney(v)}
                  rank={(row, i) => ({ label: row.name as string, value: row.money as number })}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hours">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Total vehicle operating hours</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <LoadingSkeleton /> : (
                <LeaderboardSection
                  data={data!.vehicleHours}
                  barKey="total_hours"
                  nameKey="name"
                  colourKey="colour_hex"
                  formatValue={(v) => `${v.toFixed(0)} h`}
                  formatTooltip={(v) => `${v.toFixed(1)} h`}
                  rank={(row, i) => ({ label: row.name as string, value: row.total_hours as number })}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Tasks completed per player</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <LoadingSkeleton /> : (
                <div className="space-y-6">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart
                      data={data!.tasksDone.map((r) => ({
                        name: r.nickname.length > 10 ? r.nickname.slice(0, 9) + '…' : r.nickname,
                        value: r.count,
                        colour: r.colour_hex ?? '#6b7280',
                      }))}
                      margin={{ top: 4, right: 8, left: 8, bottom: 4 }}
                    >
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={36} />
                      <Tooltip
                        formatter={(v: number) => [`${v} task${v !== 1 ? 's' : ''}`]}
                        contentStyle={{ fontSize: 12, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                      />
                      <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                        {data!.tasksDone.map((r, i) => (
                          <Cell key={i} fill={r.colour_hex ?? '#6b7280'} fillOpacity={0.8} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>

                  <div>
                    {data!.tasksDone.map((row, i) => (
                      <div key={row.nickname} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                        <span className="w-6 text-center text-sm shrink-0">{rankIcon(i)}</span>
                        <FarmColourDot colour={row.colour_hex} />
                        <span className="flex-1 text-sm font-medium truncate">{row.nickname}</span>
                        <span className="text-sm text-muted-foreground font-mono">
                          {row.count} task{row.count !== 1 ? 's' : ''}
                        </span>
                      </div>
                    ))}
                    {data!.tasksDone.length === 0 && (
                      <p className="text-sm text-muted-foreground py-4 text-center">No completed tasks yet.</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
