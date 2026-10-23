import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { router, service } = vi.hoisted(() => ({
  router: { push: vi.fn(), back: vi.fn() },
  service: { getMergeLot: vi.fn(), executeMergeLot: vi.fn() },
}));
vi.mock('vue-router', () => ({ useRouter: () => router }));
vi.mock('~/constants/deviceinfo', () => ({ DeviceInfo: { FACILITY: 'FAB', OPERATOR_ID: 'OP' } }));
vi.mock('src/features/merge/services/merge.service', () => service);
vi.mock('~/components/base/revo-grid/BaseRevoGrid.vue', async () => {
  const { defineComponent, h } = await import('vue');

  return {
    default: defineComponent({
      name: 'BaseRevoGrid',
      props: {
        rows: { type: Array, default: () => [] },
        columns: { type: Array, default: () => [] },
      },
      emits: ['rowSelect'],
      setup(props, { attrs, emit }) {
        return () => {
          const rows = props.rows as Array<Record<string, unknown>>;
          const columns = props.columns as Array<{ name: string; prop: string }>;

          return h('div', { ...attrs, class: ['base-revo-grid', attrs.class] }, [
            h('div', { class: 'grid-header' }, columns.map((column) => column.name).join(' ')),
            ...rows.map((row) =>
              h(
                'button',
                {
                  class: ['grid-row', row.rowClass],
                  onClick: () => emit('rowSelect', row.id, row),
                },
                columns.map((column) => String(row[column.prop] ?? '')).join('|'),
              ),
            ),
          ]);
        };
      },
    }),
  };
});

import MergePage from 'src/features/merge/pages/MergePage.vue';

describe('MergePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    service.getMergeLot.mockResolvedValue({
      AREA: 'ETCH',
      LOTHOLDSTATE: 'N',
      PROCESSOPERATIONNAME: '100',
      OPERATIONDESCRIPTION: 'ETCH',
      PRODUCTSPECNAME: 'P1',
      PRODUCTQUANTITY: '25',
      REWORKSTATE: 'N',
      PROCESSFLOWNAME: 'R1',
      CHECKMFGGROUP2: '',
      CHILDLOT: '',
      items: [
        {
          LOTNAME: 'L2',
          PRODUCTSPECNAME: 'P1',
          PROCESSFLOWNAME: 'R1',
          OPERATIONDESCRIPTION: 'ETCH',
          PROCESSOPERATIONNAME: '100',
          JOBCODE: 'J',
          PRODUCTQUANTITY: '12',
        },
        {
          LOTNAME: 'L3',
          PRODUCTSPECNAME: 'P1',
          PROCESSFLOWNAME: 'R1',
          OPERATIONDESCRIPTION: 'ETCH',
          PROCESSOPERATIONNAME: '100',
          JOBCODE: 'J',
          PRODUCTQUANTITY: '13',
        },
      ],
    });
    service.executeMergeLot.mockResolvedValue({ SUCCESS: 'Y', FAILLOTNAME: '' });
  });

  it('renders design layout with hifos2 labels and the base empty state', () => {
    const wrapper = mount(MergePage);
    expect(wrapper.get('.merge-header').text()).toBe('MERGE');
    expect(wrapper.get('.merge-search-button').text()).toBe('조회');
    expect(wrapper.text()).toContain('공정번호');
    expect(wrapper.text()).toContain('공정 DESC');
    expect(wrapper.text()).toContain('JOB CODE');
    expect(wrapper.text()).toContain('전체선택');
    expect(wrapper.text()).toContain('닫기');
    expect(wrapper.findAll('[placeholder="Null"]')).toHaveLength(0);
    expect(wrapper.text()).toContain('LOT ID 제품 ROUTE 공정 DESC 공정 JOB CODE QTY');
    expect(wrapper.find('.ds-empty-state').exists()).toBe(true);
    expect(wrapper.find('.merge-grid').exists()).toBe(false);
    expect(wrapper.find('.merge-comment .ds-field__header').exists()).toBe(false);
    expect(wrapper.find('.merge-comment [placeholder="Comment"]').exists()).toBe(true);
  });

  it('shows the base loading indicator while searching for LOT rows', async () => {
    service.getMergeLot.mockImplementationOnce(() => new Promise(() => {}));
    const wrapper = mount(MergePage);
    await wrapper.get('.merge-search input').setValue('l1');
    await wrapper.get('.merge-search-button').trigger('click');

    expect(wrapper.find('.ds-loading').exists()).toBe(true);
    expect(wrapper.find('.merge-grid-card').attributes('aria-busy')).toBe('true');
  });

  it('searches, renders rows, and sends the selected row through the screen controls', async () => {
    const wrapper = mount(MergePage);
    await wrapper.get('.merge-search input').setValue('l1');
    await wrapper.get('.merge-search-button').trigger('click');
    await flushPromises();
    expect(service.getMergeLot).toHaveBeenCalledWith('FAB', 'L1');
    expect(wrapper.findAll('.merge-grid .grid-row')).toHaveLength(2);
    await wrapper.findAll('.merge-grid .grid-row')[1]!.trigger('click');
    expect(wrapper.findAll('.merge-grid-row--selected')).toHaveLength(1);
    await wrapper.get('.merge-comment textarea').setValue('review');
    await wrapper.get('.merge-execute').trigger('click');
    await flushPromises();
    expect(service.executeMergeLot).toHaveBeenCalledWith(
      expect.objectContaining({
        lotName: 'L1',
        mergeLot: 'L3 13',
        comment: 'review',
      }),
    );
  });
});
