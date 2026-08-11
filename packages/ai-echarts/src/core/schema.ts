import { z } from 'zod';

export const chartTypeSchema = z.enum(['line', 'bar', 'area', 'pie', 'scatter', 'table']);

export const chartEncodeSchema = z.object({
  x: z.string().optional(),
  y: z.union([z.string(), z.array(z.string())]).optional(),
  color: z.string().optional(),
  category: z.string().optional(),
  angle: z.string().optional(),
  size: z.string().optional(),
});

export const transformOpSchema = z.discriminatedUnion('op', [
  z.object({
    op: z.literal('aggregate'),
    groupBy: z.array(z.string()),
    metrics: z.array(
      z.object({
        field: z.string(),
        fn: z.enum(['sum', 'avg', 'count', 'max', 'min']),
        as: z.string().optional(),
      }),
    ),
  }),
  z.object({
    op: z.literal('sort'),
    by: z.string(),
    order: z.enum(['asc', 'desc']),
  }),
  z.object({
    op: z.literal('topN'),
    n: z.number().int().positive(),
    by: z.string(),
  }),
]);

export const chartStyleSchema = z.object({
  theme: z.enum(['light', 'dark', 'brand']).optional(),
  stacked: z.boolean().optional(),
  smooth: z.boolean().optional(),
  showLegend: z.boolean().optional(),
  orientation: z.enum(['vertical', 'horizontal']).optional(),
});

export const chartSpecSchema = z.object({
  id: z.string().min(1),
  title: z.string().optional(),
  chartType: chartTypeSchema,
  encode: chartEncodeSchema,
  transform: z.array(transformOpSchema).optional(),
  style: chartStyleSchema.optional(),
  insight: z.string().optional(),
  reason: z.string().optional(),
});

export const dashboardWidgetSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  chart: chartSpecSchema,
});

export const dashboardSpecSchema = z.object({
  id: z.string(),
  title: z.string(),
  layout: z.literal('grid'),
  cols: z.number().int().positive(),
  widgets: z.array(dashboardWidgetSchema),
  narrative: z.string().optional(),
});

export type ChartSpecInput = z.input<typeof chartSpecSchema>;
export type DashboardSpecInput = z.input<typeof dashboardSpecSchema>;
