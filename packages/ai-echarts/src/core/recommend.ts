import { profileData } from './profile';
import type { ChartSpec, ChartType, DataRow, DatasetSchema } from './types';

function uid(prefix = 'chart') {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function pickMeasure(schema: DatasetSchema) {
  return schema.fields.find((f) => f.roleHint === 'measure') ?? schema.fields.find((f) => f.type === 'number');
}

function pickTime(schema: DatasetSchema) {
  return schema.fields.find((f) => f.type === 'time');
}

function pickCategory(schema: DatasetSchema) {
  return (
    schema.fields.find((f) => f.type === 'category' && f.cardinality <= 30) ??
    schema.fields.find((f) => f.roleHint === 'dimension' && f.type !== 'time' && f.cardinality <= 30)
  );
}

export function recommendByRules(dataOrSchema: DataRow[] | DatasetSchema, limit = 3): ChartSpec[] {
  const schema = Array.isArray(dataOrSchema) ? profileData(dataOrSchema) : dataOrSchema;
  const measure = pickMeasure(schema);
  const time = pickTime(schema);
  const category = pickCategory(schema);
  const numericFields = schema.fields.filter((f) => f.type === 'number');

  const out: ChartSpec[] = [];

  if (time && measure) {
    out.push({
      id: uid('line'),
      title: `${measure.name} trend`,
      chartType: 'line',
      encode: { x: time.name, y: measure.name },
      style: { smooth: true, showLegend: true },
      reason: 'time + measure → line',
    });
  }

  if (category && measure) {
    out.push({
      id: uid('bar'),
      title: `${measure.name} by ${category.name}`,
      chartType: 'bar',
      encode: { x: category.name, y: measure.name },
      transform:
        schema.rowCount > category.cardinality
          ? [
              {
                op: 'aggregate',
                groupBy: [category.name],
                metrics: [{ field: measure.name, fn: 'sum', as: measure.name }],
              },
              { op: 'sort', by: measure.name, order: 'desc' },
            ]
          : undefined,
      reason: 'category + measure → bar',
    });

    if (category.cardinality <= 8) {
      out.push({
        id: uid('pie'),
        title: `${measure.name} share by ${category.name}`,
        chartType: 'pie',
        encode: { category: category.name, angle: measure.name },
        transform:
          schema.rowCount > category.cardinality
            ? [
                {
                  op: 'aggregate',
                  groupBy: [category.name],
                  metrics: [{ field: measure.name, fn: 'sum', as: measure.name }],
                },
              ]
            : undefined,
        reason: 'low-cardinality category → pie',
      });
    }
  }

  if (numericFields.length >= 2) {
    out.push({
      id: uid('scatter'),
      title: `${numericFields[0].name} vs ${numericFields[1].name}`,
      chartType: 'scatter',
      encode: { x: numericFields[0].name, y: numericFields[1].name },
      reason: 'two numerics → scatter',
    });
  }

  if (out.length === 0) {
    out.push({
      id: uid('table'),
      title: 'Data table',
      chartType: 'table',
      encode: {},
      reason: 'fallback table',
    });
  }

  return out.slice(0, limit);
}

export function recommendChartType(schema: DatasetSchema): ChartType {
  return recommendByRules(schema, 1)[0]?.chartType ?? 'table';
}
