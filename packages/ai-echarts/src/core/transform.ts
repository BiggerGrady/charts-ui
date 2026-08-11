import type { DataRow, TransformOp } from './types';

function toNumber(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
}

function metricKey(field: string, fn: string, as?: string) {
  return as ?? `${fn}_${field}`;
}

export function applyTransforms(data: DataRow[], transforms: TransformOp[] = []): DataRow[] {
  let rows = [...data];

  for (const t of transforms) {
    if (t.op === 'aggregate') {
      const groups = new Map<string, DataRow[]>();
      for (const row of rows) {
        const key = t.groupBy.map((g) => String(row[g] ?? '')).join('||');
        const list = groups.get(key) ?? [];
        list.push(row);
        groups.set(key, list);
      }
      rows = [...groups.entries()].map(([, groupRows]) => {
        const out: DataRow = {};
        for (const g of t.groupBy) out[g] = groupRows[0]?.[g];
        for (const m of t.metrics) {
          const key = metricKey(m.field, m.fn, m.as);
          const vals = groupRows.map((r) => toNumber(r[m.field]));
          if (m.fn === 'sum') out[key] = vals.reduce((a, b) => a + b, 0);
          else if (m.fn === 'avg') out[key] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
          else if (m.fn === 'count') out[key] = groupRows.length;
          else if (m.fn === 'max') out[key] = vals.length ? Math.max(...vals) : 0;
          else if (m.fn === 'min') out[key] = vals.length ? Math.min(...vals) : 0;
        }
        return out;
      });
    } else if (t.op === 'sort') {
      const dir = t.order === 'asc' ? 1 : -1;
      rows = [...rows].sort((a, b) => {
        const av = a[t.by];
        const bv = b[t.by];
        if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
        return String(av ?? '').localeCompare(String(bv ?? '')) * dir;
      });
    } else if (t.op === 'topN') {
      rows = [...rows]
        .sort((a, b) => toNumber(b[t.by]) - toNumber(a[t.by]))
        .slice(0, t.n);
    }
  }

  return rows;
}
