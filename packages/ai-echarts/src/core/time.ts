/** Epoch / datetime helpers for ChartSpec compile + profiling */

const NAME_HINT =
  /(^|_)(ts|time|timestamp|datetime|date)(_|$)|_ms$|_sec$|_secs$|_seconds$/i;

export type TimeUnit = 'ms' | 's' | 'iso';

export function toNumberMaybe(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Roughly 2001-09 → 2286 in unix ms */
export function isEpochMs(n: number): boolean {
  return n >= 1e12 && n < 1e15;
}

/** Roughly 2001-09 → 2286 in unix seconds */
export function isEpochSeconds(n: number): boolean {
  return n >= 1e9 && n < 1e11;
}

export function looksLikeTimeFieldName(name: string): boolean {
  return NAME_HINT.test(name);
}

export function detectEpochUnit(values: unknown[], fieldName?: string): TimeUnit | null {
  const nums = values.map(toNumberMaybe).filter((n): n is number => n !== null);
  if (nums.length === 0) return null;

  const msHits = nums.filter(isEpochMs).length;
  const sHits = nums.filter(isEpochSeconds).length;
  const ratioMs = msHits / nums.length;
  const ratioS = sHits / nums.length;
  const nameHint = fieldName ? looksLikeTimeFieldName(fieldName) : false;

  if (ratioMs >= 0.8 || (nameHint && ratioMs >= 0.5)) return 'ms';
  if (ratioS >= 0.8 || (nameHint && ratioS >= 0.5)) return 's';
  // name like ts_ms but values slightly outside band — still treat as ms if mostly large ints
  if (nameHint && /_ms$/i.test(fieldName!) && nums.every((n) => n > 1e11)) return 'ms';
  return null;
}

export function toEpochMs(value: unknown, unit?: TimeUnit | null): number | null {
  if (typeof value === 'string' && value.trim() && Number.isNaN(Number(value))) {
    const t = Date.parse(value);
    return Number.isNaN(t) ? null : t;
  }
  const n = toNumberMaybe(value);
  if (n === null) return null;
  if (unit === 's' || (!unit && isEpochSeconds(n))) return Math.round(n * 1000);
  return Math.round(n);
}

export function formatLocalDateTime(ms: number, timeZone: 'local' | 'utc' = 'local'): string {
  const d = new Date(ms);
  const opts: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  };
  if (timeZone === 'utc') opts.timeZone = 'UTC';
  // local: omit timeZone so runtime uses current timezone
  return new Intl.DateTimeFormat(undefined, opts).format(d);
}

export function detectAxisTimeUnit(rows: Array<Record<string, unknown>>, field: string): TimeUnit | null {
  const values = rows.map((r) => r[field]);
  const fromValues = detectEpochUnit(values, field);
  if (fromValues) return fromValues;
  // ISO strings
  const nonNull = values.filter((v) => v !== null && v !== undefined && v !== '');
  if (
    nonNull.length &&
    nonNull.every((v) => typeof v === 'string' && !Number.isNaN(Date.parse(v)))
  ) {
    return 'iso';
  }
  return null;
}
