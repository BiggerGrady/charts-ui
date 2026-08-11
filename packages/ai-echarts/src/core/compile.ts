import type { EChartsOption } from 'echarts';
import { assertEncodedFieldsExist, assertRawFieldsForTransforms, yFields } from './fields';
import { chartSpecSchema } from './schema';
import { applyTransforms } from './transform';
import { getThemeTokens } from './theme';
import type { ChartSpec, DataRow, ThemeName } from './types';

export interface CompileOptions {
  theme?: ThemeName;
}

export interface TablePayload {
  rows: DataRow[];
  columns: string[];
}

function baseOption(title: string | undefined, theme: ThemeName): EChartsOption {
  const t = getThemeTokens(theme);
  return {
    backgroundColor: t.background,
    color: t.colors,
    title: title
      ? {
          text: title,
          left: 'left',
          textStyle: { color: t.text, fontSize: 14, fontWeight: 600 },
        }
      : undefined,
    tooltip: { trigger: 'axis' },
    legend: { type: 'scroll', textStyle: { color: t.text } },
    grid: { left: 48, right: 24, top: title ? 56 : 32, bottom: 40, containLabel: true },
    textStyle: { color: t.text },
  };
}

export function extractTablePayload(option: EChartsOption): TablePayload | null {
  const marker = (option as { __aiEchartsTable?: TablePayload }).__aiEchartsTable;
  return marker ?? null;
}

export function compile(specInput: ChartSpec, data: DataRow[], options: CompileOptions = {}): EChartsOption {
  const spec = chartSpecSchema.parse(specInput) as ChartSpec;
  assertRawFieldsForTransforms(spec, data);
  const rows = applyTransforms(data, spec.transform ?? []);
  assertEncodedFieldsExist(spec, rows);

  const theme = options.theme ?? spec.style?.theme ?? 'light';
  const tokens = getThemeTokens(theme);
  const option = baseOption(spec.title, theme);

  if (spec.chartType === 'table') {
    const payload: TablePayload = {
      rows,
      columns: rows[0] ? Object.keys(rows[0]) : [],
    };
    return {
      ...option,
      title: { text: spec.title ?? 'Table', textStyle: { color: tokens.text } },
      graphic: {
        type: 'text',
        left: 'center',
        top: 'middle',
        style: {
          text: `Table · ${rows.length} rows · render with host table UI`,
          fill: tokens.axis,
          align: 'center',
          fontSize: 13,
        },
      },
      ...( { __aiEchartsTable: payload } as object ),
    } as EChartsOption;
  }

  if (spec.chartType === 'pie') {
    const cat = spec.encode.category ?? spec.encode.x;
    const angle = spec.encode.angle ?? yFields(spec)[0];
    if (!cat || !angle) throw new Error('pie chart requires encode.category (or x) and encode.angle (or y)');
    option.tooltip = { trigger: 'item' };
    option.series = [
      {
        type: 'pie',
        radius: ['35%', '65%'],
        data: rows.map((r) => ({ name: String(r[cat] ?? ''), value: Number(r[angle] ?? 0) })),
        emphasis: { itemStyle: { shadowBlur: 8, shadowColor: 'rgba(0,0,0,0.2)' } },
      },
    ];
    return option;
  }

  if (spec.chartType === 'scatter') {
    const x = spec.encode.x;
    const y = yFields(spec)[0];
    if (!x || !y) throw new Error('scatter requires encode.x and encode.y');
    option.xAxis = {
      type: 'value',
      name: x,
      axisLabel: { color: tokens.axis },
      splitLine: { lineStyle: { color: tokens.split } },
    };
    option.yAxis = {
      type: 'value',
      name: y,
      axisLabel: { color: tokens.axis },
      splitLine: { lineStyle: { color: tokens.split } },
    };
    option.series = [
      {
        type: 'scatter',
        symbolSize: 10,
        data: rows.map((r) => [Number(r[x] ?? 0), Number(r[y] ?? 0)]),
      },
    ];
    return option;
  }

  const x = spec.encode.x;
  const ys = yFields(spec);
  if (!x || ys.length === 0) {
    throw new Error(`${spec.chartType} requires encode.x and encode.y`);
  }

  const categories = rows.map((r) => String(r[x] ?? ''));
  const horizontal = spec.style?.orientation === 'horizontal' && spec.chartType === 'bar';

  if (horizontal) {
    option.yAxis = { type: 'category', data: categories, axisLabel: { color: tokens.axis } };
    option.xAxis = {
      type: 'value',
      axisLabel: { color: tokens.axis },
      splitLine: { lineStyle: { color: tokens.split } },
    };
  } else {
    option.xAxis = { type: 'category', data: categories, axisLabel: { color: tokens.axis } };
    option.yAxis = {
      type: 'value',
      axisLabel: { color: tokens.axis },
      splitLine: { lineStyle: { color: tokens.split } },
    };
  }

  option.series = ys.map((field) => {
    const values = rows.map((r) => Number(r[field] ?? 0));
    if (spec.chartType === 'bar') {
      return {
        name: field,
        type: 'bar' as const,
        data: values,
        stack: spec.style?.stacked ? 'total' : undefined,
      };
    }
    if (spec.chartType === 'area') {
      return {
        name: field,
        type: 'line' as const,
        data: values,
        smooth: spec.style?.smooth ?? true,
        areaStyle: {},
        stack: spec.style?.stacked ? 'total' : undefined,
      };
    }
    return {
      name: field,
      type: 'line' as const,
      data: values,
      smooth: spec.style?.smooth ?? false,
    };
  });

  if (spec.style?.showLegend === false) {
    option.legend = { show: false };
  }

  return option;
}

export function safeCompile(spec: ChartSpec, data: DataRow[], options?: CompileOptions) {
  try {
    return { ok: true as const, option: compile(spec, data, options), table: null as TablePayload | null };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const option = compile(
      {
        id: 'fallback_table',
        title: spec.title ?? 'Fallback table',
        chartType: 'table',
        encode: {},
        insight: message,
      },
      data,
      options,
    );
    return {
      ok: false as const,
      error: message,
      option,
      table: extractTablePayload(option),
    };
  }
}
