import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { WeatherIcon } from '@/components/WeatherIcon';
import { FarmColourDot } from '@/components/FarmColourDot';
import { PageError } from '@/components/ui/page-states';
import { useServerStatus, useServerWeather } from '@/api/hooks/useServer';
import { useFarms } from '@/api/hooks/useFarms';
import { formatMoney, formatGameTime, formatRelativeTime } from '@/lib/formatters';

export function ServerOverview() {
  const { data: status, isLoading: statusLoading, isError: statusError, refetch } = useServerStatus();
  const { data: weather, isLoading: weatherLoading } = useServerWeather();
  const { data: farms = [], isLoading: farmsLoading } = useFarms();
  const navigate = useNavigate();

  const snap = status?.snapshot;

  if (statusError) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">Server Overview</h1>
        <PageError message="Could not load server status." onRetry={() => void refetch()} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Server Overview</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Server status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Server</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {statusLoading ? (
              <Skeleton className="h-5 w-40" />
            ) : snap ? (
              <>
                <p className="font-semibold truncate">{snap.server_name ?? 'Unknown'}</p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {snap.slots_used ?? 0} / {snap.slots_capacity ?? 6} players
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {snap.game_version ?? ''}
                  </span>
                </div>
                {snap.day_time_ms != null && (
                  <p className="text-sm text-muted-foreground">
                    🕐 {formatGameTime(snap.day_time_ms)}
                    {snap.in_game_day != null && ` · Day ${snap.in_game_day}`}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Updated {formatRelativeTime(snap.snapshot_time)}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Season + weather */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Weather</CardTitle>
          </CardHeader>
          <CardContent>
            {weatherLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : weather ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {weather.season && (
                    <Badge className="capitalize">{weather.season.toLowerCase()}</Badge>
                  )}
                  {weather.weatherForecast[0] && (
                    <WeatherIcon typeName={weather.weatherForecast[0].typeName} className="text-2xl" />
                  )}
                </div>
                {weather.weatherForecast.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {weather.weatherForecast.slice(0, 10).map((w, i) => (
                      <div key={i} className="flex flex-col items-center gap-1 flex-shrink-0">
                        <span className="text-xs text-muted-foreground">+{i + 1}</span>
                        <WeatherIcon typeName={w.typeName} className="text-lg" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No forecast</p>
            )}
          </CardContent>
        </Card>

        {/* Poller health */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Data Freshness</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {(status?.pollerHealth ?? []).map((h) => {
              const ph = h as {
                source_name: string;
                status: string;
                last_success_at: string | null;
              };
              return (
                <div key={ph.source_name} className="flex justify-between items-center text-xs">
                  <span className="uppercase text-muted-foreground">{ph.source_name}</span>
                  <span
                    className={
                      ph.status === 'OK'
                        ? 'text-positive'
                        : ph.status === 'UNKNOWN'
                          ? 'text-muted-foreground'
                          : 'text-destructive'
                    }
                  >
                    {formatRelativeTime(ph.last_success_at)}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Farm cards */}
      <div>
        <h2 className="text-lg font-medium mb-3">Farms</h2>
        {farmsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((n) => (
              <Skeleton key={n} className="h-32" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {farms.map((farm) => (
              <Card
                key={farm.farm_id}
                className="cursor-pointer hover:bg-accent/20 transition-colors border-l-4"
                style={{ borderLeftColor: farm.colour_hex ?? '#6b7280' }}
                onClick={() => navigate(`/farm/${farm.farm_id}`)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FarmColourDot colour={farm.colour_hex} />
                    {farm.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Balance</p>
                      <p
                        className={
                          farm.money >= 0 ? 'font-medium text-positive' : 'font-medium text-destructive'
                        }
                      >
                        {formatMoney(farm.money)}
                      </p>
                    </div>
                    {farm.player_count != null && (
                      <div>
                        <p className="text-muted-foreground text-xs">Players</p>
                        <p className="font-medium">{farm.player_count}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
