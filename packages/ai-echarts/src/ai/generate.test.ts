import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DataRow } from '../core/types';
import { generateChartSpec } from './generate';
import * as deepseek from './deepseek';

const sample: DataRow[] = [
  { region: '华东', sales: 120 },
  { region: '华北', sales: 90 },
];

afterEach(() => {
  vi.restoreAllMocks();
});

describe('generateChartSpec', () => {
  it('throws without key when fallback disabled', async () => {
    await expect(
      generateChartSpec({
        nl: '按地区对比销售额',
        data: sample,
        fallbackToRules: false,
        llm: { apiKey: undefined },
      }),
    ).rejects.toBeInstanceOf(deepseek.MissingApiKeyError);
  });

  it('falls back to rules when requested and key missing', async () => {
    const result = await generateChartSpec({
      nl: '按地区对比销售额',
      data: sample,
      fallbackToRules: true,
      llm: { apiKey: undefined },
    });
    expect(result.source).toBe('rules');
    expect(result.spec.chartType).toBeTruthy();
  });

  it('validates LLM JSON and returns compilable spec', async () => {
    vi.spyOn(deepseek, 'chatCompletion').mockResolvedValue(
      JSON.stringify({
        id: 'ai1',
        chartType: 'bar',
        title: '地区销售额',
        encode: { x: 'region', y: 'sales' },
        transform: [
          {
            op: 'aggregate',
            groupBy: ['region'],
            metrics: [{ field: 'sales', fn: 'sum', as: 'sales' }],
          },
        ],
        reason: 'test',
      }),
    );

    const result = await generateChartSpec({
      nl: '按地区对比销售额',
      data: sample,
      fallbackToRules: false,
      llm: { apiKey: 'test-key' },
    });
    expect(result.source).toBe('llm');
    expect(result.spec.chartType).toBe('bar');
  });
});
