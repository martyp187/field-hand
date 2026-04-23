// Riverbend Springs (MapUS): 2048×2048 world units centred at (0,0)
const WORLD_SIZE = 2048;
const HALF = WORLD_SIZE / 2;

export function worldToPixel(
  worldX: number,
  worldZ: number,
  imageWidth: number,
  imageHeight: number,
): { x: number; y: number } {
  return {
    x: ((worldX + HALF) / WORLD_SIZE) * imageWidth,
    y: ((worldZ + HALF) / WORLD_SIZE) * imageHeight,
  };
}
