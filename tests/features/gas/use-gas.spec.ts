import { flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { type GasUi, useGas } from 'src/features/gas/composables/use-gas';
import type { GasMessageResponse } from 'src/features/gas/types/gas.types';
import { useMainStore } from 'src/features/main/stores/main.store';
import { okDialog } from 'src/services/ok-dialog.service';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ok = (messageBody: Record<string, unknown> = {}): GasMessageResponse => ({
  isSuccessFul: true,
  messageBody,
  errorMessage: '',
});
const failed: GasMessageResponse = { isSuccessFul: false, messageBody: {}, errorMessage: 'x' };

const cabinetBody = (type: string) => ({
  ITEMS: { ITEM: [{ CABINET: 'CAB-1', GAS: 'N2', TYPE: type }] },
  PRESSURE: '5.2',
  WEIGHT: '41.7',
  USAGES: { ITEM: [{ USAGEDATE: 'ignored' }] },
});

const service = vi.hoisted(() => ({ GetCabinetInfo: vi.fn(), SetGasusage: vi.fn() }));
vi.mock('src/features/gas/services/gas.service', () => service);
let events: string[];
let ui: GasUi;

describe('useGas', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    useMainStore().operatorId = 'OP-1';
    vi.clearAllMocks();
    events = [];
    ui = {
      hideKeyboard: vi.fn(() => events.push('hide')),
      focusCabinet: vi.fn(() => events.push('cabinet')),
      focusPressure: vi.fn(() => events.push('pressure')),
    };
  });

  afterEach(() => {
    okDialog.confirm();
  });

  describe('getData', () => {
    it('LIFE-03: starts with empty values and the weight row enabled', () => {
      const { state } = useGas(ui);
      expect(state).toMatchObject({
        editCabinetNo: '',
        txtCabinet: '',
        txtGas: '',
        txtPressure: '',
        txtWeight: '',
        editPressure: '',
        editWeight: '',
        editComment: '',
        weightEnabled: true,
        loading: false,
      });
    });

    it('VALID-01/EVENT-08/EVENT-09: blank cabinet shows the error, focuses pressure then cabinet, no API', async () => {
      const { state, getData } = useGas(ui);
      state.editCabinetNo = '   ';
      const pending = getData();
      expect(service.GetCabinetInfo).not.toHaveBeenCalled();
      expect(okDialog.isOpen.value).toBe(true);
      expect(okDialog.title.value).toBe('에  러');
      expect(okDialog.message.value).toBe('CABINET NO가 확인되지 않습니다.');
      expect(okDialog.confirmLabel.value).toBe('확인');
      // Legacy OkDialog.show blocks: the cabinet refocus happens only after OK.
      expect(events).toEqual(['pressure', 'hide']);
      okDialog.confirm();
      await pending;
      expect(events).toEqual(['pressure', 'hide', 'cabinet']);
    });

    it('API-01/02/03: sends the raw cabinet, fills fields, clears inputs, shows weight for TYPE=Y', async () => {
      service.GetCabinetInfo.mockResolvedValue(ok(cabinetBody('Y')));
      const { state, getData } = useGas(ui);
      state.editCabinetNo = 'CAB-1';
      state.editPressure = 'old';
      state.editWeight = 'old';
      state.weightEnabled = false;
      await getData();
      expect(service.GetCabinetInfo).toHaveBeenCalledWith('CAB-1');
      expect(state).toMatchObject({
        txtCabinet: 'CAB-1',
        txtGas: 'N2',
        txtPressure: '5.2',
        txtWeight: '41.7',
        editPressure: '',
        editWeight: '',
        weightEnabled: true,
        loading: false,
      });
      expect(okDialog.isOpen.value).toBe(false);
    });

    it('API-03: TYPE other than Y hides/disables the weight row on every lookup', async () => {
      service.GetCabinetInfo.mockResolvedValue(ok(cabinetBody('N')));
      const { state, getData } = useGas(ui);
      state.editCabinetNo = 'CAB-1';
      await getData();
      expect(state.weightEnabled).toBe(false);
    });

    it('API-02: handles a single-object ITEMS, numeric fields and missing PRESSURE/WEIGHT', async () => {
      service.GetCabinetInfo.mockResolvedValue(ok({ ITEMS: { CABINET: 7, GAS: 'AR', TYPE: 'Y' } }));
      const { state, getData } = useGas(ui);
      state.editCabinetNo = 'C';
      await getData();
      expect(state).toMatchObject({
        txtCabinet: '7',
        txtGas: 'AR',
        txtPressure: '',
        txtWeight: '',
      });
    });

    it('API-02: ITEMS in a plain array are read and non-record entries are skipped', async () => {
      service.GetCabinetInfo.mockResolvedValue(
        ok({ ITEMS: ['skip', { CABINET: 'A1', GAS: 'G1', TYPE: 'Y' }] }),
      );
      const { state, getData } = useGas(ui);
      state.editCabinetNo = 'C';
      await getData();
      expect(state.txtCabinet).toBe('A1');
    });

    it('API-04: failure response is silent and keeps the form untouched', async () => {
      service.GetCabinetInfo.mockResolvedValue(failed);
      const { state, getData } = useGas(ui);
      state.editCabinetNo = 'C';
      state.txtCabinet = 'KEEP';
      await getData();
      expect(state.txtCabinet).toBe('KEEP');
      expect(okDialog.isOpen.value).toBe(false);
      expect(state.loading).toBe(false);
    });

    it('API-04: a rejected request is silent', async () => {
      service.GetCabinetInfo.mockRejectedValue(new Error('network'));
      const { state, getData } = useGas(ui);
      state.editCabinetNo = 'C';
      await getData();
      expect(okDialog.isOpen.value).toBe(false);
      expect(state.loading).toBe(false);
    });

    it('R4: empty ITEMS leaves every field untouched without a dialog', async () => {
      service.GetCabinetInfo.mockResolvedValue(ok({ ITEMS: { ITEM: [] }, PRESSURE: '9' }));
      const { state, getData } = useGas(ui);
      state.editCabinetNo = 'C';
      state.txtCabinet = 'KEEP';
      state.editPressure = '1';
      await getData();
      expect(state).toMatchObject({ txtCabinet: 'KEEP', editPressure: '1', txtPressure: '' });
      expect(okDialog.isOpen.value).toBe(false);
    });

    it('R4: a missing ITEMS key is also a silent no-op', async () => {
      service.GetCabinetInfo.mockResolvedValue(ok({}));
      const { state, getData } = useGas(ui);
      state.editCabinetNo = 'C';
      await getData();
      expect(state.txtCabinet).toBe('');
    });

    it('EVENT-09: pressure gets focus before the response resolves', async () => {
      let resolve!: (value: GasMessageResponse) => void;
      service.GetCabinetInfo.mockReturnValue(new Promise((r) => (resolve = r)));
      const { state, getData } = useGas(ui);
      state.editCabinetNo = 'C';
      const pending = getData();
      expect(events).toEqual(['pressure', 'hide']);
      expect(state.loading).toBe(true);
      resolve(ok(cabinetBody('Y')));
      await pending;
    });

    it('ignores a lookup while another request is loading', async () => {
      const { state, getData } = useGas(ui);
      state.loading = true;
      await getData();
      expect(service.GetCabinetInfo).not.toHaveBeenCalled();
      expect(events).toEqual([]);
    });
  });

  describe('setData', () => {
    function filled() {
      const gas = useGas(ui);
      Object.assign(gas.state, {
        editCabinetNo: 'CAB-1',
        txtCabinet: 'CAB-1',
        txtGas: 'N2',
        editPressure: '3.0',
        editWeight: '40',
        editComment: 'NOTE',
        weightEnabled: true,
      });
      return gas;
    }

    it.each([
      ['txtCabinet', 'CABINET NO가 확인되지 않습니다.'],
      ['txtGas', 'GAS가 확인되지 않습니다.'],
      ['editPressure', '압력값을 입력 해야합니다.'],
      ['editWeight', '무게를 입력 해야합니다.'],
    ] as const)(
      'VALID-02: blank %s shows its own error and skips the API',
      async (field, message) => {
        const gas = filled();
        gas.state[field] = '  ';
        const pending = gas.setData();
        expect(service.SetGasusage).not.toHaveBeenCalled();
        expect(okDialog.title.value).toBe('에  러');
        expect(okDialog.message.value).toBe(message);
        okDialog.confirm();
        await pending;
        expect(events).toEqual(['hide']);
      },
    );

    it('VALID-02: earlier checks win over later ones', async () => {
      const gas = filled();
      Object.assign(gas.state, { txtCabinet: '', txtGas: '', editPressure: '', editWeight: '' });
      const pending = gas.setData();
      expect(okDialog.message.value).toBe('CABINET NO가 확인되지 않습니다.');
      okDialog.confirm();
      await pending;
    });

    it('VALID-02: weight is not required when the weight row is disabled', async () => {
      service.SetGasusage.mockResolvedValue(failed);
      const gas = filled();
      Object.assign(gas.state, { weightEnabled: false, editWeight: '' });
      await gas.setData();
      expect(service.SetGasusage).toHaveBeenCalledWith('CAB-1', 'OP-1', '3.0', '', 'NOTE');
      expect(okDialog.isOpen.value).toBe(false);
    });

    it('API-05/06: sends the legacy values, shows the info dialog, re-fetches, focuses cabinet, keeps COMMENT', async () => {
      service.SetGasusage.mockResolvedValue(ok({ OK: 'Y' }));
      service.GetCabinetInfo.mockResolvedValue(ok(cabinetBody('Y')));
      const gas = filled();
      const pending = gas.setData();
      await flushPromises();
      expect(service.SetGasusage).toHaveBeenCalledWith('CAB-1', 'OP-1', '3.0', '40', 'NOTE');
      expect(okDialog.title.value).toBe('알  림');
      expect(okDialog.message.value).toBe('Data가 입력되었습니다.');
      expect(okDialog.confirmLabel.value).toBe('확인');
      // Legacy OkDialog.show blocks: the refresh and focus move happen only after OK.
      expect(service.GetCabinetInfo).not.toHaveBeenCalled();
      expect(events).toEqual(['hide']);
      okDialog.confirm();
      await pending;
      expect(service.GetCabinetInfo).toHaveBeenCalledWith('CAB-1');
      expect(events).toEqual(['hide', 'pressure', 'hide', 'cabinet']);
      expect(gas.state.editComment).toBe('NOTE');
      expect(gas.state).toMatchObject({ editPressure: '', editWeight: '', txtPressure: '5.2' });
    });

    it('API-07: a failed or rejected save is silent and does not re-fetch', async () => {
      const gas = filled();
      service.SetGasusage.mockResolvedValueOnce(failed);
      await gas.setData();
      service.SetGasusage.mockRejectedValueOnce(new Error('network'));
      await gas.setData();
      expect(service.GetCabinetInfo).not.toHaveBeenCalled();
      expect(okDialog.isOpen.value).toBe(false);
      expect(gas.state.loading).toBe(false);
    });

    it('ignores a save while loading', async () => {
      const gas = filled();
      gas.state.loading = true;
      await gas.setData();
      expect(service.SetGasusage).not.toHaveBeenCalled();
    });
  });

  describe('barcode Enter and clearData', () => {
    it('EVENT-02/03: valid barcode rewrites the field and searches', async () => {
      service.GetCabinetInfo.mockResolvedValue(ok(cabinetBody('Y')));
      const { state, onCabinetEnter } = useGas(ui);
      state.editCabinetNo = ' $ CAB-1X';
      await onCabinetEnter();
      expect(state.editCabinetNo).toBe('CAB-1');
      expect(service.GetCabinetInfo).toHaveBeenCalledWith('CAB-1');
    });

    it('EVENT-02/03: invalid barcode shows READING ERROR and clears the form (RULE-01)', async () => {
      const { state, onCabinetEnter } = useGas(ui);
      Object.assign(state, {
        editCabinetNo: 'NOSPACE',
        txtCabinet: 'A',
        txtGas: 'B',
        txtPressure: 'P',
        txtWeight: 'W',
        editPressure: '1',
        editWeight: '2',
        editComment: 'C',
        weightEnabled: false,
      });
      await onCabinetEnter();
      expect(service.GetCabinetInfo).not.toHaveBeenCalled();
      expect(okDialog.title.value).toBe('READING ERROR');
      expect(okDialog.message.value).toBe('LOT#를 읽어주세요.');
      expect(state).toMatchObject({
        editCabinetNo: '',
        txtCabinet: '',
        txtGas: '',
        editPressure: '',
        editWeight: '',
        editComment: '',
        txtPressure: 'P',
        txtWeight: 'W',
        weightEnabled: false,
      });
      expect(events).toEqual(['cabinet']);
    });

    it('EVENT-03: a barcode that parses to an empty value counts as invalid', async () => {
      const { state, onCabinetEnter } = useGas(ui);
      state.editCabinetNo = ' X';
      await onCabinetEnter();
      expect(service.GetCabinetInfo).not.toHaveBeenCalled();
      expect(events).toEqual(['cabinet']);
    });
  });
});
