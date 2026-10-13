import { flushPromises, mount } from '@vue/test-utils';
import { COMMON_FIELD } from 'src/constants/common-strings';
import { okDialog } from 'src/services/ok-dialog.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';

const { route, router, splitService } = vi.hoisted(() => ({
  route: { query: {} as Record<string, unknown> },
  router: { back: vi.fn() },
  splitService: {
    fetchLotInfo: vi.fn(),
    fetchCustomer: vi.fn(),
    submitSplit: vi.fn(),
  },
}));

vi.mock('vue-router', () => ({ useRoute: () => route, useRouter: () => router }));
vi.mock('~/constants/deviceinfo', () => ({
  DeviceInfo: { FACILITY: 'TEST-FAB', OPERATOR_ID: 'OP-TEST' },
}));
vi.mock('src/features/split/services/split.service', () => splitService);

vi.mock('src/services/ok-dialog.service', () => ({ okDialog: { show: vi.fn() } }));

import { useSplitPage } from 'src/features/split/composables/useSplitPage';
import { BLOCK_SPLIT_ON_CUSTOMER_LOT, SPLIT_MESSAGES } from 'src/features/split/types/split.types';

const lotInfo = (overrides: Partial<ReturnType<typeof lotInfoBase>> = {}) => ({
  ...lotInfoBase(),
  ...overrides,
});

function lotInfoBase() {
  return {
    product: 'PROD-A100',
    operation: '1000',
    subOperation: 'A',
    processStep: 'STEP01',
    quantity: 25,
    state: 'WIP',
    status: 'WAIT',
    holdStatus: '',
    batchId: '',
    waferList: ['01', '02', '03', '04', '05'],
    sampleFlag: '',
    rootLotName: 'ABC1234',
    childLotSequence: 0,
  };
}

function mountComposable() {
  const wrapper = mount(
    defineComponent({
      setup(_, { expose }) {
        const state = useSplitPage();
        expose({ state });
        return () => h('div');
      },
    }),
  );
  const state = (wrapper.vm as unknown as { state: ReturnType<typeof useSplitPage> }).state;
  return { wrapper, state };
}

async function scanValidLot(state: ReturnType<typeof useSplitPage>) {
  state.lotNoModel.value = ' ABC1234X!';
  await state.onLotSubmit();
  await flushPromises();
}

async function expectCurrentDialog(
  state: ReturnType<typeof useSplitPage>,
  pending: Promise<void>,
  message: string,
) {
  await flushPromises();
  expect(state.errorOpen.value).toBe(true);
  expect(state.errorMessage.value).toBe(message);
  state.closeError();
  await pending;
}

async function closeCurrentDialogWithoutWaiting(
  state: ReturnType<typeof useSplitPage>,
  message: string,
) {
  await flushPromises();
  expect(state.errorOpen.value).toBe(true);
  expect(state.errorMessage.value).toBe(message);
  state.closeError();
}

describe('useSplitPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    route.query = {};
    splitService.fetchLotInfo.mockResolvedValue({ ok: true, data: lotInfo() });
    splitService.fetchCustomer.mockResolvedValue({ ok: true, data: '' });
    splitService.submitSplit.mockResolvedValue({ ok: true, data: null });
  });

  it('parses scanner LOT input, loads LOT info, and creates child LOT rows', async () => {
    const { state, wrapper } = mountComposable();

    await scanValidLot(state);
    expect(splitService.fetchLotInfo).toHaveBeenCalledWith('ABC1234X', 'TEST-FAB');
    expect(okDialog.show).not.toHaveBeenCalled();
    expect(state.product.value).toBe('PROD-A100');
    expect(state.originalQtyText.value).toBe('25');
    expect(state.currentOperation.value).toBe('STEP01(1000A)');
    expect(state.canSplit.value).toBe(true);

    state.childCount.value = 2;
    await state.onSplitClick();

    expect(state.rows.value.map((row) => row.lotNo)).toEqual(['ABC1234N1', 'ABC1234N2']);
    expect(state.selectedRowId.value).toBe(state.rows.value[0].id);
    expect(state.canWafer.value).toBe(true);
    wrapper.unmount();
  });

  it('rejects manual input without scanner envelope: util shows the reading error, screen is cleared, no lookup', async () => {
    const { state, wrapper } = mountComposable();
    await scanValidLot(state);
    state.childCount.value = 2;
    await state.onSplitClick();
    expect(state.rows.value).toHaveLength(2);

    state.lotNoModel.value = 'ABC1234X';
    await state.onLotSubmit();
    await flushPromises();

    expect(okDialog.show).toHaveBeenCalledOnce();
    expect(okDialog.show).toHaveBeenCalledWith(
      'READING ERROR',
      'LOT#를 읽어주세요.',
      COMMON_FIELD.BTNOKSTR,
    );
    expect(state.errorOpen.value).toBe(false);
    expect(splitService.fetchLotInfo).toHaveBeenCalledTimes(1);
    expect(state.lotNo.value).toBe('');
    expect(state.rows.value).toEqual([]);
    expect(state.product.value).toBe('');
    wrapper.unmount();
  });

  it('clears the screen without a dialog when the scan only contains the terminator character', async () => {
    const { state, wrapper } = mountComposable();
    await scanValidLot(state);

    state.lotNoModel.value = ' X';
    await state.onLotSubmit();
    await flushPromises();

    expect(okDialog.show).not.toHaveBeenCalled();
    expect(splitService.fetchLotInfo).toHaveBeenCalledTimes(1);
    expect(state.lotNo.value).toBe('');
    expect(state.product.value).toBe('');
    expect(state.canSplit.value).toBe(false);
    wrapper.unmount();
  });

  it('prepares wafer selection data and submits validated split rows', async () => {
    const { state, wrapper } = mountComposable();

    await scanValidLot(state);
    state.childCount.value = 2;
    await state.onSplitClick();
    state.rows.value[0].wafers = ['01', '02'];
    state.rows.value[1].wafers = ['03'];

    state.selectRow(state.rows.value[1].id);
    await state.onWaferClick();
    expect(state.waferDialogOpen.value).toBe(true);
    expect(state.waferDialogPayload.value).toEqual({
      lotId: 'ABC1234X',
      fixedCount: 23,
      existWaferList: ['01', '02', '03', '04', '05'],
      disableWaferList: ['01', '02'],
      selectWaferList: ['03'],
    });

    state.onWaferConfirm(['03', '04']);
    expect(state.rows.value[1].wafers).toEqual(['03', '04']);
    expect(state.remainQtyText.value).toBe('21');

    await state.onOkClick();
    expect(splitService.fetchCustomer).toHaveBeenCalledWith('PROD-A100');
    expect(splitService.submitSplit).toHaveBeenCalledWith({
      lotId: 'ABC1234X',
      facility: 'TEST-FAB',
      qty: 21,
      operation: '1000',
      subOperation: 'A',
      product: 'PROD-A100',
      operatorId: 'OP-TEST',
      items: [
        { splitLotId: 'ABC1234N1', splitQty: 2, splitProd: 'PROD-A100', waferId: '01,02' },
        { splitLotId: 'ABC1234N2', splitQty: 2, splitProd: 'PROD-A100', waferId: '03,04' },
      ],
      comment: '',
    });
    expect(router.back).toHaveBeenCalledOnce();
    wrapper.unmount();
  });

  it('supports dollar-prefixed scans, ETCH row naming, row shrinking, cancel, and wafer cancel', async () => {
    splitService.fetchLotInfo.mockResolvedValueOnce({
      ok: true,
      data: lotInfo({ childLotSequence: 98 }),
    });
    const { state, wrapper } = mountComposable();

    state.isEtch.value = true;
    state.lotNo.value = ' $ETCHLOT1!';
    await state.onLotSubmit();
    expect(state.lotNo.value).toBe('ETCHLOT1');

    state.childCount.value = 2;
    const splitPending = state.onSplitClick();
    await expectCurrentDialog(state, splitPending, SPLIT_MESSAGES.childSeqOverflow);
    expect(state.rows.value.map((row) => row.lotNo)).toEqual(['ETCHLOTSE99', 'ETCHLOT']);

    state.childCount.value = 1;
    await state.onSplitClick();
    expect(state.rows.value).toHaveLength(1);

    await state.onWaferClick();
    expect(state.waferDialogOpen.value).toBe(true);
    state.onWaferCancel();
    expect(state.waferDialogOpen.value).toBe(false);

    state.onCancel();
    expect(router.back).toHaveBeenCalledOnce();
    wrapper.unmount();
  });

  it.each([
    [lotInfo({ state: 'SCRAPPED' }), SPLIT_MESSAGES.notWip('SCRAPPED')],
    [lotInfo({ holdStatus: 'ONHOLD' }), SPLIT_MESSAGES.onHold],
    [lotInfo({ batchId: 'BATCH-1' }), SPLIT_MESSAGES.inBatch],
    [lotInfo({ sampleFlag: 'S' }), SPLIT_MESSAGES.sampleLot('ABC1234X')],
  ])('shows blocking LOT rule dialogs after displaying LOT info', async (info, message) => {
    splitService.fetchLotInfo.mockResolvedValueOnce({ ok: true, data: info });
    const { state, wrapper } = mountComposable();

    state.lotNo.value = ' ABC1234X!';
    const pending = state.onLotSubmit();
    await expectCurrentDialog(state, pending, message);
    expect(state.product.value).toBe('PROD-A100');
    expect(state.canSplit.value).toBe(false);
    wrapper.unmount();
  });

  it('shows server failures and focuses the LOT input when LOT lookup fails', async () => {
    splitService.fetchLotInfo.mockResolvedValueOnce({ ok: false, message: 'server failed' });
    const { state, wrapper } = mountComposable();
    const input = document.createElement('input');
    input.focus = vi.fn();
    input.select = vi.fn();
    state.lotInputWrapper.value = { querySelector: vi.fn(() => input) } as unknown as HTMLElement;

    state.lotNo.value = ' ABC1234X!';
    const pending = state.onLotSubmit();
    await expectCurrentDialog(state, pending, 'server failed');
    expect(input.focus).toHaveBeenCalledOnce();
    expect(input.select).toHaveBeenCalledOnce();
    wrapper.unmount();
  });

  it.each([
    [undefined, SPLIT_MESSAGES.childCountRequired],
    [0, SPLIT_MESSAGES.childCountTooSmall],
    [6, SPLIT_MESSAGES.childCountTooLarge],
  ])('validates child count before creating rows', async (count, message) => {
    const { state, wrapper } = mountComposable();
    await scanValidLot(state);

    state.childCount.value = count;
    const pending = state.onSplitClick();
    await expectCurrentDialog(state, pending, message);
    expect(state.rows.value).toEqual([]);
    wrapper.unmount();
  });

  it('validates wafer selection and split row rules before submit', async () => {
    const { state, wrapper } = mountComposable();
    await scanValidLot(state);

    let pending = state.onWaferClick();
    await expectCurrentDialog(state, pending, SPLIT_MESSAGES.selectRowForWafer);

    pending = state.onOkClick();
    await expectCurrentDialog(state, pending, SPLIT_MESSAGES.childLotRequired);

    state.childCount.value = 2;
    await state.onSplitClick();
    state.rows.value[0].lotNo = ' abc1234n1 ';
    state.rows.value[0].wafers = ['01'];
    state.rows.value[1].lotNo = 'ABC1234N1';
    state.rows.value[1].wafers = ['02'];
    pending = state.onOkClick();
    await expectCurrentDialog(state, pending, SPLIT_MESSAGES.duplicatedLotNo);

    state.rows.value[1].lotNo = 'ABC1234N2';
    state.rows.value[1].wafers = [];
    pending = state.onOkClick();
    await expectCurrentDialog(state, pending, SPLIT_MESSAGES.waferRequired);

    state.rows.value[1].wafers = ['02'];
    state.rows.value[1].lotNo = 'ABC1234X';
    pending = state.onOkClick();
    await expectCurrentDialog(state, pending, SPLIT_MESSAGES.sameAsParent);

    state.rows.value[1].lotNo = 'ABC1234 N';
    pending = state.onOkClick();
    await expectCurrentDialog(state, pending, SPLIT_MESSAGES.lotNameHasSpace);

    state.rows.value[1].lotNo = 'ABC1234-N';
    pending = state.onOkClick();
    await expectCurrentDialog(state, pending, SPLIT_MESSAGES.lotNameHasHyphen);

    state.rows.value[1].lotNo = 'ABC1234N';
    pending = state.onOkClick();
    await expectCurrentDialog(state, pending, SPLIT_MESSAGES.lotNameLength9);

    state.rows.value[1].lotNo = 'ABC12341X';
    pending = state.onOkClick();
    await expectCurrentDialog(state, pending, SPLIT_MESSAGES.lotName8thMustBeLetter('1'));

    state.rows.value[1].lotNo = 'ABC1234N?';
    pending = state.onOkClick();
    await expectCurrentDialog(state, pending, SPLIT_MESSAGES.lotNameInvalidChar('?'));

    state.rows.value[0].wafers = Array.from({ length: 24 }, (_, i) => String(i + 1));
    state.rows.value[1].lotNo = 'ABC1234N2';
    state.rows.value[1].wafers = ['25', '26'];
    pending = state.onOkClick();
    await expectCurrentDialog(state, pending, SPLIT_MESSAGES.overParentQty);
    expect(splitService.submitSplit).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('validates old naming rule and customer/server submit branches', async () => {
    splitService.fetchLotInfo.mockResolvedValueOnce({
      ok: true,
      data: lotInfo({ rootLotName: 'OLDLOT', quantity: 4 }),
    });
    const { state, wrapper } = mountComposable();

    state.lotNo.value = ' OLDLOT1!';
    await state.onLotSubmit();
    state.childCount.value = 1;
    await state.onSplitClick();
    state.rows.value[0].lotNo = 'OLDLOT2';
    state.rows.value[0].wafers = ['01'];

    let pending = state.onOkClick();
    await expectCurrentDialog(state, pending, SPLIT_MESSAGES.oldLotNameRule);

    state.rows.value[0].lotNo = 'OLDLOT-2';
    splitService.fetchCustomer.mockResolvedValueOnce({ ok: false, message: 'customer error' });
    splitService.submitSplit.mockResolvedValueOnce({ ok: false, message: 'submit failed' });
    pending = state.onOkClick();
    await closeCurrentDialogWithoutWaiting(state, 'customer error');
    await expectCurrentDialog(state, pending, 'submit failed');

    splitService.fetchCustomer.mockResolvedValueOnce({ ok: true, data: 'CUSTOMER-X' });
    pending = state.onOkClick();
    await expectCurrentDialog(state, pending, SPLIT_MESSAGES.customerLot('CUSTOMER-X'));

    expect(splitService.submitSplit).toHaveBeenCalledTimes(BLOCK_SPLIT_ON_CUSTOMER_LOT ? 1 : 2);
    wrapper.unmount();
  });

  it('loads query array LOT IDs on mount', async () => {
    route.query = { lotId: ['abc1234x', 'ignored'] };
    const { state, wrapper } = mountComposable();
    await flushPromises();

    expect(state.lotNo.value).toBe('ABC1234X');
    expect(splitService.fetchLotInfo).toHaveBeenCalledWith('ABC1234X', 'TEST-FAB');
    expect(okDialog.show).not.toHaveBeenCalled();

    wrapper.unmount();
    expect(state.lotNo.value).toBe('');
  });
});
