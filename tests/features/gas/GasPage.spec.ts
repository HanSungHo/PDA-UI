import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { ROUTE } from 'src/constants/routes';
import type { GasMessageResponse } from 'src/features/gas/types/gas.types';
import { useMainStore } from 'src/features/main/stores/main.store';
import { okDialog } from 'src/services/ok-dialog.service';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { createMemoryHistory, createRouter, createWebHistory, RouterView } from 'vue-router';

import GasPage from '../../../src/features/gas/pages/GasPage.vue';
import routes from '../../../src/router/routes';

enableAutoUnmount(afterEach);

const ok = (messageBody: Record<string, unknown> = {}): GasMessageResponse => ({
  isSuccessFul: true,
  messageBody,
  errorMessage: '',
});
const cabinetBody = (type: string) => ({
  ITEMS: { ITEM: [{ CABINET: 'CAB-1', GAS: 'N2', TYPE: type }] },
  PRESSURE: '5.2',
  WEIGHT: '41.7',
});

const service = vi.hoisted(() => ({ GetCabinetInfo: vi.fn(), SetGasusage: vi.fn() }));
vi.mock('src/features/gas/services/gas.service', () => service);

async function setup(initialPath = '/gas', previousPath?: string) {
  // Web history exposes history.state.back, which GasPage.closeScreen reads; memory history has none.
  const router = createRouter({
    history: previousPath ? createWebHistory() : createMemoryHistory(),
    routes: [
      { path: '/gas', component: GasPage },
      { path: '/main', component: { template: '<div>Main</div>' } },
      { path: '/prev', component: { template: '<div>Prev</div>' } },
    ],
  });
  if (previousPath) await router.push(previousPath);
  await router.push(initialPath);
  await router.isReady();
  const wrapper = mount(GasPage, { attachTo: document.body, global: { plugins: [router] } });
  await flushPromises();
  return { wrapper, router };
}

function input(wrapper: ReturnType<typeof mount>, testId: string) {
  return wrapper.get(`[data-testid="${testId}"] input`);
}

async function lookup(wrapper: ReturnType<typeof mount>, cabinet = 'CAB-1') {
  await input(wrapper, 'gas-cabinet-no').setValue(cabinet);
  await wrapper.get('[data-testid="gas-search"]').trigger('click');
  await flushPromises();
}

describe('GasPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    setActivePinia(createPinia());
    useMainStore().operatorId = 'OP-1';
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    okDialog.confirm();
  });

  function advance(ms = 1001) {
    vi.setSystemTime(Date.now() + ms);
  }

  it('TXT-01: renders the exact Android copy and starts empty with focus on the cabinet field', async () => {
    const { wrapper } = await setup();
    expect(wrapper.get('h1').text()).toBe('GAS 사용량 입력');
    const text = wrapper.text();
    for (const copy of ['CABINET', 'GAS', '압력', '무게', 'COMMENT', '입력']) {
      expect(text).toContain(copy);
    }
    expect(wrapper.get('[data-testid="gas-search"]').text()).toBe('조회');
    expect(text).not.toContain('Null');
    expect(wrapper.get('.ds-screen__ok').text()).toBe('입력');
    // Android string is "취소 " with a trailing space.
    expect(wrapper.get('.ds-screen__cancel').element.textContent?.trim()).toBe('취소');
    expect(wrapper.get('.ds-screen__cancel').element.textContent).toContain('취소 ');
    const placeholders = wrapper
      .findAll('input')
      .map((element) => element.attributes('placeholder'))
      .filter(Boolean);
    expect(placeholders).toEqual(['전조 압력', '현재조 압력', '전조 무게', '현재조 무게']);
    for (const id of ['gas-cabinet-no', 'gas-cabinet', 'gas-gas', 'gas-pressure', 'gas-comment']) {
      expect((input(wrapper, id).element as HTMLInputElement).value).toBe('');
    }
    expect(document.activeElement).toBe(input(wrapper, 'gas-cabinet-no').element);
    expect(wrapper.find('[data-testid="gas-search"] .q-icon').exists()).toBe(false);
    expect(service.GetCabinetInfo).not.toHaveBeenCalled();
  });

  it('LIFE-02: upper-cases the cabinet input only; comment keeps its case and hints Caps', async () => {
    const { wrapper } = await setup();
    const cabinet = input(wrapper, 'gas-cabinet-no');
    (cabinet.element as HTMLInputElement).value = 'cab-1';
    await cabinet.trigger('input');
    expect((cabinet.element as HTMLInputElement).value).toBe('CAB-1');
    const comment = input(wrapper, 'gas-comment');
    (comment.element as HTMLInputElement).value = 'note';
    await comment.trigger('input');
    expect((comment.element as HTMLInputElement).value).toBe('note');
    expect(comment.attributes('autocapitalize')).toBe('characters');
  });

  it('EVENT-04/API-02/EVENT-09: the search button looks up, fills the readouts and focuses pressure', async () => {
    service.GetCabinetInfo.mockResolvedValue(ok(cabinetBody('Y')));
    const { wrapper } = await setup();
    await lookup(wrapper);
    expect(service.GetCabinetInfo).toHaveBeenCalledWith('CAB-1');
    expect((input(wrapper, 'gas-cabinet').element as HTMLInputElement).value).toBe('CAB-1');
    expect((input(wrapper, 'gas-gas').element as HTMLInputElement).value).toBe('N2');
    expect((input(wrapper, 'gas-pressure-previous').element as HTMLInputElement).value).toBe('5.2');
    expect((input(wrapper, 'gas-weight-previous').element as HTMLInputElement).value).toBe('41.7');
    expect(document.activeElement).toBe(input(wrapper, 'gas-pressure').element);
  });

  it('API-03: the weight row is removed for TYPE != Y and returns for TYPE = Y', async () => {
    service.GetCabinetInfo.mockResolvedValue(ok(cabinetBody('N')));
    const { wrapper } = await setup();
    expect(wrapper.find('[data-testid="gas-weight"]').exists()).toBe(true);
    await lookup(wrapper);
    expect(wrapper.find('[data-testid="gas-weight"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('무게');
    service.GetCabinetInfo.mockResolvedValue(ok(cabinetBody('Y')));
    advance();
    await wrapper.get('[data-testid="gas-search"]').trigger('click');
    await flushPromises();
    expect(wrapper.find('[data-testid="gas-weight"]').exists()).toBe(true);
  });

  it('VALID-01: an empty cabinet shows the legacy error dialog and refocuses the cabinet field', async () => {
    const { wrapper } = await setup();
    await wrapper.get('[data-testid="gas-search"]').trigger('click');
    await flushPromises();
    expect(okDialog.title.value).toBe('에  러');
    expect(okDialog.message.value).toBe('CABINET NO가 확인되지 않습니다.');
    expect(document.body.textContent).toContain('CABINET NO가 확인되지 않습니다.');
    // Legacy OkDialog blocks: pressure keeps focus until OK, then the cabinet is refocused.
    expect(document.activeElement).toBe(input(wrapper, 'gas-pressure').element);
    okDialog.confirm();
    await flushPromises();
    expect(document.activeElement).toBe(input(wrapper, 'gas-cabinet-no').element);
  });

  it('EVENT-08: hiding the keyboard keeps focus and suppresses the IME until the field is touched', async () => {
    service.GetCabinetInfo.mockResolvedValue(ok(cabinetBody('Y')));
    const { wrapper } = await setup();
    await lookup(wrapper);
    const pressure = input(wrapper, 'gas-pressure');
    expect(document.activeElement).toBe(pressure.element);
    expect(pressure.attributes('inputmode')).toBe('none');
    await pressure.trigger('pointerdown');
    expect(pressure.attributes('inputmode')).toBeUndefined();
  });

  it('EVENT-02/03: physical Enter parses the barcode and searches; invalid input clears the form', async () => {
    service.GetCabinetInfo.mockResolvedValue(ok(cabinetBody('Y')));
    const { wrapper } = await setup();
    const cabinet = input(wrapper, 'gas-cabinet-no');
    await cabinet.setValue(' CAB-1X');
    await cabinet.trigger('keydown', { key: 'Enter' });
    expect(service.GetCabinetInfo).not.toHaveBeenCalled();
    await cabinet.trigger('keyup', { key: 'Enter' });
    await flushPromises();
    expect(service.GetCabinetInfo).toHaveBeenCalledWith('CAB-1');
    expect((cabinet.element as HTMLInputElement).value).toBe('CAB-1');

    await input(wrapper, 'gas-comment').setValue('KEEP?');
    await cabinet.setValue('NOSPACE');
    await cabinet.trigger('keyup', { key: 'Enter' });
    await flushPromises();
    expect(okDialog.title.value).toBe('READING ERROR');
    expect((input(wrapper, 'gas-cabinet').element as HTMLInputElement).value).toBe('');
    expect((input(wrapper, 'gas-comment').element as HTMLInputElement).value).toBe('');
  });

  it('API-05/06: the 입력 button saves, shows the info dialog, refreshes and keeps COMMENT', async () => {
    service.GetCabinetInfo.mockResolvedValue(ok(cabinetBody('Y')));
    service.SetGasusage.mockResolvedValue(ok({ OK: 'Y' }));
    const { wrapper } = await setup();
    await lookup(wrapper);
    await input(wrapper, 'gas-pressure').setValue('3.1');
    await input(wrapper, 'gas-weight').setValue('40.5');
    await input(wrapper, 'gas-comment').setValue('note');
    advance();
    await wrapper.get('.ds-screen__ok').trigger('click');
    await flushPromises();
    expect(service.SetGasusage).toHaveBeenCalledWith('CAB-1', 'OP-1', '3.1', '40.5', 'note');
    expect(okDialog.title.value).toBe('알  림');
    expect(okDialog.message.value).toBe('Data가 입력되었습니다.');
    // Legacy OkDialog blocks: the refresh runs only after OK.
    expect(service.GetCabinetInfo).toHaveBeenCalledTimes(1);
    okDialog.confirm();
    await flushPromises();
    expect(service.GetCabinetInfo).toHaveBeenCalledTimes(2);
    expect(document.activeElement).toBe(input(wrapper, 'gas-cabinet-no').element);
    expect((input(wrapper, 'gas-comment').element as HTMLInputElement).value).toBe('note');
    expect((input(wrapper, 'gas-pressure').element as HTMLInputElement).value).toBe('');
  });

  it('EVENT-07: one listener instance debounces search, OK and cancel for 1000 ms', async () => {
    service.GetCabinetInfo.mockResolvedValue(ok(cabinetBody('Y')));
    const { wrapper, router } = await setup('/gas', '/prev');
    const backSpy = vi.spyOn(router, 'back').mockImplementation(() => undefined);
    await lookup(wrapper);
    await wrapper.get('[data-testid="gas-search"]').trigger('click');
    await wrapper.get('.ds-screen__cancel').trigger('click');
    await flushPromises();
    expect(service.GetCabinetInfo).toHaveBeenCalledTimes(1);
    expect(backSpy).not.toHaveBeenCalled();
    advance();
    await wrapper.get('.ds-screen__cancel').trigger('click');
    expect(backSpy).toHaveBeenCalledTimes(1);
  });

  it('EVENT-06/NAV-02: Cancel finishes with history back, or falls back to the main route', async () => {
    const first = await setup('/gas', '/prev');
    const back = vi.spyOn(first.router, 'back').mockImplementation(() => undefined);
    await first.wrapper.get('.ds-screen__cancel').trigger('click');
    expect(back).toHaveBeenCalledTimes(1);
    expect(okDialog.isOpen.value).toBe(false);
    first.wrapper.unmount();

    advance();
    const second = await setup('/gas');
    await second.wrapper.get('.ds-screen__cancel').trigger('click');
    await flushPromises();
    expect(second.router.currentRoute.value.path).toBe(`/${ROUTE.main}`);
  });

  it('disables only the buttons (inputs keep focus) and shows busy state while a request is in flight', async () => {
    let resolve!: (value: GasMessageResponse) => void;
    service.GetCabinetInfo.mockReturnValue(new Promise((r) => (resolve = r)));
    const { wrapper } = await setup();
    await input(wrapper, 'gas-cabinet-no').setValue('CAB-1');
    await wrapper.get('[data-testid="gas-search"]').trigger('click');
    expect(wrapper.get('.gas').attributes('aria-busy')).toBe('true');
    expect(wrapper.get('[data-testid="gas-search"]').attributes('disabled')).toBeDefined();
    expect(wrapper.get('[data-testid="gas-ok"]').attributes('disabled')).toBeDefined();
    for (const id of ['gas-cabinet-no', 'gas-pressure', 'gas-comment']) {
      expect(input(wrapper, id).attributes('disabled')).toBeUndefined();
    }
    // Focus set by getData() (edit_pressure) must survive the loading state.
    expect(document.activeElement).toBe(input(wrapper, 'gas-pressure').element);
    resolve(ok(cabinetBody('Y')));
    await flushPromises();
    expect(wrapper.get('.gas').attributes('aria-busy')).toBe('false');
  });

  it('ENTRY: the /gas route registered in the app router renders GasPage from the Main handoff path', async () => {
    const router = createRouter({ history: createMemoryHistory(), routes });
    await router.push('/main');
    await router.push({ path: ROUTE.gas });
    await router.isReady();
    expect(router.currentRoute.value.name).toBe(ROUTE.gas);
    const wrapper = mount(defineComponent({ render: () => h(RouterView) }), {
      global: { plugins: [router] },
    });
    await flushPromises();
    expect(wrapper.get('h1').text()).toBe('GAS 사용량 입력');
  });
});
