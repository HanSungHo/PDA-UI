import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { ROUTE } from 'src/constants/routes';
import { useLotStatusByBay } from 'src/features/lot-status-by-bay/composables/useLotStatusByBay';
import { lotStatusByBayService } from 'src/features/lot-status-by-bay/services/lot-status-by-bay.service';
import type {
  LotStatusByBayRow,
  LotStatusByBayServiceResult,
} from 'src/features/lot-status-by-bay/types/lot-status-by-bay.types';
import { useMainStore } from 'src/features/main/stores/main.store';
import { okCancelDialog } from 'src/services/ok-cancel-dialog.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent } from 'vue';
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

function lot(LOTID: string, LOCATION: string, LOC_TYPE = 'S'): LotStatusByBayRow {
  return { JOBCODE: 'J100', PROCESSSTEP: 'PHOTO', LOTID, LOCATION, QUANTITY: '25', LOC_TYPE };
}

const LOTS = [lot('LOT-1', 'STK-A'), lot('LOT-2', 'STK-B'), lot('LOT-3', 'EQP-01', 'E')];

/**
 * 출고 and 반송 are disabled in the legacy layout, so their handlers are exercised through the
 * composable directly.
 */
async function setup() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div />' } }],
  });
  await router.push('/lot-status-by-bay');
  await router.isReady();
  const push = vi.spyOn(router, 'push');
  let screen!: ReturnType<typeof useLotStatusByBay>;
  mount(
    defineComponent({
      setup() {
        screen = useLotStatusByBay();
        return () => null;
      },
    }),
    { global: { plugins: [router] } },
  );
  screen.onBaySelected('BAY-A');
  await flushPromises();
  await screen.searchLotList();
  return { screen, push };
}

describe('useLotStatusByBay', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    useMainStore().facility = 'GUMI';
    vi.mocked(lotStatusByBayService.bayStockerInfo).mockResolvedValue(success(['STK-A']));
    vi.mocked(lotStatusByBayService.blstInfo).mockResolvedValue(success(LOTS));
    vi.mocked(lotStatusByBayService.stockOut).mockResolvedValue(success({}));
  });

  it('confirms the sorted selection and sends STOCKOUT to the checked port', async () => {
    const { screen } = await setup();
    screen.onSingleTapUp(1);
    screen.onSingleTapUp(0);
    screen.checkedPort.value = '2OUT';

    const pending = screen.executeSTKout();
    await flushPromises();

    expect(okCancelDialog.isOpen.value).toBe(true);
    expect(okCancelDialog.title.value).toBe('확  인');
    expect(okCancelDialog.message.value).toBe(
      'LOT NO:\n    LOT-1\n    LOT-2\n를 2OUT PORT로 출고 하시겠습니까?',
    );
    expect(okCancelDialog.okLabel.value).toBe('확인');
    expect(okCancelDialog.cancelLabel.value).toBe('취소');
    okCancelDialog.ok();
    await pending;

    expect(lotStatusByBayService.stockOut).toHaveBeenCalledWith({
      facility: 'GUMI',
      port: '2OUT',
      items: [
        { lotId: 'LOT-1', stockerId: 'STK-A' },
        { lotId: 'LOT-2', stockerId: 'STK-B' },
      ],
    });
    // A successful STOCKOUT searches again, which clears the selection.
    expect(lotStatusByBayService.blstInfo).toHaveBeenCalledTimes(2);
    expect(screen.selectedRowList.value).toEqual([]);
  });

  it('does not send STOCKOUT when the confirmation is cancelled', async () => {
    const { screen } = await setup();
    screen.onSingleTapUp(0);

    const pending = screen.executeSTKout();
    await flushPromises();
    okCancelDialog.cancel();
    await pending;

    expect(okCancelDialog.isOpen.value).toBe(false);
    expect(lotStatusByBayService.stockOut).not.toHaveBeenCalled();
  });

  it('shows the STOCKOUT error and keeps the grid', async () => {
    vi.mocked(lotStatusByBayService.stockOut).mockResolvedValue({
      isSuccessFul: false,
      messageBody: {},
      errorMessage: '출고 실패',
    });
    const { screen } = await setup();
    screen.onSingleTapUp(0);

    await screen.stockerOut();

    expect(screen.dialog.value).toEqual({ title: '에  러', message: '출고 실패' });
    expect(screen.gridList.value).toEqual(LOTS);
  });

  it('rejects 출고 without searched data or for a LOT outside the stocker', async () => {
    const { screen } = await setup();
    screen.onSingleTapUp(0);
    screen.onSingleTapUp(2);

    await screen.executeSTKout();
    expect(screen.dialog.value?.message).toBe('LOT NO [LOT-3]는 STOCKER내에 있지 않습니다');
    expect(okCancelDialog.isOpen.value).toBe(false);

    screen.closeOkDialog();
    vi.mocked(lotStatusByBayService.blstInfo).mockResolvedValue({
      isSuccessFul: false,
      messageBody: [],
      errorMessage: 'FAIL',
    });
    await screen.searchLotList();
    screen.closeOkDialog();
    await screen.executeSTKout();
    expect(screen.dialog.value?.message).toBe('조회된 데이터가 없습니다.');
  });

  it('hands a stocker LOT over to 반송 and rejects other locations', async () => {
    const { screen, push } = await setup();

    screen.onSingleTapUp(2);
    screen.executeCarry();
    expect(screen.dialog.value?.message).toBe(
      '현재 LOT이 STOCKER내에 있지 않습니다.\nSTOCKER에 입고후 반송하세요.',
    );
    expect(push).not.toHaveBeenCalled();

    screen.onSingleTapUp(2);
    screen.onSingleTapUp(1);
    screen.executeCarry();
    expect(push).toHaveBeenCalledWith({ path: `/${ROUTE.reTransfer}`, query: { LOTID: 'LOT-2' } });
  });

  it('asks for searched data before 반송 and ignores an empty selection', async () => {
    const { screen, push } = await setup();

    screen.executeCarry();
    expect(screen.dialog.value).toBeNull();
    expect(push).not.toHaveBeenCalled();

    screen.onBaySelected('BAY-B');
    await flushPromises();
    screen.executeCarry();
    expect(screen.dialog.value?.message).toBe('조회된 데이터가 없습니다.');
  });

  it('resets the port to OUT whenever the selection changes the eSheet state', async () => {
    const { screen } = await setup();
    screen.checkedPort.value = '2OUT';

    screen.onSingleTapUp(0);

    expect(screen.checkedPort.value).toBe('OUT');
  });

  it('ignores 선택취소 before any search result', async () => {
    const { screen } = await setup();
    screen.onSingleTapUp(0);
    screen.onBaySelected('BAY-B');
    await flushPromises();

    screen.selectedCancel();

    // Like clearData, the bay change leaves the old selection list untouched.
    expect(screen.selectedRowList.value).toEqual([0]);
  });
});
