import * as echarts from 'echarts';
import type { ECharts, EChartsOption } from 'echarts';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type CSSProperties,
  type HTMLAttributes,
} from 'react';

export interface BaseChartProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  option?: EChartsOption;
  theme?: string | object;
  loading?: boolean;
  height?: number | string;
  width?: number | string;
  onReady?: (instance: ECharts) => void;
  onChartClick?: (params: unknown) => void;
}

export interface BaseChartRef {
  getEchartsInstance: () => ECharts | undefined;
  resize: () => void;
}

export const BaseChart = forwardRef<BaseChartRef, BaseChartProps>(function BaseChart(
  {
    option,
    theme,
    loading = false,
    height = 360,
    width = '100%',
    onReady,
    onChartClick,
    style,
    ...rest
  },
  ref,
) {
  const elRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ECharts>();

  useImperativeHandle(ref, () => ({
    getEchartsInstance: () => chartRef.current,
    resize: () => chartRef.current?.resize(),
  }));

  useEffect(() => {
    if (!elRef.current) return;
    const instance = echarts.init(elRef.current, theme);
    chartRef.current = instance;
    onReady?.(instance);

    const ro = new ResizeObserver(() => instance.resize());
    ro.observe(elRef.current);

    const onClick = (params: unknown) => onChartClick?.(params);
    instance.on('click', onClick);

    return () => {
      instance.off('click', onClick);
      ro.disconnect();
      instance.dispose();
      chartRef.current = undefined;
    };
    // theme remount intentionally
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  useEffect(() => {
    const instance = chartRef.current;
    if (!instance) return;
    if (loading || !option) {
      instance.showLoading('default', { text: 'Loading', maskColor: 'rgba(255,255,255,0.4)' });
      return;
    }
    instance.hideLoading();
    instance.setOption(option, { notMerge: true });
  }, [option, loading]);

  const mergedStyle: CSSProperties = {
    width,
    height,
    ...style,
  };

  return <div ref={elRef} style={mergedStyle} {...rest} />;
});
