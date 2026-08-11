import * as echarts from 'echarts';
import type { ECharts, EChartsOption } from 'echarts';
import { defineComponent, onBeforeUnmount, onMounted, ref, watch, h, type PropType } from 'vue';

export const BaseChart = defineComponent({
  name: 'BaseChart',
  props: {
    option: { type: Object as PropType<EChartsOption>, default: undefined },
    theme: { type: [String, Object] as PropType<string | object>, default: undefined },
    loading: { type: Boolean, default: false },
    height: { type: [Number, String] as PropType<number | string>, default: 360 },
    width: { type: [Number, String] as PropType<number | string>, default: '100%' },
  },
  emits: ['ready', 'chart-click'],
  setup(props, { emit, expose }) {
    const elRef = ref<HTMLDivElement | null>(null);
    let chart: ECharts | undefined;
    let ro: ResizeObserver | undefined;

    const resize = () => chart?.resize();
    const getEchartsInstance = () => chart;

    onMounted(() => {
      if (!elRef.value) return;
      chart = echarts.init(elRef.value, props.theme as string | object | undefined);
      emit('ready', chart);
      ro = new ResizeObserver(() => chart?.resize());
      ro.observe(elRef.value);
      chart.on('click', (params) => emit('chart-click', params));
      if (props.option) chart.setOption(props.option, { notMerge: true });
      if (props.loading) chart.showLoading();
    });

    watch(
      () => props.option,
      (option) => {
        if (!chart) return;
        if (props.loading || !option) {
          chart.showLoading();
          return;
        }
        chart.hideLoading();
        chart.setOption(option, { notMerge: true });
      },
      { deep: true },
    );

    watch(
      () => props.loading,
      (loading) => {
        if (!chart) return;
        if (loading) chart.showLoading();
        else chart.hideLoading();
      },
    );

    onBeforeUnmount(() => {
      ro?.disconnect();
      chart?.dispose();
      chart = undefined;
    });

    expose({ getEchartsInstance, resize });

    return () =>
      h('div', {
        ref: elRef,
        style: {
          width: typeof props.width === 'number' ? `${props.width}px` : props.width,
          height: typeof props.height === 'number' ? `${props.height}px` : props.height,
        },
      });
  },
});
