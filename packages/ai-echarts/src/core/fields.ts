import type { ChartSpec, DataRow } from './types';

export function yFields(spec: ChartSpec): string[] {
  const y = spec.encode.y;
  if (!y) return [];
  return Array.isArray(y) ? y : [y];
}

export function encodeFieldNames(spec: ChartSpec): string[] {
  return [
    spec.encode.x,
    spec.encode.category,
    spec.encode.angle,
    spec.encode.color,
    spec.encode.size,
    ...yFields(spec),
  ].filter((v): v is string => Boolean(v));
}

export function assertRawFieldsForTransforms(spec: ChartSpec, data: DataRow[]) {
  if (!data.length) return;
  const keys = new Set(Object.keys(data[0] ?? {}));
  const required = new Set<string>();

  for (const t of spec.transform ?? []) {
    if (t.op === 'aggregate') {
      t.groupBy.forEach((g) => required.add(g));
      t.metrics.forEach((m) => {
        if (m.fn !== 'count') required.add(m.field);
      });
    } else if (t.op === 'sort' || t.op === 'topN') {
      // sort/topN may target aggregated aliases; only require if present in raw
      if (keys.has(t.by)) required.add(t.by);
    }
  }

  // When no aggregate, encode fields must exist in raw data
  const hasAggregate = spec.transform?.some((t) => t.op === 'aggregate');
  if (!hasAggregate) {
    encodeFieldNames(spec).forEach((f) => required.add(f));
  }

  for (const name of required) {
    if (!keys.has(name)) {
      throw new Error(`Field "${name}" not found in data. Available: ${[...keys].join(', ')}`);
    }
  }
}

export function assertEncodedFieldsExist(spec: ChartSpec, rows: DataRow[]) {
  if (spec.chartType === 'table') return;
  if (!rows.length) {
    throw new Error('No rows available after transforms');
  }
  const keys = new Set(Object.keys(rows[0] ?? {}));
  for (const name of encodeFieldNames(spec)) {
    if (!keys.has(name)) {
      throw new Error(
        `Encoded field "${name}" missing after transforms. Available: ${[...keys].join(', ')}`,
      );
    }
  }
}
