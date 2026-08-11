import { computed, defineComponent, h, type PropType } from 'vue';
import type { DataRow } from '../core/types';

export const AiTable = defineComponent({
  name: 'AiTable',
  props: {
    rows: { type: Array as PropType<DataRow[]>, required: true },
    columns: { type: Array as PropType<string[]>, default: undefined },
    maxRows: { type: Number, default: 50 },
    height: { type: [Number, String] as PropType<number | string>, default: 360 },
    width: { type: [Number, String] as PropType<number | string>, default: '100%' },
  },
  setup(props) {
    const cols = computed(
      () => props.columns ?? (props.rows[0] ? Object.keys(props.rows[0]) : []),
    );
    const visible = computed(() => props.rows.slice(0, props.maxRows));

    return () =>
      h(
        'div',
        {
          style: {
            overflow: 'auto',
            width: typeof props.width === 'number' ? `${props.width}px` : props.width,
            height: typeof props.height === 'number' ? `${props.height}px` : props.height,
          },
        },
        [
          h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' } }, [
            h(
              'thead',
              h(
                'tr',
                cols.value.map((c) =>
                  h(
                    'th',
                    {
                      style: {
                        textAlign: 'left',
                        padding: '8px 10px',
                        borderBottom: '1px solid #d0d7de',
                        position: 'sticky',
                        top: '0',
                        background: '#f6f8fa',
                      },
                    },
                    c,
                  ),
                ),
              ),
            ),
            h(
              'tbody',
              visible.value.map((row, i) =>
                h(
                  'tr',
                  { key: i },
                  cols.value.map((c) =>
                    h(
                      'td',
                      { style: { padding: '8px 10px', borderBottom: '1px solid #eef2f6' } },
                      String(row[c] ?? ''),
                    ),
                  ),
                ),
              ),
            ),
          ]),
          props.rows.length > props.maxRows
            ? h(
                'div',
                { style: { padding: '8px', color: '#667', fontSize: '12px' } },
                `Showing ${props.maxRows} / ${props.rows.length} rows`,
              )
            : null,
        ],
      );
  },
});
