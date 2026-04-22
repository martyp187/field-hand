import { parseDayTime, parseFillTypes, toArray, safeFloat, safeInt, safeBool } from '../../src/parser/utils';

describe('parseDayTime', () => {
  it('converts midnight correctly', () => {
    expect(parseDayTime(0)).toBe('00:00');
  });

  it('converts noon correctly', () => {
    // 12 * 3600000 = 43200000
    expect(parseDayTime(43_200_000)).toBe('12:00');
  });

  it('converts 18:30 correctly', () => {
    // 18 * 3600000 + 30 * 60000 = 66600000
    expect(parseDayTime(66_600_000)).toBe('18:30');
  });

  it('pads single-digit hours and minutes', () => {
    // 9 * 3600000 + 5 * 60000 = 32700000
    expect(parseDayTime(32_700_000)).toBe('09:05');
  });
});

describe('parseFillTypes', () => {
  it('zips single fill type', () => {
    expect(parseFillTypes('DIESEL', '610.000')).toEqual([{ type: 'DIESEL', level: 610 }]);
  });

  it('zips multiple fill types', () => {
    expect(parseFillTypes('DIESEL DEF AIR', '610.000 70.000 2111.039')).toEqual([
      { type: 'DIESEL', level: 610 },
      { type: 'DEF', level: 70 },
      { type: 'AIR', level: 2111.039 },
    ]);
  });

  it('returns empty array for empty strings', () => {
    expect(parseFillTypes('', '')).toEqual([]);
  });

  it('defaults missing level to 0', () => {
    expect(parseFillTypes('DIESEL DEF', '100')).toEqual([
      { type: 'DIESEL', level: 100 },
      { type: 'DEF', level: 0 },
    ]);
  });
});

describe('toArray', () => {
  it('wraps a single object in an array', () => {
    expect(toArray({ a: 1 })).toEqual([{ a: 1 }]);
  });

  it('returns an existing array unchanged', () => {
    expect(toArray([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it('returns empty array for null', () => {
    expect(toArray(null)).toEqual([]);
  });

  it('returns empty array for undefined', () => {
    expect(toArray(undefined)).toEqual([]);
  });
});

describe('safeFloat', () => {
  it('parses a valid float string', () => {
    expect(safeFloat('1.5')).toBe(1.5);
  });

  it('returns fallback for non-numeric input', () => {
    expect(safeFloat('abc')).toBe(0);
    expect(safeFloat(undefined)).toBe(0);
    expect(safeFloat('abc', 99)).toBe(99);
  });
});

describe('safeInt', () => {
  it('parses a valid integer string', () => {
    expect(safeInt('42')).toBe(42);
  });

  it('returns fallback for non-numeric input', () => {
    expect(safeInt(undefined)).toBe(0);
    expect(safeInt('xyz', 7)).toBe(7);
  });
});

describe('safeBool', () => {
  it('returns true for "true"', () => {
    expect(safeBool('true')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(safeBool('TRUE')).toBe(true);
    expect(safeBool('True')).toBe(true);
  });

  it('returns false for anything else', () => {
    expect(safeBool('false')).toBe(false);
    expect(safeBool('1')).toBe(false);
    expect(safeBool(undefined)).toBe(false);
  });
});
