import type { EChartsOption } from 'echarts';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type CSSProperties,
  type HTMLAttributes,
} from 'react';
import { ensureEcharts, type ECharts } from '../core/echarts-setup';

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
  const onReadyRef = useRef(onReady);
  const onClickRef = useRef(onChartClick);
  onReadyRef.current = onReady;
  onClickRef.current = onChartClick;

  useImperativeHandle(ref, () => ({
    getEchartsInstance: () => chartRef.current,
    resize: () => chartRef.current?.resize(),
  }));

  useEffect(() => {
    if (!elRef.current) return;
    const echarts = ensureEcharts();
    const instance = echarts.init(elRef.current, theme);
    chartRef.current = instance;
    onReadyRef.current?.(instance);

    const ro = new ResizeObserver(() => instance.resize());
    ro.observe(elRef.current);

    const onClick = (params: unknown) => onClickRef.current?.(params);
    instance.on('click', onClick);

    return () => {
      instance.off('click', onClick);
      ro.disconnect();
      instance.dispose();
      chartRef.current = undefined;
    };
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
