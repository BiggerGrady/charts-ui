import { describe, expect, it } from 'vitest';
import { compile } from './compile';
import { profileData } from './profile';
import { recommendByRules } from './recommend';
import { formatLocalDateTime } from './time';
import type { DataRow } from './types';

const tsRows: DataRow[] = [
  { ts_ms: 1786092034385, v: 0.0 },
  { ts_ms: 1786092036408, v: 0.1 },
  { ts_ms: 1786092038432, v: 0.2 },
  { ts_ms: 1786092040448, v: 0.0 },
  { ts_ms: 1786092042469, v: 0.3 },
];

describe('epoch timestamp profiling', () => {
  it('detects ts_ms as time/ms dimension', () => {
    const schema = profileData(tsRows);
    const ts = schema.fields.find((f) => f.name === 'ts_ms');
    const v = schema.fields.find((f) => f.name === 'v');
    expect(ts?.type).toBe('time');
    expect(ts?.timeUnit).toBe('ms');
    expect(ts?.roleHint).toBe('dimension');
    expect(v?.type).toBe('number');
    expect(v?.roleHint).toBe('measure');
  });
});

describe('local timezone line chart', () => {
  it('recommends time-axis line for NL about local timezone', () => {
    const specs = recommendByRules(
      tsRows,
      1,
      '根据对应时间戳的数据，横坐标展示为当前时区时间，做折线图',
    );
    expect(specs[0].chartType).toBe('line');
    expect(specs[0].encode.x).toBe('ts_ms');
    expect(specs[0].encode.y).toBe('v');
    expect(specs[0].style?.xAxisType).toBe('time');
    expect(specs[0].style?.timeZone).toBe('local');
  });

  it('compiles time axis with local labels instead of raw epoch strings', () => {
    const option = compile(
      {
        id: 't1',
        chartType: 'line',
        encode: { x: 'ts_ms', y: 'v' },
        style: { xAxisType: 'time', timeZone: 'local', smooth: true },
      },
      tsRows,
    );
    expect(option.xAxis).toMatchObject({ type: 'time' });
    const series = option.series as Array<{ data: Array<[number, number]> }>;
    expect(series[0].data[0][0]).toBe(1786092034385);
    expect(series[0].data[0][1]).toBe(0);
    const axis = option.xAxis as { axisLabel?: { formatter?: (v: number) => string } };
    const label = axis.axisLabel?.formatter?.(1786092034385);
    expect(label).toBeTruthy();
    expect(label).not.toContain('1786092034385');
    expect(label).toBe(formatLocalDateTime(1786092034385, 'local'));
  });
});
