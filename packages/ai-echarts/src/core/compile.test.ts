import { describe, expect, it } from 'vitest';
import { compile, extractTablePayload, safeCompile } from './compile';
import { recommendByRules } from './recommend';
import { profileData } from './profile';
import { applyTransforms } from './transform';
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

  it('boosts bar when NL asks for comparison', () => {
    const specs = recommendByRules(sample, 1, '按地区对比销售额，用柱状图');
    expect(specs[0].chartType).toBe('bar');
    expect(specs[0].title).toMatch(/对比|region|地区/);
  });
});

describe('applyTransforms', () => {
  it('aggregates without keeping row arrays', () => {
    const rows = applyTransforms(sample, [
      {
        op: 'aggregate',
        groupBy: ['region'],
        metrics: [{ field: 'sales', fn: 'sum', as: 'sales' }],
      },
      { op: 'sort', by: 'sales', order: 'desc' },
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0].region).toBe('华东');
    expect(rows[0].sales).toBe(270);
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

  it('rejects missing encode fields after transform', () => {
    expect(() =>
      compile(
        {
          id: 'bad',
          chartType: 'bar',
          encode: { x: 'region', y: 'not_exist' },
          transform: [
            {
              op: 'aggregate',
              groupBy: ['region'],
              metrics: [{ field: 'sales', fn: 'sum', as: 'sales' }],
            },
          ],
        },
        sample,
      ),
    ).toThrow(/not_exist/);
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
    expect(extractTablePayload(result.option)).toBeTruthy();
  });
});
