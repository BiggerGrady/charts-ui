export type DataRow = Record<string, string | number | boolean | null | undefined>;

export type ChartType = 'line' | 'bar' | 'area' | 'pie' | 'scatter' | 'table';

export type FieldType = 'number' | 'string' | 'time' | 'boolean' | 'category';

export type FieldRoleHint = 'dimension' | 'measure' | 'unknown';

export interface FieldProfile {
  name: string;
  type: FieldType;
  cardinality: number;
  nullRate: number;
  roleHint: FieldRoleHint;
  sampleValues: Array<string | number | boolean | null>;
  min?: number;
  max?: number;
}

export interface DatasetSchema {
  rowCount: number;
  fields: FieldProfile[];
  sample: DataRow[];
}

export interface ChartEncode {
  x?: string;
  y?: string | string[];
  color?: string;
  category?: string;
  angle?: string;
  size?: string;
}

export type TransformOp =
  | {
      op: 'aggregate';
      groupBy: string[];
      metrics: Array<{ field: string; fn: 'sum' | 'avg' | 'count' | 'max' | 'min'; as?: string }>;
    }
  | { op: 'sort'; by: string; order: 'asc' | 'desc' }
  | { op: 'topN'; n: number; by: string };

export interface ChartStyle {
  theme?: 'light' | 'dark' | 'brand';
  stacked?: boolean;
  smooth?: boolean;
  showLegend?: boolean;
  orientation?: 'vertical' | 'horizontal';
}

export interface ChartSpec {
  id: string;
  title?: string;
  chartType: ChartType;
  encode: ChartEncode;
  transform?: TransformOp[];
  style?: ChartStyle;
  insight?: string;
  reason?: string;
}

export interface DashboardWidget {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  chart: ChartSpec;
}

export interface DashboardSpec {
  id: string;
  title: string;
  layout: 'grid';
  cols: number;
  widgets: DashboardWidget[];
  narrative?: string;
}

export type ThemeName = 'light' | 'dark' | 'brand';
