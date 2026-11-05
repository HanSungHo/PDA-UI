import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import {
  BaseButton,
  BaseDropdownList,
  BaseEmptyState,
  BaseInput,
  BaseRadioGroup,
  BaseRevoGrid,
} from 'src/components/base';
import OkDialog from 'src/components/OkDialog.vue';
import LotStatusByBayPage from 'src/features/lot-status-by-bay/pages/LotStatusByBayPage.vue';
import { lotStatusByBayService } from 'src/features/lot-status-by-bay/services/lot-status-by-bay.service';
import type {
  LotStatusByBayRow,
  LotStatusByBayServiceResult,
} from 'src/features/lot-status-by-bay/types/lot-status-by-bay.types';
import { useMainStore } from 'src/features/main/stores/main.store';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComponentPublicInstance } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';

vi.mock('src/features/lot-status-by-bay/services/lot-status-by-bay.service', () => ({
  lotStatusByBayService: {
    areaBayInfo: vi.fn(),
    bayStockerInfo: vi.fn(),
    blstInfo: vi.fn(),
    stockOut: vi.fn(),
  },
}));

function success<T>(messageBody: T): LotStatusByBayServiceResult<T> {
  return { isSuccessFul: true, messageBody, errorMessage: '' };
}

function failure<T>(errorMessage: string, messageBody: T): LotStatusByBayServiceResult<T> {
  return { isSuccessFul: false, messageBody, errorMessage };
}

function lot(LOTID: string, LOC_TYPE = 'S'): LotStatusByBayRow {
  return {
    JOBCODE: 'J100',
    PROCESSSTEP: 'PHOTO',
    LOTID,
    LOCATION: 'STK-A',
    QUANTITY: '25',
    LOC_TYPE,
  };
}

const LOTS = ['LOT-1', 'LOT-2', 'LOT-3', 'LOT-4', 'LOT-5', 'LOT-6', 'LOT-7'].map((id) => lot(id));

/** Props are asserted by name, so the wrapper is typed with a loose props record. */
type ComponentWrapper = VueWrapper<ComponentPublicInstance<Record<string, unknown>>>;

describe('LotStatusByBayPage', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    document.body.innerHTML = '';
    const store = useMainStore();
    store.facility = 'GUMI';
    store.area = 'PHOTO';
    vi.mocked(lotStatusByBayService.areaBayInfo).mockResolvedValue(success(['BAY-A', 'BAY-B']));
    vi.mocked(lotStatusByBayService.bayStockerInfo).mockResolvedValue(success(['STK-A', 'STK-B']));
    vi.mocked(lotStatusByBayService.blstInfo).mockResolvedValue(success(LOTS.slice(0, 3)));
    vi.mocked(lotStatusByBayService.stockOut).mockResolvedValue(success({}));
  });

  async function setup() {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/lot-status-by-bay', component: LotStatusByBayPage },
        { path: '/esheet', component: { template: '<div>eSheet</div>' } },
        { path: '/', component: { template: '<div>Home</div>' } },
      ],
    });
    await router.push('/lot-status-by-bay');
    await router.isReady();
    const back = vi.spyOn(router, 'back').mockImplementation(() => undefined);
    const push = vi.spyOn(router, 'push');
    const wrapper = mount(LotStatusByBayPage, {
      attachTo: document.body,
      global: { plugins: [router] },
    });
    await flushPromises();
    return { wrapper, back, push };
  }

  function dropdown(wrapper: VueWrapper, label: string): ComponentWrapper {
    const component = wrapper
      .findAllComponents(BaseDropdownList)
      .find((candidate) => candidate.props('label') === label);
    if (!component) throw new Error(`Missing dropdown ${label}`);
    return component as unknown as ComponentWrapper;
  }

  function button(wrapper: VueWrapper, text: string): ComponentWrapper {
    const component = wrapper
      .findAllComponents(BaseButton)
      .find((candidate) => candidate.text() === text);
    if (!component) throw new Error(`Missing button ${text}`);
    return component as unknown as ComponentWrapper;
  }

  const jobInput = (wrapper: VueWrapper) => wrapper.findComponent(BaseInput).get('input');
  const grid = (wrapper: VueWrapper) =>
    wrapper.findComponent(BaseRevoGrid) as unknown as ComponentWrapper;
  const okDialog = (wrapper: VueWrapper) => wrapper.findComponent(OkDialog);

  async function selectBay(wrapper: VueWrapper, bay = 'BAY-A') {
    dropdown(wrapper, 'BAY').vm.$emit('update:modelValue', bay);
    await flushPromises();
  }

  async function search(wrapper: VueWrapper) {
    await button(wrapper, '조회').trigger('click');
    await flushPromises();
  }

  async function tap(wrapper: VueWrapper, rowKey: number) {
    grid(wrapper).vm.$emit('cellClick', { rowKey, row: {}, prop: 'LOTID', wasSelected: false });
    await flushPromises();
  }

  async function closeDialog(wrapper: VueWrapper) {
    okDialog(wrapper).vm.$emit('update:open', false);
    await flushPromises();
  }

  it('shows the legacy title, captions and initial state', async () => {
    const { wrapper } = await setup();

    expect(wrapper.get('h1').text()).toBe('BAY별 LOT 현황');
    expect(wrapper.findAllComponents(BaseDropdownList).map((item) => item.props('label'))).toEqual([
      'BAY',
      'STK',
    ]);
    expect(wrapper.findComponent(BaseInput).props('label')).toBe('JOB');
    // Legacy edit_job and the spinners set no android:hint.
    expect(wrapper.findAll('input[placeholder]:not([placeholder=""])')).toHaveLength(0);
    expect(wrapper.findAllComponents(BaseButton).map((item) => item.text())).toEqual([
      '조회',
      '출고',
      '선택취소',
      'eSheet',
      '반송',
      '닫기',
    ]);
    expect(wrapper.findComponent(BaseRadioGroup).props('options')).toEqual([
      { label: 'OUT', value: 'OUT' },
      { label: '2OUT', value: '2OUT' },
    ]);
    expect(wrapper.findComponent(BaseRadioGroup).props('modelValue')).toBe('OUT');
    expect(wrapper.findComponent(BaseEmptyState).exists()).toBe(true);
  });

  it('keeps 출고, 반송 and the port radios disabled like activity_lot_status_by_bay.xml', async () => {
    const { wrapper } = await setup();
    await selectBay(wrapper);
    await search(wrapper);
    await tap(wrapper, 0);

    expect(button(wrapper, 'eSheet').props('disabled')).toBe(false);
    expect(button(wrapper, '출고').props('disabled')).toBe(true);
    expect(button(wrapper, '반송').props('disabled')).toBe(true);
    expect(wrapper.findComponent(BaseRadioGroup).props('disabled')).toBe(true);
    expect(button(wrapper, '선택취소').props('disabled')).toBe(false);
  });

  it('loads the bays for the device AREA and FACILITY on open', async () => {
    const { wrapper } = await setup();

    expect(lotStatusByBayService.areaBayInfo).toHaveBeenCalledWith({
      area: 'PHOTO',
      facility: 'GUMI',
    });
    expect(dropdown(wrapper, 'BAY').props('options')).toEqual([
      { label: 'BAY-A', value: 'BAY-A' },
      { label: 'BAY-B', value: 'BAY-B' },
    ]);
    expect(dropdown(wrapper, 'BAY').props('modelValue')).toBeUndefined();
    expect(lotStatusByBayService.bayStockerInfo).not.toHaveBeenCalled();
  });

  it('shows the AREABAYINFO error message', async () => {
    vi.mocked(lotStatusByBayService.areaBayInfo).mockResolvedValue(failure('BAY DATA Empty!', []));
    const { wrapper } = await setup();

    expect(okDialog(wrapper).props('title')).toBe('에  러');
    expect(okDialog(wrapper).props('message')).toBe('BAY DATA Empty!');
    await closeDialog(wrapper);
    expect(okDialog(wrapper).props('open')).toBe(false);
  });

  it('loads the stockers of the chosen bay, appends 모두 and selects the first stocker', async () => {
    const { wrapper } = await setup();

    await selectBay(wrapper);

    expect(lotStatusByBayService.bayStockerInfo).toHaveBeenCalledWith({
      bay: 'BAY-A',
      facility: 'GUMI',
    });
    expect(dropdown(wrapper, 'STK').props('options')).toEqual([
      { label: 'STK-A', value: 'STK-A' },
      { label: 'STK-B', value: 'STK-B' },
      { label: '모두', value: '모두' },
    ]);
    expect(dropdown(wrapper, 'STK').props('modelValue')).toBe('STK-A');

    // Re-selecting the same bay does not fire onItemSelected again.
    await selectBay(wrapper);
    expect(lotStatusByBayService.bayStockerInfo).toHaveBeenCalledTimes(1);
  });

  it('selects 모두 when the bay has no stockers', async () => {
    vi.mocked(lotStatusByBayService.bayStockerInfo).mockResolvedValue(success([]));
    const { wrapper } = await setup();

    await selectBay(wrapper);

    expect(dropdown(wrapper, 'STK').props('modelValue')).toBe('모두');
  });

  it('clears JOB, STK and the grid when another bay is chosen', async () => {
    const { wrapper } = await setup();
    await selectBay(wrapper);
    await jobInput(wrapper).setValue('J100');
    await search(wrapper);
    await tap(wrapper, 0);

    vi.mocked(lotStatusByBayService.bayStockerInfo).mockResolvedValue(
      failure('STOCKER 정보가 없습니다.', []),
    );
    await selectBay(wrapper, 'BAY-B');

    expect((jobInput(wrapper).element as HTMLInputElement).value).toBe('');
    expect(dropdown(wrapper, 'STK').props('options')).toEqual([]);
    expect(dropdown(wrapper, 'STK').props('modelValue')).toBeUndefined();
    expect(wrapper.findComponent(BaseRevoGrid).exists()).toBe(false);
    expect(button(wrapper, 'eSheet').props('disabled')).toBe(true);
    expect(okDialog(wrapper).props('message')).toBe('STOCKER 정보가 없습니다.');
  });

  it('asks for BAY and then STK before searching', async () => {
    const { wrapper } = await setup();

    await search(wrapper);
    expect(okDialog(wrapper).props('message')).toBe('BAY를 선택해주세요');
    await closeDialog(wrapper);

    vi.mocked(lotStatusByBayService.bayStockerInfo).mockResolvedValue(failure('ERR', []));
    await selectBay(wrapper);
    await closeDialog(wrapper);
    await search(wrapper);
    expect(okDialog(wrapper).props('message')).toBe('STK를 선택해주세요');
    expect(lotStatusByBayService.blstInfo).not.toHaveBeenCalled();
  });

  it('searches with the uppercased JOB on Enter and shows the legacy grid columns', async () => {
    const { wrapper } = await setup();
    await selectBay(wrapper);
    dropdown(wrapper, 'STK').vm.$emit('update:modelValue', '모두');
    await jobInput(wrapper).setValue('j100');
    await jobInput(wrapper).trigger('keydown.enter');
    await flushPromises();

    expect(lotStatusByBayService.blstInfo).toHaveBeenCalledWith({
      bay: 'BAY-A',
      stk: '모두',
      job: 'J100',
      facility: 'GUMI',
    });
    const columns = grid(wrapper).props('columns') as { prop: string; name: string }[];
    expect(columns.map(({ prop, name }) => [prop, name])).toEqual([
      ['JOBCODE', 'JOB'],
      ['PROCESSSTEP', '공정명'],
      ['LOTID', 'LOT ID'],
      ['LOCATION', '상태'],
      ['QUANTITY', '수량'],
      ['LOC_TYPE', '위치구분'],
    ]);
    expect((grid(wrapper).props('rows') as LotStatusByBayRow[]).map((row) => row.LOTID)).toEqual([
      'LOT-1',
      'LOT-2',
      'LOT-3',
    ]);
  });

  it('shows the BLSTINFO error and the empty state when the search fails', async () => {
    const { wrapper } = await setup();
    await selectBay(wrapper);
    await search(wrapper);
    vi.mocked(lotStatusByBayService.blstInfo).mockResolvedValue(failure('조회 실패', []));

    await search(wrapper);

    expect(okDialog(wrapper).props('message')).toBe('조회 실패');
    expect(wrapper.findComponent(BaseRevoGrid).exists()).toBe(false);
    expect(wrapper.findComponent(BaseEmptyState).exists()).toBe(true);
  });

  it('toggles rows, enables eSheet for exactly one row and marks every selected row', async () => {
    const { wrapper } = await setup();
    await selectBay(wrapper);
    await search(wrapper);

    await tap(wrapper, 1);
    expect(button(wrapper, 'eSheet').props('disabled')).toBe(false);
    await tap(wrapper, 2);
    expect(button(wrapper, 'eSheet').props('disabled')).toBe(true);
    const rowClasses = (grid(wrapper).props('rows') as { rowClass: string }[]).map(
      (row) => row.rowClass,
    );
    expect(rowClasses).toEqual([
      '',
      'lot-status-by-bay__row--selected',
      'lot-status-by-bay__row--selected',
    ]);

    await tap(wrapper, 2);
    expect(button(wrapper, 'eSheet').props('disabled')).toBe(false);

    await button(wrapper, '선택취소').trigger('click');
    expect(button(wrapper, 'eSheet').props('disabled')).toBe(true);
    expect(
      (grid(wrapper).props('rows') as { rowClass: string }[]).every((row) => row.rowClass === ''),
    ).toBe(true);
  });

  it('toggles the focused row with Enter and Space', async () => {
    const { wrapper } = await setup();
    await selectBay(wrapper);
    await search(wrapper);

    grid(wrapper).vm.$emit('rowSelect', 0, LOTS[0]);
    await grid(wrapper).trigger('keydown', { key: 'Enter' });
    expect(button(wrapper, 'eSheet').props('disabled')).toBe(false);
    await grid(wrapper).trigger('keydown', { key: ' ' });
    expect(button(wrapper, 'eSheet').props('disabled')).toBe(true);
    await grid(wrapper).trigger('keydown', { key: 'Tab' });
    expect(button(wrapper, 'eSheet').props('disabled')).toBe(true);
  });

  it('allows at most six selected rows', async () => {
    vi.mocked(lotStatusByBayService.blstInfo).mockResolvedValue(success(LOTS));
    const { wrapper } = await setup();
    await selectBay(wrapper);
    await search(wrapper);

    for (const row of [0, 1, 2, 3, 4, 5]) await tap(wrapper, row);
    await tap(wrapper, 6);

    expect(okDialog(wrapper).props('title')).toBe('에  러');
    expect(okDialog(wrapper).props('message')).toBe('최대 6개까지 지정할수 있습니다.');
    const selected = grid(wrapper).props('rows') as { rowClass: string }[];
    expect(selected.filter((row) => row.rowClass !== '')).toHaveLength(6);
  });

  it('opens eSheet for the single selected LOT', async () => {
    const { wrapper, push } = await setup();
    await selectBay(wrapper);
    await search(wrapper);
    await tap(wrapper, 2);

    await button(wrapper, 'eSheet').trigger('click');
    await flushPromises();

    expect(push).toHaveBeenCalledWith({ path: '/esheet', query: { lotId: 'LOT-3' } });
  });

  it('keeps eSheet enabled after a new search and then asks for one LOT', async () => {
    const { wrapper, push } = await setup();
    await selectBay(wrapper);
    await search(wrapper);
    await tap(wrapper, 0);
    await search(wrapper);

    expect(button(wrapper, 'eSheet').props('disabled')).toBe(false);
    await button(wrapper, 'eSheet').trigger('click');

    expect(okDialog(wrapper).props('message')).toBe('eSheet조회는 한개의 LOT만 선택하세요.');
    expect(push).not.toHaveBeenCalled();
  });

  it('closes the screen with 닫기', async () => {
    const { wrapper, back } = await setup();

    await button(wrapper, '닫기').trigger('click');

    expect(back).toHaveBeenCalledTimes(1);
  });
});
