import { profileData } from './profile';
import type { ChartSpec, ChartType, DataRow, DatasetSchema } from './types';

function uid(prefix = 'chart') {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function pickMeasure(schema: DatasetSchema) {
  return (
    schema.fields.find((f) => f.roleHint === 'measure' && f.type === 'number') ??
    schema.fields.find((f) => f.type === 'number')
  );
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

export function wantsLocalTimeAxis(nl?: string): boolean {
  if (!nl) return false;
  return /时区|本地时间|当前时间|时间戳|timestamp|local\s*time|timezone|时间轴|横坐标.*时间|时间.*横|折线/.test(
    nl,
  );
}

function intentBoost(nl: string | undefined, chartType: ChartType): number {
  if (!nl) return 0;
  const t = nl.toLowerCase();
  const has = (...words: string[]) => words.some((w) => t.includes(w));
  if (chartType === 'bar' && has('柱', '条形', '对比', '比较', '排行', 'bar', 'compare', 'rank')) return 3;
  if (
    chartType === 'line' &&
    has('趋势', '折线', '走势', '随时间', '时间戳', '时区', '时间轴', 'line', 'trend', 'over time', 'timestamp')
  ) {
    return 4;
  }
  if (chartType === 'area' && has('面积', 'area')) return 3;
  if (chartType === 'pie' && has('饼', '占比', '构成', '份额', 'pie', 'share', '比例')) return 3;
  if (chartType === 'scatter' && has('散点', '相关', 'scatter', 'correlation')) return 3;
  if (chartType === 'table' && has('表', '明细', 'table')) return 2;
  return 0;
}

/** Ensure timestamp + local-time intents become line charts with time axis */
export function applyTimeDisplayIntent(
  spec: ChartSpec,
  schema: DatasetSchema,
  nl?: string,
): ChartSpec {
  const timeField = pickTime(schema);
  const measure = pickMeasure(schema);
  if (!timeField || !measure) return spec;

  const wantsTime = wantsLocalTimeAxis(nl) || Boolean(timeField.timeUnit);
  if (!wantsTime) return spec;

  const xIsTime = spec.encode.x === timeField.name;
  const needsFix =
    !xIsTime ||
    spec.chartType === 'table' ||
    spec.chartType === 'pie' ||
    spec.style?.xAxisType !== 'time';

  if (!needsFix && spec.style?.timeZone === 'local') return spec;

  return {
    ...spec,
    chartType: spec.chartType === 'area' || spec.chartType === 'bar' ? spec.chartType : 'line',
    encode: {
      ...spec.encode,
      x: timeField.name,
      y: Array.isArray(spec.encode.y) ? spec.encode.y : spec.encode.y ?? measure.name,
    },
    style: {
      ...spec.style,
      smooth: spec.style?.smooth ?? true,
      xAxisType: 'time',
      timeZone: spec.style?.timeZone ?? 'local',
    },
    insight: spec.insight ?? '横轴按当前时区显示时间戳',
    reason: spec.reason ?? 'timestamp field + local time display intent',
  };
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
  const localTime = wantsLocalTimeAxis(nl);

  const out: Array<ChartSpec & { _score?: number }> = [];

  if (time && measure) {
    out.push({
      id: uid('line'),
      title: titleFor(lang, 'trend', measure.name),
      chartType: 'line',
      encode: { x: time.name, y: measure.name },
      style: {
        smooth: true,
        showLegend: true,
        ...(time.timeUnit || localTime ? { xAxisType: 'time' as const, timeZone: 'local' as const } : {}),
      },
      reason: 'time + measure → line',
      insight: localTime || time.timeUnit ? '横轴按当前时区格式化时间戳' : undefined,
      _score: 2 + intentBoost(nl, 'line') + (localTime ? 2 : 0) + (time.timeUnit ? 1 : 0),
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
    // Avoid recommending scatter of ts_ms vs v when ts is time
    const nums = numericFields.filter((f) => f.type === 'number');
    if (nums.length >= 2) {
      out.push({
        id: uid('scatter'),
        title: titleFor(lang, 'scatter', nums[0].name, nums[1].name),
        chartType: 'scatter',
        encode: { x: nums[0].name, y: nums[1].name },
        reason: 'two numerics → scatter',
        _score: 1 + intentBoost(nl, 'scatter'),
      });
    }
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
    .map(({ _score, ...spec }) => applyTimeDisplayIntent(spec, schema, nl));
}

export function recommendChartType(schema: DatasetSchema, nl?: string): ChartType {
  return recommendByRules(schema, 1, nl)[0]?.chartType ?? 'table';
}
