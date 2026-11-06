import { okDialog } from 'src/services/ok-dialog.service';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  back: vi.fn(),
  getMainInfo: vi.fn(),
  getSubInfo: vi.fn(),
  getBodyInfo: vi.fn(),
}));

vi.mock('vue-router', () => ({ useRouter: () => ({ back: mocks.back }) }));
vi.mock('src/features/test-tuning/services/test-tuning.service', () => ({
  testTuningService: {
    getMainInfo: mocks.getMainInfo,
    getSubInfo: mocks.getSubInfo,
    getBodyInfo: mocks.getBodyInfo,
  },
}));

import { useTestTuningLogic } from 'src/features/test-tuning/composables/useTestTuning';

describe('useTestTuningLogic', () => {
  const focusEqpIdInput = vi.fn();

  function setup() {
    return useTestTuningLogic(focusEqpIdInput);
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    okDialog.confirm();
    okDialog.message.value = '';
    okDialog.title.value = '';
  });

  it('initializes with default values', () => {
    const logic = setup();

    expect(logic.editEqpId.value).toBe('');
    expect(logic.txtLot.value).toBe('');
    expect(logic.radioMode.value).toBe('TEST');
    expect(logic.isRadioTest.value).toBe(true);
    expect(logic.radioModeOptions).toEqual([
      { label: 'TEST', value: 'TEST' },
      { label: 'TUNING', value: 'TUNING' },
    ]);
    expect(logic.selectedMain.value).toBe('');
    expect(logic.selectedSub.value).toBe('');
    expect(logic.spinnerMainOptions.value).toEqual([]);
    expect(logic.spinnerSubOptions.value).toEqual([]);
    expect(logic.gridData.value).toEqual([]);
  });

  it('executes router.back when handleCancelClick is triggered', () => {
    const logic = setup();

    logic.handleCancelClick();

    expect(mocks.back).toHaveBeenCalledTimes(1);
  });

  describe('getMainInfo', () => {
    it('loads main info successfully and populates spinner options', async () => {
      mocks.getMainInfo.mockResolvedValueOnce({ ok: true, rcpGroup: 'MAIN1|MAIN2' });
      const logic = setup();
      logic.editEqpId.value = 'EQP01';

      await logic.getMainInfo();

      expect(mocks.getMainInfo).toHaveBeenCalledWith('EQP01');
      expect(logic.spinnerMainOptions.value).toEqual([
        { label: 'MAIN1', value: 'MAIN1' },
        { label: 'MAIN2', value: 'MAIN2' },
      ]);
      expect(logic.txtLot.value).toBe('');
      expect(logic.gridData.value).toEqual([]);
    });

    it('handles an empty RCP_GROUP on success without populating options', async () => {
      mocks.getMainInfo.mockResolvedValueOnce({ ok: true, rcpGroup: '' });
      const logic = setup();

      await logic.getMainInfo();

      expect(logic.spinnerMainOptions.value).toEqual([]);
    });

    it('shows the error dialog, clears the input and refocuses when the server rejects it', async () => {
      mocks.getMainInfo.mockResolvedValueOnce({ ok: false, message: 'Equipment not found' });
      const logic = setup();
      logic.editEqpId.value = 'INVALID';

      await logic.getMainInfo();

      expect(logic.editEqpId.value).toBe('');
      expect(okDialog.isOpen.value).toBe(true);
      expect(okDialog.title.value).toBe('에  러');
      expect(okDialog.message.value).toBe('Equipment not found');
      expect(focusEqpIdInput).toHaveBeenCalledTimes(1);
    });

    it('shows a generic error, clears the input and refocuses on a network rejection', async () => {
      mocks.getMainInfo.mockRejectedValueOnce(new Error('Network error'));
      const logic = setup();
      logic.editEqpId.value = 'EQP01';

      await logic.getMainInfo();

      expect(logic.editEqpId.value).toBe('');
      expect(okDialog.message.value).toBe('API request failed');
      expect(focusEqpIdInput).toHaveBeenCalledTimes(1);
    });
  });

  describe('getSubInfo', () => {
    it('loads sub info for the selected main group and current mode', async () => {
      mocks.getSubInfo.mockResolvedValueOnce({ ok: true, subId: 'SUB1|SUB2' });
      const logic = setup();
      logic.editEqpId.value = 'EQP01';
      logic.selectedMain.value = 'MAIN1';
      logic.radioMode.value = 'TUNING';

      await logic.getSubInfo();

      expect(mocks.getSubInfo).toHaveBeenCalledWith('EQP01', 'MAIN1', 'TUNING');
      expect(logic.spinnerSubOptions.value).toEqual([
        { label: 'SUB1', value: 'SUB1' },
        { label: 'SUB2', value: 'SUB2' },
      ]);
    });

    it('handles an empty SUBID on success', async () => {
      mocks.getSubInfo.mockResolvedValueOnce({ ok: true, subId: '' });
      const logic = setup();
      logic.selectedMain.value = 'MAIN1';

      await logic.getSubInfo();

      expect(logic.spinnerSubOptions.value).toEqual([]);
    });

    it('shows the error dialog on failure and on network rejection, without refocusing', async () => {
      mocks.getSubInfo.mockResolvedValueOnce({ ok: false, message: 'Sub Info Failed' });
      const logic = setup();
      logic.selectedMain.value = 'MAIN1';

      await logic.getSubInfo();
      expect(okDialog.message.value).toBe('Sub Info Failed');
      expect(focusEqpIdInput).not.toHaveBeenCalled();

      mocks.getSubInfo.mockRejectedValueOnce(new Error('Sub Network Error'));
      await logic.getSubInfo();
      expect(okDialog.message.value).toBe('API request failed');
    });

    it('does not call the server when no main group is selected', async () => {
      const logic = setup();
      logic.selectedMain.value = '';

      await logic.getSubInfo();

      expect(mocks.getSubInfo).not.toHaveBeenCalled();
    });
  });

  describe('getBodyInfo', () => {
    it('loads body rows and sets LOTID in TEST mode', async () => {
      mocks.getBodyInfo.mockResolvedValueOnce({
        ok: true,
        lotId: 'LOT_TEST_99',
        body: [{ SLOT: '1', RECIPE: 'REC_A', CHAMBER: 'CH1', MEAS_RECIPE: 'M_REC' }],
      });
      const logic = setup();
      logic.editEqpId.value = 'EQP01';
      logic.selectedMain.value = 'MAIN1';
      logic.selectedSub.value = 'SUB1';
      logic.radioMode.value = 'TEST';

      await logic.getBodyInfo();

      expect(mocks.getBodyInfo).toHaveBeenCalledWith('EQP01', 'MAIN1', 'SUB1', 'TEST');
      expect(logic.txtLot.value).toBe('LOT_TEST_99');
      expect(logic.gridData.value).toHaveLength(1);
    });

    it('does not assign LOTID to txtLot in TUNING mode', async () => {
      mocks.getBodyInfo.mockResolvedValueOnce({
        ok: true,
        lotId: 'LOT_TUNING_99',
        body: [{ PROD_RCP: 'RCP1', CHAM_STEP: 'ST1', BE_TIME: '10', AF_TIME: '12' }],
      });
      const logic = setup();
      logic.editEqpId.value = 'EQP01';
      logic.selectedMain.value = 'MAIN1';
      logic.selectedSub.value = 'SUB1';
      logic.radioMode.value = 'TUNING';

      await logic.getBodyInfo();

      expect(mocks.getBodyInfo).toHaveBeenCalledWith('EQP01', 'MAIN1', 'SUB1', 'TUNING');
      expect(logic.txtLot.value).toBe('');
      expect(logic.gridData.value).toHaveLength(1);
    });

    it('shows the error dialog on failure and on network rejection', async () => {
      mocks.getBodyInfo.mockResolvedValueOnce({ ok: false, message: 'Body Info Failed' });
      const logic = setup();
      logic.selectedMain.value = 'MAIN1';
      logic.selectedSub.value = 'SUB1';

      await logic.getBodyInfo();
      expect(okDialog.message.value).toBe('Body Info Failed');

      mocks.getBodyInfo.mockRejectedValueOnce(new Error('Body Network Error'));
      await logic.getBodyInfo();
      expect(okDialog.message.value).toBe('API request failed');
    });

    it('does not call the server unless both MAIN and SUB are selected', async () => {
      const logic = setup();

      logic.selectedMain.value = '';
      logic.selectedSub.value = 'SUB1';
      await logic.getBodyInfo();

      logic.selectedMain.value = 'MAIN1';
      logic.selectedSub.value = '';
      await logic.getBodyInfo();

      expect(mocks.getBodyInfo).not.toHaveBeenCalled();
    });
  });

  describe('handleEditorAction (barcode parity with BarcodeStyle.eqpId)', () => {
    it('parses a barcode scan, strips the EQP- prefix and trailing scanner char, then searches', async () => {
      mocks.getMainInfo.mockResolvedValue({ ok: true, rcpGroup: 'GRP1' });
      const logic = setup();

      logic.editEqpId.value = 'EQP-TT01X';
      await logic.handleEditorAction();

      expect(logic.editEqpId.value).toBe('TT01');
      expect(mocks.getMainInfo).toHaveBeenCalledWith('TT01');
    });

    it('does not search when the barcode has no equipment id after the EQP- prefix', async () => {
      mocks.getMainInfo.mockResolvedValue({ ok: true, rcpGroup: 'GRP1' });
      const logic = setup();

      logic.editEqpId.value = 'EQP-';
      await logic.handleEditorAction();

      expect(mocks.getMainInfo).not.toHaveBeenCalled();
    });

    it('searches directly for a manually typed machine name without the EQP- prefix', async () => {
      mocks.getMainInfo.mockResolvedValue({ ok: true, rcpGroup: 'GRP1' });
      const logic = setup();

      logic.editEqpId.value = 'PLAIN_EQP';
      await logic.handleEditorAction();

      expect(mocks.getMainInfo).toHaveBeenCalledWith('PLAIN_EQP');
    });
  });

  it('triggers getMainInfo on handleSearchClick', async () => {
    mocks.getMainInfo.mockResolvedValue({ ok: true, rcpGroup: 'GRP1' });
    const logic = setup();
    logic.editEqpId.value = 'MACHINE_01';

    await logic.handleSearchClick();

    expect(mocks.getMainInfo).toHaveBeenCalledTimes(1);
  });

  it('switches mode and reloads main info, ignoring unknown values and the already selected mode', async () => {
    mocks.getMainInfo.mockResolvedValue({ ok: true, rcpGroup: 'GRP1' });
    const logic = setup();

    await logic.handleRadioChange('TEST');
    expect(mocks.getMainInfo).not.toHaveBeenCalled();

    await logic.handleRadioChange('OTHER');
    expect(logic.radioMode.value).toBe('TEST');
    expect(mocks.getMainInfo).not.toHaveBeenCalled();

    await logic.handleRadioChange('TUNING');
    expect(logic.radioMode.value).toBe('TUNING');
    expect(mocks.getMainInfo).toHaveBeenCalledTimes(1);
  });

  it('triggers onMainSpinnerChange and onSubSpinnerChange correctly', async () => {
    mocks.getSubInfo.mockResolvedValue({ ok: true, subId: 'SUB1' });
    mocks.getBodyInfo.mockResolvedValue({ ok: true, body: [] });
    const logic = setup();
    logic.editEqpId.value = 'EQP01';

    await logic.onMainSpinnerChange('MAIN1');
    expect(logic.selectedMain.value).toBe('MAIN1');
    expect(mocks.getSubInfo).toHaveBeenCalledTimes(1);

    await logic.onSubSpinnerChange('SUB1');
    expect(logic.selectedSub.value).toBe('SUB1');
    expect(mocks.getBodyInfo).toHaveBeenCalledTimes(1);
  });

  describe('columns', () => {
    it('falls back to a 600px width when baseWidth is 0', () => {
      const logic = setup();
      logic.baseWidth.value = 0;

      const cols = logic.columns.value;

      expect(cols).toHaveLength(4);
      expect(cols[0]?.size).toBe(Math.floor((600 / 24) * 2));
    });

    it('computes TEST and TUNING columns with exact width ratios and the AF_TIME cell style', () => {
      const logic = setup();
      logic.baseWidth.value = 1200;

      const testCols = logic.columns.value;
      expect(testCols).toHaveLength(4);
      expect(testCols[0]?.prop).toBe('SLOT');
      expect(testCols[0]?.size).toBe(Math.floor((1200 / 24) * 2));
      expect(testCols[3]?.prop).toBe('MEAS_RECIPE');
      expect(testCols[3]?.size).toBe(Math.floor((1200 / 24) * 11));

      logic.radioMode.value = 'TUNING';
      const tuningCols = logic.columns.value;
      expect(tuningCols).toHaveLength(4);
      expect(tuningCols[0]?.prop).toBe('PROD_RCP');
      expect(tuningCols[0]?.size).toBe(Math.floor((1200 / 6) * 3));
      expect(tuningCols[3]?.prop).toBe('AF_TIME');
      expect(tuningCols[3]?.size).toBe(Math.floor(1200 / 6));

      const styles = tuningCols[3]?.cellProperties?.();
      expect(styles?.style?.backgroundColor).toBe('#ffe0deb3');
      expect(styles?.style?.color).toBe('#000000');
    });
  });
});
