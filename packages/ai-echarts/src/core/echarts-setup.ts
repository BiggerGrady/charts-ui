import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart, ScatterChart } from 'echarts/charts';
import {
  DatasetComponent,
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
  GraphicComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { ECharts, EChartsCoreOption } from 'echarts/core';

let registered = false;

export function ensureEcharts(): typeof echarts {
  if (!registered) {
    echarts.use([
      BarChart,
      LineChart,
      PieChart,
      ScatterChart,
      GridComponent,
      TooltipComponent,
      LegendComponent,
      TitleComponent,
      DatasetComponent,
      GraphicComponent,
      CanvasRenderer,
    ]);
    registered = true;
  }
  return echarts;
}

export type { ECharts, EChartsCoreOption };
