import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

// Approximate daily feed consumption per head (liters per in-game day)
// Based on FS25 default feeding requirements
const ANIMAL_TYPES = [
  {
    key: 'cows',
    label: 'Dairy Cows',
    emoji: '🐄',
    feeds: [
      { type: 'Hay',    liters: 100 },
      { type: 'Silage', liters: 100 },
      { type: 'Water',  liters: 500 },
    ],
    dailyTotal: 700,
    output: 'Milk production',
  },
  {
    key: 'sheep',
    label: 'Sheep',
    emoji: '🐑',
    feeds: [
      { type: 'Grass/Straw', liters: 50 },
      { type: 'Water',       liters: 100 },
    ],
    dailyTotal: 150,
    output: 'Wool production',
  },
  {
    key: 'pigs',
    label: 'Pigs',
    emoji: '🐷',
    feeds: [
      { type: 'Potatoes', liters: 50 },
      { type: 'Soybean',  liters: 30 },
      { type: 'Wheat',    liters: 30 },
      { type: 'Water',    liters: 100 },
    ],
    dailyTotal: 210,
    output: 'Slurry (fertilizer)',
  },
  {
    key: 'chickens',
    label: 'Chickens',
    emoji: '🐓',
    feeds: [
      { type: 'Grain/Wheat', liters: 10 },
      { type: 'Water',       liters: 20 },
    ],
    dailyTotal: 30,
    output: 'Eggs',
  },
  {
    key: 'goats',
    label: 'Goats',
    emoji: '🐐',
    feeds: [
      { type: 'Grass', liters: 30 },
      { type: 'Hay',   liters: 20 },
      { type: 'Water', liters: 80 },
    ],
    dailyTotal: 130,
    output: 'Milk production',
  },
  {
    key: 'horses',
    label: 'Horses',
    emoji: '🐴',
    feeds: [
      { type: 'Hay',   liters: 30 },
      { type: 'Straw', liters: 20 },
      { type: 'Water', liters: 100 },
    ],
    dailyTotal: 150,
    output: 'Training / riding',
  },
] as const;

type AnimalKey = typeof ANIMAL_TYPES[number]['key'];

function FeedCard({
  animal,
  count,
  onCountChange,
}: {
  animal: typeof ANIMAL_TYPES[number];
  count: number;
  onCountChange: (n: number) => void;
}) {
  const dailyTotal = animal.dailyTotal * count;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">
            {animal.emoji} {animal.label}
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {animal.output}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <label className="text-xs text-muted-foreground w-20 shrink-0">Head count</label>
          <Input
            type="number"
            min="0"
            step="1"
            value={count}
            onChange={(e) => onCountChange(Math.max(0, parseInt(e.target.value) || 0))}
            className="h-7 text-xs w-24"
          />
        </div>

        {count > 0 && (
          <>
            <div className="space-y-1">
              {animal.feeds.map((f) => (
                <div key={f.type} className="flex justify-between text-xs text-muted-foreground">
                  <span>{f.type}</span>
                  <span className="font-mono">{(f.liters * count).toLocaleString()} L/day</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-border/40">
              <span className="text-xs font-medium">Total daily</span>
              <span className="text-xs font-mono font-semibold">{dailyTotal.toLocaleString()} L</span>
            </div>
          </>
        )}

        {count === 0 && (
          <p className="text-xs text-muted-foreground">Enter head count to see feed requirements.</p>
        )}
      </CardContent>
    </Card>
  );
}

export function Livestock() {
  const [counts, setCounts] = useState<Record<AnimalKey, number>>({
    cows: 0,
    sheep: 0,
    pigs: 0,
    chickens: 0,
    goats: 0,
    horses: 0,
  });

  function setCount(key: AnimalKey, n: number) {
    setCounts((prev) => ({ ...prev, [key]: n }));
  }

  const totalAnimals = Object.values(counts).reduce((s, n) => s + n, 0);

  const totalDailyFeed = ANIMAL_TYPES.reduce(
    (sum, a) => sum + a.dailyTotal * counts[a.key],
    0,
  );

  // Aggregate feed types across all animals
  type FeedSummary = Record<string, number>;
  const feedSummary = ANIMAL_TYPES.reduce<FeedSummary>((acc, animal) => {
    const count = counts[animal.key];
    if (count === 0) return acc;
    for (const feed of animal.feeds) {
      acc[feed.type] = (acc[feed.type] ?? 0) + feed.liters * count;
    }
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Livestock Feed Calculator</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Enter your herd sizes to calculate daily feed requirements.
          Values are estimates based on FS25 default feeding rates.
        </p>
      </div>

      {totalAnimals > 0 && (
        <Card className="border-positive/30 bg-positive/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Daily Feed Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(feedSummary)
                .sort((a, b) => b[1] - a[1])
                .map(([type, liters]) => (
                  <div key={type} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{type}</span>
                    <span className="font-mono font-medium">{liters.toLocaleString()} L</span>
                  </div>
                ))}
            </div>
            <div className="pt-2 border-t border-border/40 flex justify-between items-center">
              <span className="text-sm font-semibold">
                {totalAnimals} animals total
              </span>
              <span className="text-sm font-mono font-bold">
                {totalDailyFeed.toLocaleString()} L/day
              </span>
            </div>
            <p className="text-xs text-muted-foreground pt-1">
              At 5× time scale, one in-game day passes every ~4.8 real hours.
              Keep sufficient storage to avoid feed running out overnight.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {ANIMAL_TYPES.map((animal) => (
          <FeedCard
            key={animal.key}
            animal={animal}
            count={counts[animal.key]}
            onCountChange={(n) => setCount(animal.key, n)}
          />
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Feed values are approximate and may vary by game settings, mods, or growth stage.
        Water is included in totals.
      </p>
    </div>
  );
}
