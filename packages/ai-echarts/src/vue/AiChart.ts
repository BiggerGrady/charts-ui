import { computed, defineComponent, type PropType, h, watch } from 'vue';
import { applyTransforms } from '../core/transform';
import { extractTablePayload, safeCompile } from '../core/compile';
import type { ChartSpec, DataRow, ThemeName } from '../core/types';
import { AiTable } from './AiTable';
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
    const baseRef = {
      value: null as null | { getEchartsInstance: () => unknown; resize: () => void },
    };

    const compiled = computed(() => safeCompile(props.spec, props.data, { theme: props.theme }));

    watch(
      compiled,
      (result) => {
        if (!result.ok) emit('spec-invalid', result.error);
      },
      { immediate: true },
    );

    expose({
      getEchartsInstance: () => baseRef.value?.getEchartsInstance(),
      resize: () => baseRef.value?.resize(),
    });

    return () => {
      const result = compiled.value;
      const useTable =
        props.spec.chartType === 'table' || (!result.ok && Boolean(extractTablePayload(result.option)));

      if (useTable) {
        const table =
          result.table ??
          extractTablePayload(result.option) ?? {
            rows: applyTransforms(props.data, props.spec.transform ?? []),
            columns: undefined as string[] | undefined,
          };
        return h(AiTable, {
          rows: table.rows,
          columns: table.columns,
          height: props.height,
          width: props.width,
        });
      }

      return h(BaseChart, {
        ref: (inst: unknown) => {
          baseRef.value = inst as typeof baseRef.value;
        },
        option: result.option,
        loading: props.loading,
        height: props.height,
        width: props.width,
        onReady: (instance: unknown) => emit('ready', instance),
        onChartClick: (params: unknown) => emit('chart-click', params),
      });
    };
  },
});
