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
    expect(wrapper.get('.ds-screen__title').text()).toBe('MERGE');
    expect(wrapper.get('.merge-search-button').text()).toBe('조회');
    expect(wrapper.text()).toContain('공정번호');
    expect(wrapper.get('.merge-select-all').text()).toBe('전체선택');
    expect(wrapper.get('.merge-select-all').classes()).toContain('ds-btn--medium');
    expect(wrapper.text()).toContain('닫기');
    expect(wrapper.findAll('[placeholder="Null"]')).toHaveLength(0);
    expect(wrapper.find('.ds-empty-state').exists()).toBe(true);
    expect(wrapper.find('.merge-grid').exists()).toBe(false);
    expect(wrapper.find('.merge-comment .ds-field__header').exists()).toBe(false);
    expect(wrapper.find('.merge-comment [placeholder="Comment"]').exists()).toBe(true);
    expect(wrapper.get('.merge-search input').attributes('placeholder')).toBeUndefined();
  });

  it('stops the search when the automation-history confirm is answered with 아니오', async () => {
    service.getMergeLot.mockResolvedValueOnce({
      ...(await service.getMergeLot.getMockImplementation()?.()),
      CHECKMFGGROUP2: 'Y',
    });
    const wrapper = mount(MergePage, { attachTo: document.body });
    await wrapper.get('.merge-search input').setValue('l1');
    await wrapper.get('.merge-search-button').trigger('click');
    await flushPromises();

    const dialog = document.body.querySelector<HTMLElement>('.merge-dialog');
    expect(dialog?.getAttribute('aria-label')).toBe('경  고');
    const buttons = [
      ...(dialog?.querySelectorAll<HTMLButtonElement>('.ds-modal__footer .ds-btn') ?? []),
    ];
    expect(buttons.map((button) => button.textContent?.trim())).toEqual(['아니오', '예']);
    buttons[0]?.click();
    await flushPromises();
    expect(document.body.querySelector('.merge-dialog')).toBeNull();
    expect(wrapper.findAll('.merge-grid .grid-row')).toHaveLength(0);
    wrapper.unmount();
  });

  it('labels the error dialog with its title and keeps its button in the modal footer', async () => {
    const wrapper = mount(MergePage, { attachTo: document.body });
    await wrapper.get('.merge-execute').trigger('click');
    await flushPromises();

    const dialog = document.body.querySelector<HTMLElement>('.merge-dialog');
    expect(dialog?.getAttribute('aria-label')).toBe('에  러');
    expect(dialog?.querySelector('.ds-modal__title')?.textContent?.trim()).toBe('에  러');
    expect(dialog?.querySelector('.ds-modal__footer .ds-btn')?.textContent?.trim()).toBe('확인');
    dialog?.querySelector<HTMLButtonElement>('.ds-modal__footer .ds-btn')?.click();
    await flushPromises();
    expect(document.body.querySelector('.merge-dialog')).toBeNull();
    wrapper.unmount();
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
    expect(wrapper.get('.merge-grid .grid-header').text()).toBe(
      'LOT ID 제품 ROUTE 공정 DESC 공정 JOB CODE QTY',
    );
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
