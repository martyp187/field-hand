import { parseStringPromise } from 'xml2js';
import { EnvironmentFeed, WeatherInstance } from '../types/environment';
import { toArray, safeFloat, safeInt } from './utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = Record<string, any>;

export async function parseEnvironment(xml: string): Promise<EnvironmentFeed> {
  const raw: Raw = await parseStringPromise(xml, {
    explicitArray: false,
    trim: true,
    charkey: '_',
  });

  const root: Raw = raw?.environment ?? raw?.Environment ?? raw ?? {};
  const weatherNode: Raw = root?.weather ?? root?.Weather ?? {};
  const forecastNode: Raw = weatherNode?.forecast ?? weatherNode?.Forecast ?? {};
  const instances = toArray<Raw>(forecastNode?.instance ?? forecastNode?.Instance);

  const forecast: WeatherInstance[] = instances.map((inst: Raw) => {
    const a = inst?.$ ?? inst;
    return {
      typeName: String(a?.typeName ?? 'SUN'),
      season: String(a?.season ?? ''),
      startDay: safeInt(a?.startDay),
      startDayTime: safeInt(a?.startDayTime),
      duration: safeInt(a?.duration),
    };
  });

  // Current season is the season of the first forecast entry that is current or upcoming
  const currentSeason = forecast[0]?.season ?? '';

  const weatherAttrs = weatherNode?.$ ?? weatherNode;

  return {
    currentDay: safeInt(root?.currentDay),
    currentMonotonicDay: safeInt(root?.currentMonotonicDay),
    currentSeason,
    dayTime: safeFloat(root?.dayTime),
    timeSinceLastRain: safeInt(weatherAttrs?.timeSinceLastRain),
    forecast,
  };
}
