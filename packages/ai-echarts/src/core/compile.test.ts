import { describe, expect, it } from 'vitest';
import { compile, safeCompile } from './compile';
import { recommendByRules } from './recommend';
import { profileData } from './profile';
import type { ChartSpec, DataRow } from './types';

const sample: DataRow[] = [
  { region: '华东', date: '2026-01-01', sales: 120, qty: 10 },
  { region: '华北', date: '2026-01-01', sales: 90, qty: 8 },
  { region: '华东', date: '2026-01-02', sales: 150, qty: 12 },
  { region: '华北', date: '2026-01-02', sales: 110, qty: 9 },
];

describe('profileData', () => {
  it('infers field roles', () => {
    const schema = profileData(sample);
    expect(schema.rowCount).toBe(4);
    expect(schema.fields.find((f) => f.name === 'sales')?.roleHint).toBe('measure');
    expect(schema.fields.find((f) => f.name === 'date')?.type).toBe('time');
  });
});

describe('recommendByRules', () => {
  it('returns at least one chart', () => {
    const specs = recommendByRules(sample);
    expect(specs.length).toBeGreaterThan(0);
    expect(['line', 'bar', 'area', 'pie', 'scatter', 'table']).toContain(specs[0].chartType);
  });
});

describe('compile', () => {
  it('compiles bar chart with aggregate', () => {
    const spec: ChartSpec = {
      id: 'b1',
      chartType: 'bar',
      title: 'Sales by region',
      encode: { x: 'region', y: 'sales' },
      transform: [
        {
          op: 'aggregate',
          groupBy: ['region'],
          metrics: [{ field: 'sales', fn: 'sum', as: 'sales' }],
        },
      ],
    };
    const option = compile(spec, sample);
    expect(option.series).toBeTruthy();
    expect(Array.isArray(option.series)).toBe(true);
  });

  it('safeCompile falls back on bad fields', () => {
    const result = safeCompile(
      {
        id: 'bad',
        chartType: 'bar',
        encode: { x: 'missing', y: 'sales' },
      },
      sample,
    );
    expect(result.ok).toBe(false);
    expect((result.option as { __aiEchartsTable?: unknown }).__aiEchartsTable).toBeTruthy();
  });
});
