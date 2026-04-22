// FS25 farm colour index → hex palette
// Index 0 is reserved (no farm). Indices 1–15 match the in-game colour picker order.
// Configurable at runtime via app_settings.farmColourPalette.
const DEFAULT_PALETTE: Record<number, string> = {
  0: '#888888', // no farm / unassigned
  1: '#E8202A', // red
  2: '#2255CC', // blue
  3: '#4CAF50', // green
  4: '#F4C430', // yellow
  5: '#9C27B0', // purple
  6: '#FF6F00', // orange
  7: '#E91E8C', // pink
  8: '#00BCD4', // cyan
  9: '#795548', // brown
  10: '#FF5722', // deep orange
  11: '#009688', // teal
  12: '#607D8B', // blue grey
  13: '#CDDC39', // lime
  14: '#FF8A65', // salmon
  15: '#B0BEC5', // silver
};

let runtimePalette: Record<number, string> = { ...DEFAULT_PALETTE };

export function setFarmColourPalette(palette: Record<number, string>): void {
  runtimePalette = { ...DEFAULT_PALETTE, ...palette };
}

export function getFarmColour(index: number): string {
  return runtimePalette[index] ?? '#888888';
}

export function getDefaultPalette(): Record<number, string> {
  return { ...DEFAULT_PALETTE };
}
