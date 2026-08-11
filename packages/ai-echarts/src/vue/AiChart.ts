import { computed, defineComponent, type PropType, h } from 'vue';
import { safeCompile } from '../core/compile';
import type { ChartSpec, DataRow, ThemeName } from '../core/types';
import { BaseChart } from './BaseChart';

export const AiChart = defineComponent({
  name: 'AiChart',
  props: {
    spec: { type: Object as PropType<ChartSpec>, required: true },
    data: { type: Array as PropType<DataRow[]>, required: true },
    theme: { type: String as PropType<ThemeName>, default: 'light' },
    loading: { type: Boolean, default: false },
    height: { type: [Number, String] as PropType<number | string>, default: 360 },
    width: { type: [Number, String] as PropType<number | string>, default: '100%' },
  },
  emits: ['ready', 'chart-click', 'spec-invalid'],
  setup(props, { emit, expose }) {
    const baseRef = { value: null as null | { getEchartsInstance: () => unknown; resize: () => void } };

    const option = computed(() => {
      const result = safeCompile(props.spec, props.data, { theme: props.theme });
      if (!result.ok) emit('spec-invalid', result.error);
      return result.option;
    });

    expose({
      getEchartsInstance: () => baseRef.value?.getEchartsInstance(),
      resize: () => baseRef.value?.resize(),
    });

    return () =>
      h(BaseChart, {
        ref: (inst: unknown) => {
          baseRef.value = inst as typeof baseRef.value;
        },
        option: option.value,
        loading: props.loading,
        height: props.height,
        width: props.width,
        onReady: (instance: unknown) => emit('ready', instance),
        onChartClick: (params: unknown) => emit('chart-click', params),
      });
  },
});
