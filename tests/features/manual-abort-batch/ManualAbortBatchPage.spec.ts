import { flushPromises, mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { BaseRevoGrid } from 'src/components/base';
import { BaseEmptyState } from 'src/components/base/empty-state';
import type { BaseRevoGridColumn } from 'src/components/base/revo-grid';
import ManualAbortBatchPage from 'src/features/manual-abort-batch/pages/ManualAbortBatchPage.vue';
import { NATIVE_ENTER_EVENT } from 'src/utils/native-enter-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRouter, createWebHistory } from 'vue-router';

const service = vi.hoisted(() => ({ fetchRemanualLot: vi.fn(), saveRemanual: vi.fn() }));

vi.mock('src/features/manual-abort-batch/services/manual-abort-batch.service', () => service);

let wrapper: ReturnType<typeof mount>;

/** Opens the screen from `from`, or directly (no history entry before it) when `from` is ''. */
async function render(from = '/remote-furnace-init') {
  // closePage() reads history.state.back, which createWebHistory keeps.
  window.history.replaceState(null, '', from ? '/main' : '/manual-abort-batch');
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/main', component: { template: '<div>MAIN</div>' } },
      { path: '/remote-furnace-init', component: { template: '<div>INIT</div>' } },
      { path: '/manual-abort-batch', component: ManualAbortBatchPage },
    ],
  });
  // The first navigation replaces the current entry, so it leaves no history.state.back.
  await router.push(from ? '/main' : '/manual-abort-batch');
  if (from) {
    await router.push(from);
    await router.push('/manual-abort-batch');
  }
  await router.isReady();
  wrapper = mount(ManualAbortBatchPage, {
    attachTo: document.body,
    global: { plugins: [createPinia(), router] },
  });
  await flushPromises();
  return router;
}

function button(name: string) {
  const result = wrapper.findAll('button').find((item) => item.text() === name);
  if (!result) throw new Error(`Missing button ${name}`);
  return result;
}

function input(label: string) {
  const labelId = wrapper
    .findAll('label, [id]')
    .find((item) => item.text() === label)
    ?.attributes('id');
  const result = wrapper
    .findAll('input')
    .find((item) => (item.attributes('aria-labelledby') ?? '').split(' ').includes(labelId ?? '-'));
  if (!result) throw new Error(`Missing input ${label}`);
  return result;
}

async function scanLot(value = ' LOT-1#') {
  await input('LOT').setValue(value);
  await input('LOT').trigger('keydown', { key: 'Enter' });
  await flushPromises();
}

beforeEach(() => {
  vi.resetAllMocks();
  service.fetchRemanualLot.mockResolvedValue([
    { BATCHINFO: '모', ZONE: 'TOP', LOT: 'LOT-1' },
    { BATCHINFO: '자', ZONE: 'CENTER', LOT: 'LOT-2' },
  ]);
  service.saveRemanual.mockResolvedValue(undefined);
});

afterEach(() => {
  wrapper?.unmount();
  document.body.innerHTML = '';
});

describe('ManualAbortBatchPage', () => {
  it('renders the Android title, labels, hints and a disabled 저장', async () => {
    await render();

    expect(wrapper.get('h1').text()).toBe('Abort Batch 매뉴얼 등록');
    expect(input('LOT').attributes('placeholder')).toBe('barcode');
    expect(input('진행 장비').attributes('placeholder')).toBe('barcode');
    expect(input('RECIPE').attributes('placeholder')).toBe('Key - in');
    expect(document.activeElement).toBe(input('LOT').element);
    expect(button('저장').attributes('disabled')).toBeDefined();
    expect(button('취소').attributes('disabled')).toBeUndefined();
    expect(wrapper.findComponent(BaseEmptyState).exists()).toBe(true);
  });

  it('puts 저장 before 취소 like the Figma footer', async () => {
    await render();

    expect(wrapper.findAll('footer button').map((item) => item.text())).toEqual(['저장', '취소']);
  });

  it('shows the 구분 / ZONE / LOT grid after a LOT scan and marks the 자 row', async () => {
    await render();

    await scanLot();

    expect(service.fetchRemanualLot).toHaveBeenCalledWith('LOT-1');
    const grid = wrapper.getComponent(BaseRevoGrid);
    expect(
      (grid.props('columns') as BaseRevoGridColumn[]).map((column) => [column.name, column.align]),
    ).toEqual([
      ['구분', 'center'],
      ['ZONE', 'center'],
      ['LOT', 'center'],
    ]);
    expect((grid.props('rows') as Array<{ rowClass: string }>).map((row) => row.rowClass)).toEqual([
      '',
      'manual-abort-batch__row--child',
    ]);
    expect(button('저장').attributes('disabled')).toBeUndefined();
    expect(document.activeElement).toBe(input('진행 장비').element);
  });

  it('moves from 진행 장비 to RECIPE on a scanner native-enter', async () => {
    await render();
    await scanLot();

    await input('진행 장비').setValue('EQP-FURNACE-01#');
    window.dispatchEvent(new CustomEvent(NATIVE_ENTER_EVENT));
    await flushPromises();

    expect((input('진행 장비').element as HTMLInputElement).value).toBe('FURNACE-01');
    expect(document.activeElement).toBe(input('RECIPE').element);
  });

  it('asks for the recipe in an error dialog and focuses RECIPE after 확인', async () => {
    await render();
    await scanLot();
    await input('진행 장비').setValue('FURNACE-01');

    await button('저장').trigger('click');
    await flushPromises();

    expect(document.body.textContent).toContain('Recipe를 입력하세요.');
    const ok = [...document.querySelectorAll('button')].find(
      (item) => item.textContent?.trim() === '확인',
    );
    ok?.click();
    await flushPromises();
    expect(document.activeElement).toBe(input('RECIPE').element);
  });

  it('saves and returns to the previous screen', async () => {
    const router = await render();
    await scanLot();
    await input('진행 장비').setValue('FURNACE-01');
    await input('RECIPE').setValue('rcp-1');
    // happy-dom does not traverse history, so check that the screen asks the router to go back.
    const back = vi.spyOn(router, 'back').mockImplementation(() => undefined);

    await button('저장').trigger('click');
    await flushPromises();

    expect(service.saveRemanual).toHaveBeenCalledWith(
      expect.objectContaining({ lotId: 'LOT-1', eqpId: 'FURNACE-01', rcpId: 'RCP-1' }),
    );
    expect(back).toHaveBeenCalledOnce();
  });

  it('goes to the main menu on 취소 when opened directly', async () => {
    const router = await render('');

    await button('취소').trigger('click');
    await flushPromises();

    expect(router.currentRoute.value.path).toBe('/main');
  });
});
