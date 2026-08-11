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
    schema.fields.find((f) => f.roleHint === 'dimension' && f.type !== 'time' && f.cardinality <= 30) ??
    schema.fields.find((f) => f.type === 'string' && f.cardinality > 1 && f.cardinality <= 30)
  );
}

function detectLang(text?: string): 'zh' | 'en' {
  if (!text) return 'en';
  return /[\u4e00-\u9fff]/.test(text) ? 'zh' : 'en';
}

function titleFor(
  lang: 'zh' | 'en',
  kind: 'trend' | 'compare' | 'share' | 'scatter' | 'table',
  measure?: string,
  dim?: string,
) {
  if (lang === 'zh') {
    if (kind === 'trend') return `${measure ?? '指标'}趋势`;
    if (kind === 'compare') return `按${dim ?? '维度'}对比${measure ?? '指标'}`;
    if (kind === 'share') return `${dim ?? '维度'}的${measure ?? '指标'}构成`;
    if (kind === 'scatter') return `${measure ?? 'X'} vs ${dim ?? 'Y'}`;
    return '数据表';
  }
  if (kind === 'trend') return `${measure ?? 'metric'} trend`;
  if (kind === 'compare') return `${measure ?? 'metric'} by ${dim ?? 'dimension'}`;
  if (kind === 'share') return `${measure ?? 'metric'} share by ${dim ?? 'dimension'}`;
  if (kind === 'scatter') return `${measure ?? 'x'} vs ${dim ?? 'y'}`;
  return 'Data table';
}

function intentBoost(nl: string | undefined, chartType: ChartType): number {
  if (!nl) return 0;
  const t = nl.toLowerCase();
  const has = (...words: string[]) => words.some((w) => t.includes(w));
  if (chartType === 'bar' && has('柱', '条形', '对比', '比较', '排行', 'bar', 'compare', 'rank')) return 3;
  if (chartType === 'line' && has('趋势', '折线', '走势', '随时间', 'line', 'trend', 'over time')) return 3;
  if (chartType === 'area' && has('面积', 'area')) return 3;
  if (chartType === 'pie' && has('饼', '占比', '构成', '份额', 'pie', 'share', '比例')) return 3;
  if (chartType === 'scatter' && has('散点', '相关', 'scatter', 'correlation')) return 3;
  if (chartType === 'table' && has('表', '明细', 'table')) return 2;
  return 0;
}

export function recommendByRules(
  dataOrSchema: DataRow[] | DatasetSchema,
  limit = 3,
  nl?: string,
): ChartSpec[] {
  const schema = Array.isArray(dataOrSchema) ? profileData(dataOrSchema) : dataOrSchema;
  const lang = detectLang(nl);
  const measure = pickMeasure(schema);
  const time = pickTime(schema);
  const category = pickCategory(schema);
  const numericFields = schema.fields.filter((f) => f.type === 'number');

  const out: Array<ChartSpec & { _score?: number }> = [];

  if (time && measure) {
    out.push({
      id: uid('line'),
      title: titleFor(lang, 'trend', measure.name),
      chartType: 'line',
      encode: { x: time.name, y: measure.name },
      style: { smooth: true, showLegend: true },
      reason: 'time + measure → line',
      _score: 2 + intentBoost(nl, 'line'),
    });
  }

  if (category && measure) {
    out.push({
      id: uid('bar'),
      title: titleFor(lang, 'compare', measure.name, category.name),
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
      _score: 2 + intentBoost(nl, 'bar'),
    });

    if (category.cardinality <= 8) {
      out.push({
        id: uid('pie'),
        title: titleFor(lang, 'share', measure.name, category.name),
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
        _score: 1 + intentBoost(nl, 'pie'),
      });
    }
  }

  if (numericFields.length >= 2) {
    out.push({
      id: uid('scatter'),
      title: titleFor(lang, 'scatter', numericFields[0].name, numericFields[1].name),
      chartType: 'scatter',
      encode: { x: numericFields[0].name, y: numericFields[1].name },
      reason: 'two numerics → scatter',
      _score: 1 + intentBoost(nl, 'scatter'),
    });
  }

  if (out.length === 0) {
    out.push({
      id: uid('table'),
      title: titleFor(lang, 'table'),
      chartType: 'table',
      encode: {},
      reason: 'fallback table',
      _score: 0 + intentBoost(nl, 'table'),
    });
  }

  return out
    .sort((a, b) => (b._score ?? 0) - (a._score ?? 0))
    .slice(0, limit)
    .map(({ _score, ...spec }) => spec);
}

export function recommendChartType(schema: DatasetSchema, nl?: string): ChartType {
  return recommendByRules(schema, 1, nl)[0]?.chartType ?? 'table';
}
