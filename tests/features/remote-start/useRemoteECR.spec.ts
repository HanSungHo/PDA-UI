import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useRemoteEtchCommRcp } from '~/features/remote-start/composables/useRemoteEtchCommRcp';
import { remoteEtchService } from '~/features/remote-start/services/remoteEtchCommRcp.service';

describe('useRemoteEtchCommRcp Composable', () => {
  beforeEach(() => {
    // The composable uses a Pinia store, so a fresh active Pinia is required for each test.
    setActivePinia(createPinia());
    vi.restoreAllMocks();
  });

  describe('Initial State & Computed Properties', () => {
    it('should initialize inbound parameters and default titleText when ownerCode is empty', () => {
      const composable = useRemoteEtchCommRcp({
        LOTID: 'LOT_01',
        RECIPE: 'RCP_01',
        EQPID: 'EQP_01',
        OPERID: 'OP_01',
        OPERDESC: 'DESC',
      });

      expect(composable.receiveLotId.value).toBe('LOT_01');
      expect(composable.receiveRecipe.value).toBe('RCP_01');
      expect(composable.titleText.value).toBe('RCP 조건 (  )');
    });
  });

  describe('setData() and Business Rules', () => {
    it('Rule #1: should override receiveRecipe when backend returns STI_PROC_RCP', async () => {
      vi.spyOn(remoteEtchService, 'getEtchCommRcp').mockResolvedValue({
        isSuccessFul: true,
        result: {
          DOWNLOAD: 'Y',
          PROCESS_TYPE: 'eMAX CT',
          OWNERCODE: 'OWNER_A',
          STI_PROC_RCP: 'NEW_STI_RECIPE',
          COMMRCP: [],
        },
      });

      const { receiveRecipe, titleText, setData } = useRemoteEtchCommRcp();
      await setData();

      expect(receiveRecipe.value).toBe('NEW_STI_RECIPE');
      expect(titleText.value).toBe('RCP 조건 ( OWNER_A )');
    });

    it('Rule #5 & TE8500: should filter out rows with VALUE = "-" and configure 3 columns', async () => {
      vi.spyOn(remoteEtchService, 'getEtchCommRcp').mockResolvedValue({
        isSuccessFul: true,
        result: {
          DOWNLOAD: 'Y',
          PROCESS_TYPE: 'TE8500',
          COMM2ND: '45 초',
          COMMRCP: [
            { COL: '진행 TIME', VALUE: '45', RESULT: '' },
            { COL: 'REMOVE_ME', VALUE: '-', RESULT: '' },
            { COL: 'POWER', VALUE: '300', RESULT: '' },
          ],
        },
      });

      const { gridColumns, gridRows, ownerText, setData } = useRemoteEtchCommRcp();
      await setData();

      expect(ownerText.value).toBe('45 초');
      expect(gridColumns.value).toHaveLength(3);
      expect(gridRows.value).toHaveLength(2);
      expect(gridRows.value.some((r) => r.VALUE === '-')).toBe(false);
    });

    it('should format ownerText from PARA2ND & VALUE2ND when COMM2ND is empty', async () => {
      vi.spyOn(remoteEtchService, 'getEtchCommRcp').mockResolvedValue({
        isSuccessFul: true,
        result: {
          DOWNLOAD: 'Y',
          PROCESS_TYPE: 'DPS POLY',
          PARA2ND: 'PRESSURE',
          VALUE2ND: '120Pa',
          COMM2ND: '',
          COMMRCP: [],
        },
      });

      const { ownerText, setData } = useRemoteEtchCommRcp();
      await setData();

      expect(ownerText.value).toBe('PRESSURE : 120Pa 추가 반영');
    });

    it('should disable download capability (canDownload = false) when DOWNLOAD == "N"', async () => {
      vi.spyOn(remoteEtchService, 'getEtchCommRcp').mockResolvedValue({
        isSuccessFul: true,
        result: {
          DOWNLOAD: 'N',
          PROCESS_TYPE: 'TE8500',
          COMMRCP: [],
        },
      });

      const { canDownload, setData } = useRemoteEtchCommRcp();
      await setData();

      expect(canDownload.value).toBe(false);
    });

    it('Rule #8: should trigger warning popup when SAMPLE_CHK is present', async () => {
      vi.spyOn(remoteEtchService, 'getEtchCommRcp').mockResolvedValue({
        isSuccessFul: true,
        result: {
          SAMPLE_CHK: 'Sample Check Warning!',
          COMMRCP: [],
        },
      });

      const { dialogState, setData, closeAlert } = useRemoteEtchCommRcp();
      await setData();

      expect(dialogState.open).toBe(true);
      expect(dialogState.message).toBe('Sample Check Warning!');

      closeAlert();
      expect(dialogState.open).toBe(false);
    });

    it('should handle API failure or exception by disabling download and showing error dialog', async () => {
      vi.spyOn(remoteEtchService, 'getEtchCommRcp').mockRejectedValue(new Error('Network Crash'));

      const { canDownload, dialogState, setData } = useRemoteEtchCommRcp();
      await setData();

      expect(canDownload.value).toBe(false);
      expect(dialogState.open).toBe(true);
      expect(dialogState.message).toBe('Network Crash');
    });
  });

  describe('executeModify() & runModificationProcess()', () => {
    it('TE8500 Branch (Rule #2): should download by TIME and update "진행 TIME" cell', async () => {
      vi.spyOn(remoteEtchService, 'getEtchCommRcp').mockResolvedValue({
        isSuccessFul: true,
        result: {
          PROCESS_TYPE: 'TE8500',
          EQP_TYPE: 'TE8500',
          COMM2ND: '70 초',
          COMMRCP: [{ COL: '진행 TIME', VALUE: '70', RESULT: '' }],
        },
      });

      const downloadSpy = vi.spyOn(remoteEtchService, 'downloadRecipe').mockResolvedValue({
        isSuccessFul: true,
        result: { CHK: 'OK' },
      });

      const { setData, executeModify, confirmState, gridRows } = useRemoteEtchCommRcp();
      await setData();

      await executeModify();
      expect(confirmState.open).toBe(true);
      await confirmState.onConfirm?.();

      expect(downloadSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          chamber: 'TE8500',
          rmsPara: 'TIME',
          downValue: '70',
          step: '2',
        }),
      );

      const timeRow = gridRows.value.find((r) => r.COL === '진행 TIME');
      expect(timeRow?.RESULT).toBe('정상');
      expect(timeRow?.resultBgColor).toBe('#b30000e1');
    });

    it('TE8500 Branch: should handle download error response properly', async () => {
      vi.spyOn(remoteEtchService, 'getEtchCommRcp').mockResolvedValue({
        isSuccessFul: true,
        result: {
          PROCESS_TYPE: 'TE8500',
          EQP_TYPE: 'TE8500',
          COMM2ND: '30 초',
          COMMRCP: [{ COL: '진행 TIME', VALUE: '30', RESULT: '' }],
        },
      });

      vi.spyOn(remoteEtchService, 'downloadRecipe').mockResolvedValue({
        isSuccessFul: false,
        result: { CHK: 'D_FAIL' },
        errorMessage: 'Download Failed',
      });

      const { setData, executeModify, confirmState, dialogState } = useRemoteEtchCommRcp();
      await setData();
      await executeModify();
      await confirmState.onConfirm?.();

      expect(dialogState.open).toBe(true);
      expect(dialogState.message).toBe('Download Failed');
    });

    it('eMAX CT Branch (Rules #3 & #4): should batch same STEP with "@", skipping empty and "정상" rows', async () => {
      vi.spyOn(remoteEtchService, 'getEtchCommRcp').mockResolvedValue({
        isSuccessFul: true,
        result: {
          PROCESS_TYPE: 'eMAX CT',
          EQP_TYPE: 'eMAX',
          COMMRCP: [
            { CHAMBER: 'CH1', STEP: '1', RMS_PARANAME: 'P1', TUNE_VALUE: '10', RESULT: '' },
            { CHAMBER: 'CH1', STEP: '1', RMS_PARANAME: 'P2', TUNE_VALUE: '20', RESULT: '' },
            { CHAMBER: 'CH1', STEP: '2', RMS_PARANAME: 'P3', TUNE_VALUE: '', RESULT: '' }, // Skipped: empty TUNE_VALUE
            { CHAMBER: 'CH1', STEP: '2', RMS_PARANAME: 'P4', TUNE_VALUE: '40', RESULT: '정상' }, // Skipped: already success
            { CHAMBER: 'CH1', STEP: '3', RMS_PARANAME: 'P5', TUNE_VALUE: '50', RESULT: '' },
          ],
        },
      });

      const downloadSpy = vi.spyOn(remoteEtchService, 'downloadRecipe').mockResolvedValue({
        isSuccessFul: true,
        result: { CHK: 'OK' },
      });

      const { setData, executeModify, confirmState, gridRows } = useRemoteEtchCommRcp();
      await setData();
      await executeModify();
      await confirmState.onConfirm?.();

      // Called twice: Step 1 (batched P1@P2) and Step 3 (P5)
      expect(downloadSpy).toHaveBeenCalledTimes(2);

      expect(downloadSpy).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          step: '1',
          rmsPara: 'P1@P2',
          downValue: '10@20',
        }),
      );

      expect(downloadSpy).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          step: '3',
          rmsPara: 'P5',
          downValue: '50',
        }),
      );

      expect(gridRows.value[0].RESULT).toBe('정상');
      expect(gridRows.value[1].RESULT).toBe('정상');
    });

    it('should map failure status codes (D_FAIL, V_FAIL) to red background (#b3ff0000)', async () => {
      vi.spyOn(remoteEtchService, 'getEtchCommRcp').mockResolvedValue({
        isSuccessFul: true,
        result: {
          PROCESS_TYPE: 'TE8500',
          EQP_TYPE: 'TE8500',
          COMM2ND: '10 초',
          COMMRCP: [{ COL: '진행 TIME', VALUE: '10', RESULT: '' }],
        },
      });

      vi.spyOn(remoteEtchService, 'downloadRecipe').mockResolvedValue({
        isSuccessFul: true,
        result: { CHK: 'D_FAIL' },
      });

      const { setData, executeModify, confirmState, gridRows } = useRemoteEtchCommRcp();
      await setData();
      await executeModify();
      await confirmState.onConfirm?.();

      const row = gridRows.value[0];
      expect(row.RESULT).toBe('변경실패');
      expect(row.resultBgColor).toBe('#b3ff0000');
    });
  });
});
