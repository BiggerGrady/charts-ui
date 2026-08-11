import type { DataRow, DatasetSchema, FieldProfile, FieldRoleHint, FieldType } from './types';

const TIME_RE =
  /^\d{4}[-/]\d{1,2}([-/.]\d{1,2})?([ T]\d{2}:\d{2}(:\d{2})?)?$/;

function isNullish(v: unknown): boolean {
  return v === null || v === undefined || v === '';
}

function inferType(values: unknown[]): FieldType {
  const nonNull = values.filter((v) => !isNullish(v));
  if (nonNull.length === 0) return 'string';

  const boolCount = nonNull.filter((v) => typeof v === 'boolean' || v === 'true' || v === 'false').length;
  if (boolCount / nonNull.length > 0.9) return 'boolean';

  const numCount = nonNull.filter((v) => typeof v === 'number' || (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v)))).length;
  if (numCount / nonNull.length > 0.9) return 'number';

  const timeCount = nonNull.filter((v) => typeof v === 'string' && TIME_RE.test(v.trim())).length;
  if (timeCount / nonNull.length > 0.7) return 'time';

  const uniq = new Set(nonNull.map(String));
  if (uniq.size > 0 && uniq.size <= Math.min(20, Math.ceil(nonNull.length * 0.5))) {
    return 'category';
  }
  return 'string';
}

function roleHint(type: FieldType, cardinality: number, rowCount: number): FieldRoleHint {
  if (type === 'number') return 'measure';
  if (type === 'time' || type === 'category' || type === 'boolean') return 'dimension';
  if (type === 'string' && cardinality > 0 && cardinality <= Math.min(30, Math.max(3, rowCount * 0.3))) {
    return 'dimension';
  }
  return 'unknown';
}

export function profileData(data: DataRow[], sampleSize = 5): DatasetSchema {
  const rows = Array.isArray(data) ? data : [];
  const fieldNames = new Set<string>();
  for (const row of rows) {
    Object.keys(row ?? {}).forEach((k) => fieldNames.add(k));
  }

  const fields: FieldProfile[] = [...fieldNames].map((name) => {
    const values = rows.map((r) => r?.[name]);
    const nonNull = values.filter((v) => !isNullish(v));
    const type = inferType(values);
    const cardinality = new Set(nonNull.map(String)).size;
    const nullRate = rows.length === 0 ? 0 : (rows.length - nonNull.length) / rows.length;
    const nums = nonNull
      .map((v) => (typeof v === 'number' ? v : Number(v)))
      .filter((n) => !Number.isNaN(n));

    return {
      name,
      type,
      cardinality,
      nullRate,
      roleHint: roleHint(type, cardinality, rows.length),
      sampleValues: nonNull.slice(0, 3) as Array<string | number | boolean | null>,
      ...(type === 'number' && nums.length
        ? { min: Math.min(...nums), max: Math.max(...nums) }
        : {}),
    };
  });

  return {
    rowCount: rows.length,
    fields,
    sample: rows.slice(0, sampleSize),
  };
}

export function compactSchemaForPrompt(schema: DatasetSchema) {
  return {
    rowCount: schema.rowCount,
    fields: schema.fields.map((f) => ({
      name: f.name,
      type: f.type,
      cardinality: f.cardinality,
      roleHint: f.roleHint,
      min: f.min,
      max: f.max,
    })),
    sample: schema.sample,
  };
}
