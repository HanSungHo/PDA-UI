import { createPinia, setActivePinia } from 'pinia';
import { useMainStore } from 'src/features/main/stores/main.store';
import { useWafercodecheck } from 'src/features/wafer-code-check/composables/use-wafer-code-check';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  ComPareWaferType: vi.fn(),
  getWaferTYpe: vi.fn(),
}));
const barcode = vi.hoisted(() => ({
  barcodeStyleLotId: vi.fn(),
}));
vi.mock('src/features/wafer-code-check/services/wafer-code-check.service', () => api);
vi.mock('src/utils/barcode-style', () => barcode);

const lookupResponse = {
  isSuccessFul: true,
  messageBody: {
    ITEMS: { ITEM: [{ LOTNAME: 'LOT-01', WAFERTYPE: 'SILICON-200MM' }] },
    COMMNETLIST: { ITEM: [{ TYPEVALUE: 'NORMAL' }, { TYPEVALUE: 'CHANGE' }] },
  },
  errorMessage: '',
};

describe('Wafer Code Check workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    useMainStore().operatorId = 'OP-01';
    barcode.barcodeStyleLotId.mockImplementation((value: string) => ({
      isValid: value.startsWith(' '),
      parsedId: value.trim().replace(/.$/, ''),
    }));
  });

  it('starts blank with the reason dropdown disabled', () => {
    const { state } = useWafercodecheck();
    expect(state).toMatchObject({
      editRunBoxNo: '',
      editInitialboxNo: '',
      txtInitialName: '',
      txtLotName: '',
      txtWaferName: '',
      reasonOptions: [],
      reasonEnabled: false,
    });
  });

  it('copies INITIAL BOX input to its display and clears the editor', () => {
    const { state, getinitialInfo } = useWafercodecheck();
    state.editInitialboxNo = 'INITIAL-01';

    expect(getinitialInfo()).toBe(true);
    expect([state.txtInitialName, state.editInitialboxNo]).toEqual(['INITIAL-01', '']);
  });

  it('continues empty INITIAL validation by copying and clearing the empty input', () => {
    const { state, getinitialInfo } = useWafercodecheck();

    expect(getinitialInfo()).toBe(true);
    expect([state.txtInitialName, state.editInitialboxNo]).toEqual(['', '']);
    expect(state.dialog?.message).toBe('INITIAL BOX 이름을입력하여 주세요.');
  });

  it('maps GETWAFERTYPE values, leaves reason blank, and clears RUN input', async () => {
    const { state, getWaferInfo } = useWafercodecheck();
    state.editRunBoxNo = 'RUN-01';
    api.getWaferTYpe.mockResolvedValueOnce(lookupResponse);

    await expect(getWaferInfo()).resolves.toBe(true);
    expect(api.getWaferTYpe).toHaveBeenCalledWith('RUN-01');
    expect(state).toMatchObject({
      editRunBoxNo: '',
      txtLotName: 'LOT-01',
      txtWaferName: 'SILICON-200MM',
      reasonOptions: [
        { label: 'NORMAL', value: 'NORMAL' },
        { label: 'CHANGE', value: 'CHANGE' },
      ],
      selectedReason: undefined,
      reasonEnabled: true,
    });
  });

  it('sends an empty RUN lookup after showing the legacy validation alert', async () => {
    const { state, getWaferInfo } = useWafercodecheck();
    api.getWaferTYpe.mockResolvedValueOnce({
      ...lookupResponse,
      messageBody: { ITEMS: { ITEM: [] }, COMMNETLIST: { ITEM: [] } },
    });

    await expect(getWaferInfo()).resolves.toBe(false);
    expect(api.getWaferTYpe).toHaveBeenCalledWith('');
    expect(state.dialog?.message).toBe('RUN NAME을 입력하여 주세요.');
  });

  it('handles a successful response with no ITEMS without indexing an absent row', async () => {
    const { state, getWaferInfo } = useWafercodecheck();
    state.editRunBoxNo = 'RUN-EMPTY';
    api.getWaferTYpe.mockResolvedValueOnce({
      ...lookupResponse,
      messageBody: { ITEMS: { ITEM: [] }, COMMNETLIST: { ITEM: [] } },
    });

    await expect(getWaferInfo()).resolves.toBe(false);
    expect(state).toMatchObject({ txtLotName: '', txtWaferName: '', reasonEnabled: false });
    expect(state.dialog).toBeNull();
  });

  it('shows lookup failures and clears RUN input', async () => {
    const { state, getWaferInfo } = useWafercodecheck();
    state.editRunBoxNo = 'RUN-FAIL';
    api.getWaferTYpe.mockResolvedValueOnce({
      isSuccessFul: false,
      messageBody: {},
      errorMessage: 'RUN NAME을 찾을 수 없습니다.',
    });

    await expect(getWaferInfo()).resolves.toBe(false);
    expect(state.editRunBoxNo).toBe('');
    expect(state.dialog?.message).toBe('RUN NAME을 찾을 수 없습니다.');
  });

  it('requires confirmation when both INITIAL BOX and RUN data are absent', async () => {
    const store = useWafercodecheck();
    await store.executewf();
    expect(store.state.dialog).toMatchObject({ kind: 'confirm' });

    store.cancelDialog();
    expect(store.state.dialog).toBeNull();
    expect(api.ComPareWaferType).not.toHaveBeenCalled();
  });

  it('uses scanner parsing before the RUN lookup', async () => {
    const { state, handleRunEnter } = useWafercodecheck();
    state.editRunBoxNo = ' RUN-01#';
    api.getWaferTYpe.mockResolvedValueOnce(lookupResponse);

    await expect(handleRunEnter()).resolves.toBe(true);
    expect(barcode.barcodeStyleLotId).toHaveBeenCalledWith(' RUN-01#');
    expect(api.getWaferTYpe).toHaveBeenCalledWith('RUN-01');
  });

  it('retains result fields after compare NG', async () => {
    const { state, executewf, acknowledgeDialog } = useWafercodecheck();
    Object.assign(state, {
      txtLotName: 'LOT-01',
      txtWaferName: 'SILICON-200MM',
      txtInitialName: 'INITIAL-01',
      selectedReason: 'NORMAL',
      reasonEnabled: true,
    });
    api.ComPareWaferType.mockResolvedValueOnce({
      isSuccessFul: true,
      messageBody: { COMPARERESULT: 'NG' },
      errorMessage: '',
    });

    await executewf();
    expect(api.ComPareWaferType).toHaveBeenCalledWith(
      'LOT-01',
      'SILICON-200MM',
      'INITIAL-01',
      'NORMAL',
      'OP-01',
    );
    expect(state.dialog?.message).toBe('WAFER자재 확인에 실패 하였습니다.');
    acknowledgeDialog();
    expect([state.txtLotName, state.txtInitialName, state.txtWaferName]).toEqual([
      'LOT-01',
      'INITIAL-01',
      'SILICON-200MM',
    ]);
  });

  it('clears displayed values only after acknowledging compare success', async () => {
    const { state, executewf, acknowledgeDialog } = useWafercodecheck();
    Object.assign(state, {
      txtLotName: 'LOT-01',
      txtWaferName: 'SILICON-200MM',
      txtInitialName: 'INITIAL-01',
      selectedReason: 'NORMAL',
      reasonEnabled: true,
    });
    api.ComPareWaferType.mockResolvedValueOnce({
      isSuccessFul: true,
      messageBody: { COMPARERESULT: 'OK' },
      errorMessage: '',
    });

    await executewf();
    expect(state.txtLotName).toBe('LOT-01');
    expect(acknowledgeDialog()).toBe('run');
    expect(state).toMatchObject({
      txtLotName: '',
      txtInitialName: '',
      txtWaferName: '',
      reasonEnabled: false,
    });
  });
});
