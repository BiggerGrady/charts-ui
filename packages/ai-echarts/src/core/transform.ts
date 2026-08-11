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

type AggState = {
  dims: DataRow;
  count: number;
  metrics: Record<string, { fn: string; field: string; value: number }>;
};

export function applyTransforms(data: DataRow[], transforms: TransformOp[] = []): DataRow[] {
  let rows = data;

  for (const t of transforms) {
    if (t.op === 'aggregate') {
      const groups = new Map<string, AggState>();
      for (const row of rows) {
        const key = t.groupBy.map((g) => String(row[g] ?? '')).join('\u0001');
        let state = groups.get(key);
        if (!state) {
          const dims: DataRow = {};
          for (const g of t.groupBy) dims[g] = row[g];
          state = { dims, count: 0, metrics: {} };
          for (const m of t.metrics) {
            const k = metricKey(m.field, m.fn, m.as);
            state.metrics[k] = {
              fn: m.fn,
              field: m.field,
              value: m.fn === 'min' ? Number.POSITIVE_INFINITY : m.fn === 'max' ? Number.NEGATIVE_INFINITY : 0,
            };
          }
          groups.set(key, state);
        }
        state.count += 1;
        for (const m of t.metrics) {
          const k = metricKey(m.field, m.fn, m.as);
          const slot = state.metrics[k];
          const n = toNumber(row[m.field]);
          if (m.fn === 'sum' || m.fn === 'avg') slot.value += n;
          else if (m.fn === 'max') slot.value = Math.max(slot.value, n);
          else if (m.fn === 'min') slot.value = Math.min(slot.value, n);
          else if (m.fn === 'count') slot.value = state.count;
        }
      }
      rows = [...groups.values()].map((state) => {
        const out: DataRow = { ...state.dims };
        for (const [k, slot] of Object.entries(state.metrics)) {
          if (slot.fn === 'avg') out[k] = state.count ? slot.value / state.count : 0;
          else if (slot.fn === 'min' && slot.value === Number.POSITIVE_INFINITY) out[k] = 0;
          else if (slot.fn === 'max' && slot.value === Number.NEGATIVE_INFINITY) out[k] = 0;
          else if (slot.fn === 'count') out[k] = state.count;
          else out[k] = slot.value;
        }
        return out;
      });
    } else if (t.op === 'sort') {
      const dir = t.order === 'asc' ? 1 : -1;
      rows = [...rows].sort((a, b) => {
        const av = a[t.by];
        const bv = b[t.by];
        if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
        return String(av ?? '').localeCompare(String(bv ?? ''), undefined, { numeric: true }) * dir;
      });
    } else if (t.op === 'topN') {
      rows = [...rows]
        .sort((a, b) => toNumber(b[t.by]) - toNumber(a[t.by]))
        .slice(0, t.n);
    }
  }

  return rows;
}
