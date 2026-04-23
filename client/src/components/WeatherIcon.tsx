const ICONS: Record<string, string> = {
  SUN: '☀️',
  CLOUDY: '🌥️',
  RAIN: '🌧️',
  SNOW: '❄️',
  HAIL: '⛈️',
};

export function WeatherIcon({ typeName, className }: { typeName: string; className?: string }) {
  const icon = ICONS[typeName.toUpperCase()] ?? '🌤️';
  return (
    <span className={className} title={typeName}>
      {icon}
    </span>
  );
}
