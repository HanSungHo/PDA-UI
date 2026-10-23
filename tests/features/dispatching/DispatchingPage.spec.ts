/* eslint-disable vue/one-component-per-file */
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import DispatchingPage from 'src/features/dispatching/pages/DispatchingPage.vue';
import * as dispatchingService from 'src/features/dispatching/services/dispatching.service';
import * as esheetService from 'src/features/esheet/services/esheet.service';
import { useMainStore } from 'src/features/main/stores/main.store';
import ESheetPage from 'src/pages/ESheetPage.vue';
import { okDialog } from 'src/services/ok-dialog.service';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';

const DispatchingGridStub = defineComponent({
  name: 'BaseRevoGrid',
  props: {
    rows: { type: Array, default: () => [] },
  },
  emits: ['cell-double-click', 'row-select'],
  setup(props, { attrs, emit }) {
    return () => {
      const firstRow = props.rows[0] as { rowClass?: string } | undefined;
      return h('div', { ...attrs, 'data-testid': 'dispatching-grid' }, [
        h(
          'button',
          {
            'data-testid': 'select-first-row',
            class: 'rgCell',
            onPointerdown: () => emit('row-select', 0),
          },
          'select',
        ),
        h(
          'button',
          {
            'data-testid': 'focus-first-row',
            onClick: () => emit('row-select', 0),
          },
          'focus',
        ),
        h(
          'button',
          {
            'data-testid': 'open-first-lot',
            onClick: () =>
              emit('cell-double-click', {
                prop: 'LOTNAME',
                row: props.rows[0],
                rowKey: 0,
              }),
          },
          'open',
        ),
        h('span', { 'data-testid': 'first-row-class' }, String(firstRow?.rowClass ?? '')),
      ]);
    };
  },
});

const AppRoot = defineComponent({
  setup() {
    return () => h(RouterView);
  },
});

describe('DispatchingPage', () => {
  afterEach(() => {
    okDialog.confirm();
    vi.restoreAllMocks();
  });

  it('opens eSheet with its lotId contract, searches that LOT, and restores dispatching state on Back', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    useMainStore().$patch({ facility: 'FAB-A', forwardCount: '8', historyCount: '12' });
    vi.spyOn(dispatchingService, 'getDispatch').mockResolvedValue({
      hiddenColumns: [],
      rows: [
        {
          LOTNAME: 'WP00001',
          MAINTITEM: '',
          NUMBER: '1',
          OPREATIONDESC: '',
          OPREATIONNAME: '',
          PRODUCTSPECNAME: '',
          RESERVE: 'N',
          REWORKSTATUS: '',
        },
      ],
    });
    const lookup = vi.spyOn(esheetService, 'getESheetInfo');
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/dispatching', component: DispatchingPage },
        { path: '/esheet', component: ESheetPage },
      ],
    });
    await router.push('/dispatching');
    await router.isReady();
    const wrapper = mount(AppRoot, {
      attachTo: document.body,
      global: {
        plugins: [pinia, router],
        stubs: { BaseRevoGrid: DispatchingGridStub },
      },
    });

    try {
      const machine = wrapper.get<HTMLInputElement>('input[aria-label="Machine"]');
      await machine.setValue('ETCH-MC-01');
      await wrapper.get('.dispatching__search-button').trigger('click');
      await flushPromises();

      await wrapper.get('[data-testid="select-first-row"]').trigger('pointerdown');
      await wrapper.get('[data-testid="open-first-lot"]').trigger('click');
      await flushPromises();

      expect(router.currentRoute.value.fullPath).toBe('/esheet?lotId=WP00001');
      expect(wrapper.get<HTMLInputElement>('input[aria-label="LOT"]').element.value).toBe(
        'WP00001',
      );
      expect(lookup).toHaveBeenCalledWith({
        facility: 'FAB-A',
        forwardCount: '8',
        historyCount: '12',
        lotId: 'WP00001',
      });

      await wrapper.get('button[aria-label="뒤로가기"]').trigger('click');
      await new Promise((resolve) => setTimeout(resolve));
      await flushPromises();

      expect(router.currentRoute.value.path).toBe('/dispatching');
      expect(wrapper.get<HTMLInputElement>('input[aria-label="Machine"]').element.value).toBe(
        'ETCH-MC-01',
      );
      expect(wrapper.get('[data-testid="first-row-class"]').text()).toContain(
        'dispatching__row--selected',
      );
    } finally {
      wrapper.unmount();
    }
  });

  it('uses the Android EQP barcode parser only for Enter', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const search = vi.spyOn(dispatchingService, 'getDispatch').mockResolvedValue({
      hiddenColumns: [],
      rows: [],
    });
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/dispatching', component: DispatchingPage }],
    });
    await router.push('/dispatching');
    await router.isReady();
    const wrapper = mount(DispatchingPage, {
      global: { plugins: [pinia, router], stubs: { BaseRevoGrid: DispatchingGridStub } },
    });

    try {
      const machine = wrapper.get<HTMLInputElement>('input[aria-label="Machine"]');
      await machine.setValue('EQP-ETCH-MC-01X');
      await machine.trigger('keydown.enter');
      await flushPromises();

      expect(machine.element.value).toBe('ETCH-MC-01');
      expect(search).toHaveBeenCalledWith({
        machineName: 'ETCH-MC-01',
        reserve: 'F',
        wet: '',
      });

      await machine.setValue('ETCH-MC-01');
      await machine.trigger('keydown.enter');
      await flushPromises();

      expect(machine.element.value).toBe('');
      expect(search).toHaveBeenCalledTimes(1);
      expect(okDialog.title.value).toBe('READING ERROR');
      expect(okDialog.message.value).toBe('진행할 장비를 읽어주세요.');
    } finally {
      wrapper.unmount();
    }
  });

  it('selects a focused LOT only when Enter is pressed, not when focus changes', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/dispatching', component: DispatchingPage }],
    });
    await router.push('/dispatching');
    await router.isReady();
    const wrapper = mount(DispatchingPage, {
      global: { plugins: [pinia, router], stubs: { BaseRevoGrid: DispatchingGridStub } },
    });

    try {
      const search = vi.spyOn(dispatchingService, 'getDispatch').mockResolvedValue({
        hiddenColumns: [],
        rows: [
          {
            LOTNAME: 'WP00001',
            MAINTITEM: '',
            NUMBER: '1',
            OPREATIONDESC: '',
            OPREATIONNAME: '',
            PRODUCTSPECNAME: '',
            RESERVE: 'N',
            REWORKSTATUS: '',
          },
        ],
      });
      const machine = wrapper.get<HTMLInputElement>('input[aria-label="Machine"]');
      await machine.setValue('ETCH-MC-01');
      const wet = wrapper.get<HTMLInputElement>('input[aria-label="WET 제한순위"]');
      await wet.setValue('03A');
      expect(wet.element.value).toBe('03');
      await wrapper.get('.dispatching__search-row').trigger('submit');
      await flushPromises();

      expect(search).toHaveBeenCalledWith({ machineName: 'ETCH-MC-01', reserve: 'F', wet: '03' });

      await wrapper.get('[data-testid="focus-first-row"]').trigger('click');
      expect(wrapper.get('[data-testid="first-row-class"]').text()).not.toContain(
        'dispatching__row--selected',
      );

      await wrapper.get('[data-testid="dispatching-grid"]').trigger('keydown', { key: 'Enter' });
      expect(wrapper.get('[data-testid="first-row-class"]').text()).toContain(
        'dispatching__row--selected',
      );
    } finally {
      wrapper.unmount();
    }
  });
});
