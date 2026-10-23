import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { BaseRevoGrid } from 'src/components/base/revo-grid';
import { ROUTE } from 'src/constants/routes';
import AutoMergePage from 'src/features/auto-merge/pages/AutoMergePage.vue';
import { useAutoMergeStore } from 'src/features/auto-merge/stores/auto-merge.store';
import apiClient from 'src/services/api-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { h } from 'vue';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';

vi.mock('@revolist/vue3-datagrid', async () => {
  const { h } = await import('vue');
  return {
    default: { props: { source: Array, columns: Array }, render: () => h('div') },
  };
});
vi.mock('src/services/api-client', () => ({ default: { post: vi.fn() }, setApiBaseUrl: vi.fn() }));
const RouteHarness = { render: () => h(RouterView) };

describe('AutoMergePage', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });
  async function page() {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/main', component: { template: '<div>Main</div>' } },
        { path: '/auto-merge', name: ROUTE.autoMerge, component: AutoMergePage },
        {
          path: '/lot-status',
          name: ROUTE.lotStatus,
          component: { template: '<div>LotStatus</div>' },
        },
      ],
    });
    await router.push('/main');
    await router.push('/auto-merge');
    await router.isReady();
    const wrapper = mount(RouteHarness, {
      attachTo: document.body,
      global: { plugins: [router] },
    });
    await flushPromises();
    return { wrapper, router, store: useAutoMergeStore() };
  }
  it('renders source text, empty values and empty states for both grids', async () => {
    const { wrapper } = await page();
    expect(wrapper.text()).toContain('AUTO MERGE');
    expect(wrapper.text()).toContain('닫기');
    expect(wrapper.findAll('[data-testid="base-revo-grid"]')).toHaveLength(0);
    expect(wrapper.find('[data-testid="auto-merge-candidates-empty"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="auto-merge-items-empty"]').exists()).toBe(true);
    expect(wrapper.find('textarea').attributes('placeholder')).toBe('Comment');
    expect(wrapper.find('input').attributes('placeholder')).toBeUndefined();
    expect(wrapper.findAll('input[readonly]')).toHaveLength(11);
    expect(
      wrapper.findAll('input').every((el) => (el.element as HTMLInputElement).value === ''),
    ).toBe(true);
    wrapper.unmount();
  });
  it('uppercases input and search button calls direct query', async () => {
    const { wrapper, store } = await page();
    const query = vi.spyOn(store, 'getMergeLotInfo').mockResolvedValue();
    await wrapper.get('[data-testid="auto-merge-lot"] input').setValue(' main ');
    expect(store.editLotNo).toBe(' MAIN ');
    await wrapper.get('[data-testid="auto-merge-search"]').trigger('click');
    expect(query).toHaveBeenCalledOnce();
    wrapper.unmount();
  });
  it('uses key-up to parse barcode without a duplicate key-down query', async () => {
    const { wrapper, store } = await page();
    const enter = vi.spyOn(store, 'handleLotEnter').mockResolvedValue();
    const input = wrapper.get('[data-testid="auto-merge-lot"] input');
    await input.trigger('keydown', { key: 'Enter' });
    expect(enter).not.toHaveBeenCalled();
    await input.trigger('keyup', { key: 'Enter' });
    expect(enter).toHaveBeenCalledOnce();
    wrapper.unmount();
  });
  it('shows the barcode error in the page rather than an unmounted shared dialog', async () => {
    const { wrapper } = await page();
    await wrapper.get('[data-testid="auto-merge-lot"] input').setValue('PLAIN');
    await wrapper.get('[data-testid="auto-merge-lot"] input').trigger('keyup', { key: 'Enter' });
    await flushPromises();
    expect(document.body.textContent).toContain('READING ERROR');
    expect(document.body.textContent).toContain('LOT#를 읽어주세요.');
    wrapper.unmount();
  });
  it.each([' AM-DEMOX', ' $AM-DEMOX'])(
    'parses scanner barcode %s and queries once',
    async (barcode) => {
      const { wrapper, store } = await page();
      const query = vi.spyOn(store, 'getMergeLotInfo').mockResolvedValue();
      const input = wrapper.get('[data-testid="auto-merge-lot"] input');
      await input.setValue(barcode);
      (input.element as HTMLInputElement).focus();
      await input.trigger('keyup', { key: 'Enter' });
      await flushPromises();
      expect(store.editLotNo).toBe('AM-DEMO');
      expect(query).toHaveBeenCalledOnce();
      wrapper.unmount();
    },
  );
  it('clears data and shows the source error for an invalid scanner barcode', async () => {
    const { wrapper, store } = await page();
    const query = vi.spyOn(store, 'getMergeLotInfo').mockResolvedValue();
    store.txtSelectedLot = 'OLD';
    const input = wrapper.get('[data-testid="auto-merge-lot"] input');
    await input.setValue('PLAIN');
    (input.element as HTMLInputElement).focus();
    await input.trigger('keyup', { key: 'Enter' });
    await flushPromises();
    expect(store.editLotNo).toBe('');
    expect(store.txtSelectedLot).toBe('');
    expect(store.gridVisible).toBe(false);
    expect(store.dialogs).toEqual([{ title: 'READING ERROR', message: 'LOT#를 읽어주세요.' }]);
    expect(query).not.toHaveBeenCalled();
    wrapper.unmount();
  });
  it.each(['comment', 'loading', 'dialog'])('ignores Enter during %s', async (state) => {
    const { wrapper, store } = await page();
    const enter = vi.spyOn(store, 'handleLotEnter').mockResolvedValue();
    const input = wrapper.get('[data-testid="auto-merge-lot"] input');
    await input.setValue(' AM-DEMOX');
    (input.element as HTMLInputElement).focus();
    if (state === 'comment') wrapper.get('textarea').element.focus();
    if (state === 'loading') store.loading = true;
    if (state === 'dialog') store.dialogs.push({ title: '에  러', message: 'Error' });
    await (state === 'comment' ? wrapper.get('textarea') : input).trigger('keyup', {
      key: 'Enter',
    });
    await flushPromises();
    expect(enter).not.toHaveBeenCalled();
    expect(store.editLotNo).toBe(' AM-DEMOX');
    wrapper.unmount();
  });
  it('restores LOT focus after a successful scan request', async () => {
    const { wrapper, store } = await page();
    const input = wrapper.get('[data-testid="auto-merge-lot"] input');
    vi.spyOn(store, 'getMergeLotInfo').mockImplementation(async () => {
      store.loading = true;
      (input.element as HTMLInputElement).blur();
      await flushPromises();
      store.loading = false;
    });
    await input.setValue(' AM-DEMOX');
    (input.element as HTMLInputElement).focus();
    await input.trigger('keyup', { key: 'Enter' });
    await flushPromises();
    expect(document.activeElement).toBe(input.element);
    wrapper.unmount();
  });
  it('selects after a completed tap and ignores a swipe that starts in a data cell', async () => {
    const { wrapper, store } = await page();
    store.gMainLotId = 'MAIN';
    store.gridList[0]!.LOTNAME = 'L1';
    await flushPromises();
    const select = vi.spyOn(store, 'selectLotList').mockResolvedValue();
    const grid = wrapper.findAllComponents(BaseRevoGrid)[0]!;
    const row = {
      LOTNAME: 'L1',
      MAINLOTNAME: 'P',
      PRODUCTSPECNAME: 'PRODUCT',
      PROCESSFLOWNAME: 'R',
      PROCESSOPERATIONNAME: '1000',
      DESCRIPTION: 'DESC',
    };
    const cell = document.createElement('div');
    cell.className = 'rgCell';
    grid.element.appendChild(cell);
    grid.vm.$emit('rowSelect', 0, row);
    expect(select).not.toHaveBeenCalled();
    cell.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, clientX: 100, clientY: 100 }),
    );
    cell.dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true, clientX: 40, clientY: 100 }),
    );
    cell.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 40, clientY: 100 }));
    expect(select).not.toHaveBeenCalled();
    cell.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, clientX: 100, clientY: 100 }),
    );
    cell.dispatchEvent(
      new PointerEvent('pointerup', { bubbles: true, clientX: 100, clientY: 100 }),
    );
    expect(select).toHaveBeenCalledWith(row);
    wrapper.unmount();
  });
  it('opens LotStatus with the search input and preserves the activity session', async () => {
    const { wrapper, store, router } = await page();
    store.editLotNo = 'SEARCH';
    store.txtSelectedLot = 'SELECTED';
    await wrapper.get('[data-testid="auto-merge-detail"]').trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.query.LOTID).toBe('SEARCH');
    expect(store.returningFromLotStatus).toBe(true);
    wrapper.unmount();
    await router.push('/auto-merge');
    const resumed = mount(RouteHarness, {
      global: { plugins: [router] },
    });
    await flushPromises();
    expect(store.editLotNo).toBe('SEARCH');
    expect(store.txtSelectedLot).toBe('SELECTED');
    resumed.unmount();
  });
  it('presents both dialog messages in order', async () => {
    const { wrapper, store } = await page();
    store.dialogs.push(
      { title: '에  러', message: 'FAILED LOT' },
      { title: '확  인', message: '작업을 수행하였습니다.' },
    );
    await flushPromises();
    expect(document.body.textContent).toContain('FAILED LOT');
    (
      document.body.querySelector('[data-testid="auto-merge-dialog-ok"]') as HTMLButtonElement
    ).click();
    await flushPromises();
    expect(document.body.textContent).toContain('작업을 수행하였습니다.');
    (
      document.body.querySelector('[data-testid="auto-merge-dialog-ok"]') as HTMLButtonElement
    ).click();
    await flushPromises();
    expect(store.dialogs).toHaveLength(0);
    wrapper.unmount();
  });
  it('does not steal focus after a detail request without a source focus instruction', async () => {
    const { wrapper, store } = await page();
    const comment = wrapper.get('textarea').element;
    comment.focus();
    store.loading = true;
    await flushPromises();
    store.loading = false;
    await flushPromises();
    expect(document.activeElement).toBe(comment);
    wrapper.unmount();
  });
  it('keeps a failed search LOT visible until the modal is acknowledged, then focuses it', async () => {
    const { wrapper, store } = await page();
    const input = wrapper.get('[data-testid="auto-merge-lot"] input');
    await input.setValue('MAIN');
    vi.mocked(apiClient.post).mockRejectedValueOnce(new Error('search fail'));
    await wrapper.get('[data-testid="auto-merge-search"]').trigger('click');
    await flushPromises();
    expect(document.body.textContent).toContain('search fail');
    expect((input.element as HTMLInputElement).value).toBe('MAIN');
    expect(store.focusRequest.id).toBe(0);
    (
      document.body.querySelector('[data-testid="auto-merge-dialog-ok"]') as HTMLButtonElement
    ).click();
    await flushPromises();
    expect((input.element as HTMLInputElement).value).toBe('');
    expect(document.activeElement).toBe(input.element);
    expect(store.focusRequest.select).toBe(true);
    wrapper.unmount();
  });
  it('resets the merge form only after the error and success modals are acknowledged', async () => {
    const { wrapper, store } = await page();
    store.editLotNo = 'MAIN';
    store.gMainLotId = 'MAIN';
    store.txtSelectedLot = 'CHILD';
    store.txtParentLot = 'PARENT';
    store.editComment = 'keep until confirmed';
    store.gridList2[0]!.LOTNAME = 'CHILD';
    store.gridList2[0]!.PRODUCTQUANTITY = '10';
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: {
        statusCode: 200,
        result: JSON.stringify({
          STATUS: 'PASS',
          MSGBODY: { FAILLOTNAME: 'FAILED LOT', SUCCESS: 'Y' },
        }),
      },
    });
    await wrapper.get('[data-testid="auto-merge-execute"]').trigger('click');
    await flushPromises();
    expect(document.body.textContent).toContain('FAILED LOT');
    expect(document.body.textContent).not.toContain('작업을 수행하였습니다.');
    expect(store.txtSelectedLot).toBe('CHILD');
    (
      document.body.querySelector('[data-testid="auto-merge-dialog-ok"]') as HTMLButtonElement
    ).click();
    await flushPromises();
    expect(document.body.textContent).toContain('작업을 수행하였습니다.');
    expect([store.txtSelectedLot, store.editComment]).toEqual(['CHILD', 'keep until confirmed']);
    expect(store.focusRequest.id).toBe(0);
    (
      document.body.querySelector('[data-testid="auto-merge-dialog-ok"]') as HTMLButtonElement
    ).click();
    await flushPromises();
    expect([store.editLotNo, store.txtSelectedLot, store.txtParentLot, store.editComment]).toEqual([
      '',
      '',
      '',
      '',
    ]);
    expect(store.dialogs).toEqual([]);
    expect(document.activeElement).toBe(
      wrapper.get('[data-testid="auto-merge-lot"] input').element,
    );
    wrapper.unmount();
  });
  it('does not activate a cached LOT from a previous query through the scrollbar', async () => {
    const { wrapper, store } = await page();
    store.gMainLotId = 'A';
    store.gridList[0]!.LOTNAME = 'A-1';
    await flushPromises();
    const grid = wrapper.findAllComponents(BaseRevoGrid)[0]!;
    const select = vi.spyOn(store, 'selectLotList').mockResolvedValue();
    grid.vm.$emit('rowSelect', 0, { LOTNAME: 'A-1', MAINLOTNAME: 'A-PARENT' });
    store.gMainLotId = 'B';
    store.gridList = [
      {
        LOTNAME: 'B-1',
        MAINLOTNAME: 'B-PARENT',
        PRODUCTSPECNAME: '',
        PROCESSFLOWNAME: '',
        PROCESSOPERATIONNAME: '',
        DESCRIPTION: '',
      },
    ];
    await flushPromises();
    await grid.get('[aria-orientation="horizontal"]').trigger('keyup', { key: 'Enter' });
    expect(select).not.toHaveBeenCalled();
    wrapper.unmount();
  });
  it('closes to the previous route and resets the next fresh entry', async () => {
    const { wrapper, store, router } = await page();
    store.editLotNo = 'OLD';
    await wrapper.get('[data-testid="auto-merge-close"]').trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.path).toBe('/main');
    wrapper.unmount();
    await router.push('/auto-merge');
    const fresh = mount(RouteHarness, {
      global: { plugins: [router] },
    });
    expect(store.editLotNo).toBe('');
    fresh.unmount();
  });
});
