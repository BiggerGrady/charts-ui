import { forwardRef, useEffect, useMemo } from 'react';
import { applyTransforms } from '../core/transform';
import { extractTablePayload, safeCompile } from '../core/compile';
import type { ChartSpec, DataRow, ThemeName } from '../core/types';
import { AiTable } from './AiTable';
import { BaseChart, type BaseChartProps, type BaseChartRef } from './BaseChart';

export interface AiChartProps extends Omit<BaseChartProps, 'option'> {
  spec: ChartSpec;
  data: DataRow[];
  theme?: ThemeName;
  onSpecInvalid?: (message: string) => void;
}

export type AiChartRef = BaseChartRef;

export const AiChart = forwardRef<AiChartRef, AiChartProps>(function AiChart(
  {
    spec,
    data,
    theme = 'light',
    onSpecInvalid,
    onReady,
    onChartClick,
    loading,
    height = 360,
    width = '100%',
    className,
    style,
    ...rest
  },
  ref,
) {
  const compiled = useMemo(() => safeCompile(spec, data, { theme }), [spec, data, theme]);

  useEffect(() => {
    if (!compiled.ok) onSpecInvalid?.(compiled.error);
  }, [compiled, onSpecInvalid]);

  if (spec.chartType === 'table' || (!compiled.ok && extractTablePayload(compiled.option))) {
    const table =
      compiled.table ??
      extractTablePayload(compiled.option) ?? {
        rows: applyTransforms(data, spec.transform ?? []),
        columns: undefined,
      };
    return (
      <div className={className} style={style} {...rest}>
        <AiTable rows={table.rows} columns={table.columns} style={{ height, width }} />
      </div>
    );
  }

  return (
    <BaseChart
      ref={ref}
      option={compiled.option}
      theme={theme}
      loading={loading}
      height={height}
      width={width}
      className={className}
      style={style}
      onReady={onReady}
      onChartClick={onChartClick}
      {...rest}
    />
  );
});
