export interface WeatherInstance {
  typeName: string; // SUN | CLOUDY | RAIN | SNOW | HAIL
  season: string; // SPRING | SUMMER | AUTUMN | WINTER
  startDay: number;
  startDayTime: number; // ms from midnight
  duration: number; // ms
}

export interface EnvironmentFeed {
  currentDay: number;
  currentMonotonicDay: number;
  currentSeason: string; // derived from first forecast entry
  dayTime: number; // seconds (from FTP file)
  timeSinceLastRain: number; // seconds
  forecast: WeatherInstance[];
}
