import type { ECharts } from 'echarts';
import { forwardRef, useEffect, useMemo } from 'react';
import { safeCompile } from '../core/compile';
import type { ChartSpec, DataRow, ThemeName } from '../core/types';
import { BaseChart, type BaseChartProps, type BaseChartRef } from './BaseChart';

export interface AiChartProps extends Omit<BaseChartProps, 'option'> {
  spec: ChartSpec;
  data: DataRow[];
  theme?: ThemeName;
  onSpecInvalid?: (message: string) => void;
}

export type AiChartRef = BaseChartRef;

export const AiChart = forwardRef<AiChartRef, AiChartProps>(function AiChart(
  { spec, data, theme = 'light', onSpecInvalid, onReady, ...rest },
  ref,
) {
  const compiled = useMemo(() => safeCompile(spec, data, { theme }), [spec, data, theme]);

  useEffect(() => {
    if (!compiled.ok) onSpecInvalid?.(compiled.error);
  }, [compiled, onSpecInvalid]);

  return (
    <BaseChart
      ref={ref}
      option={compiled.option}
      onReady={(instance: ECharts) => onReady?.(instance)}
      {...rest}
    />
  );
});
