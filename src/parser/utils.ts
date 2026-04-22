import { FillLevel } from '../types/common';

export function parseDayTime(dayTimeMs: number): string {
  const hours = Math.floor(dayTimeMs / 3_600_000);
  const minutes = Math.floor((dayTimeMs % 3_600_000) / 60_000);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function parseFillTypes(fillTypesStr: string, fillLevelsStr: string): FillLevel[] {
  if (!fillTypesStr || !fillLevelsStr) return [];
  const types = fillTypesStr.trim().split(/\s+/);
  const levels = fillLevelsStr.trim().split(/\s+/).map(Number);
  return types.map((type, i) => ({ type, level: levels[i] ?? 0 }));
}

// Normalise xml2js single-element-or-array output to always be an array
export function toArray<T>(val: T | T[] | undefined | null): T[] {
  if (val == null) return [];
  return Array.isArray(val) ? val : [val];
}

export function safeFloat(val: unknown, fallback = 0): number {
  const n = parseFloat(String(val));
  return isNaN(n) ? fallback : n;
}

export function safeInt(val: unknown, fallback = 0): number {
  const n = parseInt(String(val), 10);
  return isNaN(n) ? fallback : n;
}

export function safeBool(val: unknown): boolean {
  return String(val).toLowerCase() === 'true';
}
