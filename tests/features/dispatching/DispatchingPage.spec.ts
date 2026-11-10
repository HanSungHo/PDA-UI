/* eslint-disable vue/one-component-per-file */
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import DispatchingPage from 'src/features/dispatching/pages/DispatchingPage.vue';
import * as dispatchingService from 'src/features/dispatching/services/dispatching.service';
import { useDispatchingStore } from 'src/features/dispatching/stores/dispatching.store';
import * as esheetService from 'src/features/esheet/services/esheet.service';
import { useMainStore } from 'src/features/main/stores/main.store';
import ESheetPage from 'src/pages/ESheetPage.vue';
import { ApiError } from 'src/services/api-error';
import { okDialog } from 'src/services/ok-dialog.service';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';

import { getESheetPageFixture } from '../../fixtures/esheet-page.fixture';

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

function findButton(wrapper: ReturnType<typeof mount>, label: string) {
  const button = wrapper
    .findAll('button')
    .find((item) => item.text() === label || item.attributes('aria-label') === label);
  if (!button) throw new Error(`button ${label} not found`);
  return button;
}

function dispatchRow(overrides: Record<string, string> = {}) {
  return {
    LOTNAME: 'WP00001',
    MAINTITEM: '',
    NUMBER: '1',
    OPREATIONDESC: 'DESC',
    OPREATIONNAME: '1000',
    PRODUCTSPECNAME: 'PROD',
    RESERVE: 'N',
    REWORKSTATUS: '',
    ...overrides,
  };
}

async function mountPage() {
  const pinia = createPinia();
  setActivePinia(pinia);
  useMainStore().$patch({ operatorId: 'OP1', operatorName: 'Kim' });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/dispatching', component: DispatchingPage }],
  });
  await router.push('/dispatching');
  await router.isReady();
  const wrapper = mount(DispatchingPage, {
    attachTo: document.body,
    global: { plugins: [pinia, router], stubs: { BaseRevoGrid: DispatchingGridStub } },
  });
  return { pinia, router, wrapper };
}

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
    const lookup = vi
      .spyOn(esheetService, 'getESheetInfo')
      .mockImplementation(async ({ lotId }) => getESheetPageFixture(lotId));
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
      await findButton(wrapper, '조회').trigger('click');
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

      const closeButton = wrapper.findAll('button').find((button) => button.text() === '닫기');
      expect(closeButton).toBeDefined();
      await closeButton!.trigger('click');
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
      const wet = wrapper.get<HTMLInputElement>('input#dispatching-wet');
      await wet.setValue('03A');
      expect(wet.element.value).toBe('03');
      await wrapper.get('form').trigger('submit');
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

  it('shows the Android empty-machine dialog and ignores set without selection', async () => {
    const { wrapper } = await mountPage();
    try {
      const search = vi.spyOn(dispatchingService, 'getDispatch');
      const save = vi.spyOn(dispatchingService, 'setDispatch');
      await findButton(wrapper, '예약등록').trigger('click');
      expect(document.body.textContent).not.toContain('에  러');
      await findButton(wrapper, '조회').trigger('click');
      await flushPromises();
      expect(document.body.textContent).toContain('Machine을 입력해주세요');
      expect(search).not.toHaveBeenCalled();
      expect(save).not.toHaveBeenCalled();
    } finally {
      wrapper.unmount();
    }
  });

  it('registers and cancels reservations with Android validation, payload and refresh', async () => {
    const { wrapper } = await mountPage();
    try {
      const search = vi.spyOn(dispatchingService, 'getDispatch').mockResolvedValue({
        hiddenColumns: [],
        rows: [dispatchRow(), dispatchRow({ LOTNAME: 'WP2', RESERVE: 'Y', NUMBER: '2' })],
      });
      const save = vi.spyOn(dispatchingService, 'setDispatch').mockResolvedValue();
      await wrapper.get<HTMLInputElement>('input[aria-label="Machine"]').setValue('etch-mc-01');
      await wrapper.get('form').trigger('submit');
      await flushPromises();

      await wrapper.get('[data-testid="select-first-row"]').trigger('pointerdown');
      await findButton(wrapper, '예약해제').trigger('click');
      await flushPromises();
      expect(document.body.textContent).toContain('선택된 예약 해제 LOT이 없습니다.');
      expect(save).not.toHaveBeenCalled();
      [...document.body.querySelectorAll('button')]
        .find((button) => button.textContent?.trim() === '확인')
        ?.click();
      await flushPromises();

      await findButton(wrapper, '예약등록').trigger('click');
      await flushPromises();
      expect(save).toHaveBeenCalledWith(
        expect.objectContaining({
          machineName: 'ETCH-MC-01',
          operatorId: 'OP1',
          operatorName: 'Kim',
          reserve: 'Y',
        }),
      );
      expect(search).toHaveBeenCalledTimes(2);
    } finally {
      wrapper.unmount();
    }
  });

  it('shows an empty ERRMSG dialog and keeps fields enabled while loading', async () => {
    const { wrapper } = await mountPage();
    try {
      let reject: (reason: unknown) => void = () => undefined;
      vi.spyOn(dispatchingService, 'getDispatch').mockReturnValue(
        new Promise((_resolve, rej) => {
          reject = rej;
        }),
      );
      const machine = wrapper.get<HTMLInputElement>('input[aria-label="Machine"]');
      await machine.setValue('ETCH-MC-01');
      await wrapper.get('form').trigger('submit');
      await flushPromises();
      expect(machine.element.disabled).toBe(false);
      expect(wrapper.get<HTMLInputElement>('input#dispatching-wet').element.disabled).toBe(false);
      expect(findButton(wrapper, '조회').element.disabled).toBe(true);
      reject(new ApiError('', { code: 'X' }));
      await flushPromises();
      expect(document.body.textContent).toContain('에  러');
      expect(document.body.querySelector('[role="alert"]')).not.toBeNull();
    } finally {
      wrapper.unmount();
    }
  });

  it('shows the SETDISPATCH failure without refreshing and no urgent row color', async () => {
    const { wrapper } = await mountPage();
    try {
      const search = vi
        .spyOn(dispatchingService, 'getDispatch')
        .mockResolvedValue({ hiddenColumns: [], rows: [dispatchRow({ MAINTITEM: '긴급' })] });
      vi.spyOn(dispatchingService, 'setDispatch').mockRejectedValue(new ApiError('SET FAIL'));
      await wrapper.get<HTMLInputElement>('input[aria-label="Machine"]').setValue('ETCH-MC-01');
      await wrapper.get('form').trigger('submit');
      await flushPromises();
      expect(wrapper.get('[data-testid="first-row-class"]').text()).not.toContain('urgent');
      await wrapper.get('[data-testid="select-first-row"]').trigger('pointerdown');
      await findButton(wrapper, '예약등록').trigger('click');
      await flushPromises();
      expect(document.body.textContent).toContain('SET FAIL');
      expect(search).toHaveBeenCalledTimes(1);
    } finally {
      wrapper.unmount();
    }
  });

  it('blocks set when the machine is cleared after a search', async () => {
    const { wrapper } = await mountPage();
    try {
      vi.spyOn(dispatchingService, 'getDispatch').mockResolvedValue({
        hiddenColumns: ['DOPANT'],
        rows: [dispatchRow()],
      });
      const save = vi.spyOn(dispatchingService, 'setDispatch');
      const machine = wrapper.get<HTMLInputElement>('input[aria-label="Machine"]');
      await machine.setValue('ETCH-MC-01');
      await wrapper.get('form').trigger('submit');
      await flushPromises();
      await wrapper.get('[data-testid="select-first-row"]').trigger('pointerdown');
      await machine.setValue('');
      await findButton(wrapper, '예약등록').trigger('click');
      expect(document.body.textContent).toContain('장비명이 확인 되지 않습니다.');
      expect(save).not.toHaveBeenCalled();
      await wrapper.get('[data-testid="dispatching-grid"]').trigger('keydown', { key: 'a' });
    } finally {
      wrapper.unmount();
    }
  });

  it('clears the saved state and goes back on Close, like Activity finish()', async () => {
    const { router, wrapper } = await mountPage();
    try {
      const back = vi.spyOn(router, 'back');
      await wrapper.get<HTMLInputElement>('input[aria-label="Machine"]').setValue('X');
      await findButton(wrapper, '닫기').trigger('click');
      expect(back).toHaveBeenCalled();
      expect(useDispatchingStore().state).toBeUndefined();
    } finally {
      wrapper.unmount();
    }
  });

  it('renders the search section like Android: no placeholder, 조회 text button', async () => {
    const { wrapper } = await mountPage();
    try {
      expect(wrapper.get('input[aria-label="Machine"]').attributes('placeholder')).toBeUndefined();
      expect(wrapper.get('input#dispatching-wet').attributes('placeholder')).toBeUndefined();
      expect(findButton(wrapper, '조회').text()).toBe('조회');
      expect(wrapper.text()).not.toContain('EMPTY');
      expect(wrapper.text()).toContain('WET 제한순위←');
      expect(wrapper.text()).toContain('예약표기');
      await flushPromises();
      expect(document.activeElement).toBe(wrapper.get('input[aria-label="Machine"]').element);
    } finally {
      wrapper.unmount();
    }
  });

  it('sends T when 예약표기 is checked, cancels reservations with N, and ignores non-row interactions', async () => {
    const { wrapper } = await mountPage();
    try {
      const search = vi.spyOn(dispatchingService, 'getDispatch').mockResolvedValue({
        hiddenColumns: [],
        rows: [dispatchRow({ RESERVE: 'Y' })],
      });
      const save = vi.spyOn(dispatchingService, 'setDispatch').mockResolvedValue();
      await wrapper.get('input[aria-label="Machine"]').setValue('ETCH-MC-01');
      wrapper.getComponent({ name: 'BaseCheckbox' }).vm.$emit('update:modelValue', true);
      wrapper.findAllComponents({ name: 'BaseInput' })[1]?.vm.$emit('update:modelValue', undefined);
      await wrapper.get('form').trigger('submit');
      await flushPromises();
      expect(search).toHaveBeenCalledWith({ machineName: 'ETCH-MC-01', reserve: 'T', wet: '' });

      const grid = wrapper.get('[data-testid="dispatching-grid"]');
      // Enter before any row focus, a non-grid pointerdown and a non-number row key do nothing.
      await grid.trigger('keydown', { key: 'Enter' });
      await grid.trigger('pointerdown');
      wrapper.getComponent({ name: 'BaseRevoGrid' }).vm.$emit('row-select', 'x');
      await flushPromises();
      expect(wrapper.get('[data-testid="first-row-class"]').text()).not.toContain('selected');

      // select then deselect, then select again and cancel.
      await wrapper.get('[data-testid="select-first-row"]').trigger('pointerdown');
      await wrapper.get('[data-testid="select-first-row"]').trigger('pointerdown');
      await new Promise((resolve) => setTimeout(resolve));
      await findButton(wrapper, '예약해제').trigger('click');
      await flushPromises();
      expect(save).not.toHaveBeenCalled();
      await wrapper.get('[data-testid="select-first-row"]').trigger('pointerdown');
      await findButton(wrapper, '예약해제').trigger('click');
      await flushPromises();
      expect(save).toHaveBeenCalledWith(expect.objectContaining({ reserve: 'N' }));
    } finally {
      wrapper.unmount();
    }
  });
});
