import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockService, mockCreateDemoMeasureInfo } = vi.hoisted(() => ({
  mockService: {
    getMeasureInfo: vi.fn(),
    getSlotInfo: vi.fn(),
    checkDiCycle: vi.fn(),
    submitMeasureSet: vi.fn(),
    moveIn: vi.fn(),
  },
  mockCreateDemoMeasureInfo: vi.fn(),
}));

vi.mock('../../../src/features/move-in/services/mock-process-inquire.service', () => ({
  __esModule: true,
  default: mockService,
  createDemoMeasureInfo: mockCreateDemoMeasureInfo,
}));

import { useProcessInquire } from '../../../src/features/move-in/composables/useProcessInquire';

describe('useProcessInquire', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('alert', vi.fn());
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true),
    );
  });

  it('toggles selected measure rows on click', () => {
    const { rows, toggleMeasureRow } = useProcessInquire();

    rows.value = [
      {
        id: '1',
        processName: 'Dimension check',
        subOperation: 'CD',
        status: 'N',
        description: 'Dimension check',
      },
    ];

    toggleMeasureRow(rows.value[0]);
    expect(rows.value[0].status).toBe('Y');

    toggleMeasureRow(rows.value[0]);
    expect(rows.value[0].status).toBe('N');
  });

  it('does not toggle rows while move-in is running', () => {
    const { rows, isMoveInRunning, toggleMeasureRow } = useProcessInquire();

    rows.value = [
      {
        id: '1',
        processName: 'Dimension check',
        subOperation: 'CD',
        status: 'N',
        description: 'Dimension check',
      },
    ];
    isMoveInRunning.value = true;

    toggleMeasureRow(rows.value[0]);
    expect(rows.value[0].status).toBe('N');
  });

  it('validates selection rules for empty, multi-select, and skip conditions', () => {
    const { rows, skipCurrentProcess, validateSelection } = useProcessInquire();

    rows.value = [];
    expect(validateSelection()).toBe('계측할 공정을 선택하세요.');

    rows.value = [
      {
        id: '1',
        processName: 'Dimension check',
        subOperation: 'CD',
        status: 'Y',
        description: 'Dimension check',
      },
      {
        id: '2',
        processName: 'Overlay check',
        subOperation: 'OVER',
        status: 'Y',
        description: 'Overlay check',
      },
    ];
    skipCurrentProcess.value = false;
    expect(validateSelection()).toBe('계측할 공정을 하나만 선택하세요.');

    skipCurrentProcess.value = true;
    expect(validateSelection()).toBe('');
  });

  it('loads measure info successfully and maps response fields into form state', async () => {
    const { form, rows, loadMeasureInfo } = useProcessInquire();

    mockService.getMeasureInfo.mockResolvedValue({
      status: 200,
      data: {
        product: 'PRODUCT-NEW',
        photoJobCode: 'JOB-NEW',
        processStep: 'VI',
        operation: 'OP',
        subOperation: 'A1',
        quantity: '12',
        slotList: '11,12',
        waferList: '13,14',
        semSlotList: '21,22',
        semWaferList: '23,24',
        measureItems: [
          {
            id: '1',
            processName: 'Dimension check',
            subOperation: 'CD',
            status: 'N',
            description: 'Dimension check',
          },
        ],
      },
    });

    await loadMeasureInfo();

    expect(mockService.getMeasureInfo).toHaveBeenCalledWith('LOT-DEMO-001', 'VI(OP01A1)');
    expect(rows.value).toHaveLength(1);
    expect(form.productName).toBe('PRODUCT-NEW');
    expect(form.quantity).toBe('12');
    expect(form.currentSlot).toBe('11,12');
    expect(form.currentWf).toBe('13,14');
    expect(form.semSlot).toBe('21,22');
    expect(form.semWf).toBe('23,24');
  });

  it('falls back to demo data when measure info request throws', async () => {
    const { rows, loadMeasureInfo } = useProcessInquire();

    mockCreateDemoMeasureInfo.mockReturnValue({
      measureItems: [
        {
          id: '7',
          processName: 'Fallback item',
          subOperation: 'ETC',
          status: 'N',
          description: 'Fallback item',
        },
      ],
    });
    mockService.getMeasureInfo.mockRejectedValue(new Error('network error'));

    await loadMeasureInfo();

    expect(mockCreateDemoMeasureInfo).toHaveBeenCalled();
    expect(rows.value[0].subOperation).toBe('ETC');
  });

  it('uses demo data when measure info response is empty', async () => {
    const { rows, loadMeasureInfo } = useProcessInquire();

    mockCreateDemoMeasureInfo.mockReturnValue({
      measureItems: [
        {
          id: '9',
          processName: 'empty fallback',
          subOperation: 'EMPTY',
          status: 'N',
          description: 'empty fallback',
        },
      ],
    });
    mockService.getMeasureInfo.mockResolvedValue({
      status: 200,
      data: { measureItems: [] },
    });

    await loadMeasureInfo();

    expect(rows.value[0].subOperation).toBe('EMPTY');
  });

  it('loads slot info and stores the enabled wafer list', async () => {
    const { slotEnabledWaferList, loadSlotInfo } = useProcessInquire();

    mockService.getSlotInfo.mockResolvedValue({
      status: 200,
      data: { waferList: '07,08,09' },
    });

    await loadSlotInfo();

    expect(mockService.getSlotInfo).toHaveBeenCalledWith('LOT-DEMO-001');
    expect(slotEnabledWaferList.value).toBe('07,08,09');
  });

  it('falls back to the default wafer list when slot info fails', async () => {
    const { slotEnabledWaferList, loadSlotInfo } = useProcessInquire();

    mockService.getSlotInfo.mockRejectedValue(new Error('slot failure'));

    await loadSlotInfo();

    expect(slotEnabledWaferList.value).toBe('01,02,03,04');
  });

  it('returns true when skip confirmation is accepted after DI cycle check', async () => {
    const { rows, skipCurrentProcess, confirmSkipProcess } = useProcessInquire();

    rows.value = [
      {
        id: '1',
        processName: 'Dimension check',
        subOperation: 'CD',
        status: 'Y',
        description: 'Dimension check',
      },
    ];
    skipCurrentProcess.value = true;
    mockService.checkDiCycle.mockResolvedValue({
      status: 200,
      data: { diCycle: 'Y' },
    });

    const result = await confirmSkipProcess();

    expect(result).toBe(true);
    expect(mockService.checkDiCycle).toHaveBeenCalledWith('LOT-DEMO-001', 'OP01', ['CD']);
  });

  it('returns the fallback skip confirmation if DI cycle fails', async () => {
    const { rows, skipCurrentProcess, confirmSkipProcess } = useProcessInquire();

    rows.value = [
      {
        id: '1',
        processName: 'Dimension check',
        subOperation: 'CD',
        status: 'Y',
        description: 'Dimension check',
      },
    ];
    skipCurrentProcess.value = true;
    mockService.checkDiCycle.mockRejectedValue(new Error('check failed'));

    const result = await confirmSkipProcess();

    expect(result).toBe(true);
  });

  it('blocks submit when there is no selected process', async () => {
    const { rows, submitCurrentMeasure } = useProcessInquire();

    rows.value = [];

    await submitCurrentMeasure();

    expect(globalThis.alert).toHaveBeenCalledWith('계측할 공정을 선택하세요.');
    expect(mockService.submitMeasureSet).not.toHaveBeenCalled();
  });

  it('submits a valid measure payload and resolves successfully', async () => {
    const { form, rows, submitCurrentMeasure } = useProcessInquire();

    rows.value = [
      {
        id: '1',
        processName: 'Dimension check',
        subOperation: 'CD',
        status: 'Y',
        description: 'Dimension check',
      },
    ];
    form.quantity = '25';
    form.currentSlot = '01,02';
    form.currentWf = '01,02';
    form.semSlot = '03,04';
    form.semWf = '03,04';
    mockService.submitMeasureSet.mockResolvedValue({ status: 200 });

    await submitCurrentMeasure();

    expect(mockService.submitMeasureSet).toHaveBeenCalledWith({
      lotId: 'LOT-DEMO-001',
      facility: 'KFAB',
      operation: 'OP01',
      subOperation: 'CD',
      qty: '25',
      slotList: '01,02',
      waferList: '01,02',
      semSlotList: '03,04',
      semWaferList: '03,04',
    });
  });

  it('alerts when submit response is an error status', async () => {
    const { rows, submitCurrentMeasure } = useProcessInquire();

    rows.value = [
      {
        id: '1',
        processName: 'Dimension check',
        subOperation: 'CD',
        status: 'Y',
        description: 'Dimension check',
      },
    ];
    mockService.submitMeasureSet.mockResolvedValue({ status: 500 });

    await submitCurrentMeasure();

    expect(globalThis.alert).toHaveBeenCalledWith('측정 정보 전송에 실패했습니다.');
  });

  it('stops submit when skip confirmation is declined', async () => {
    const { rows, skipCurrentProcess, submitCurrentMeasure } = useProcessInquire();

    rows.value = [
      {
        id: '1',
        processName: 'Dimension check',
        subOperation: 'CD',
        status: 'Y',
        description: 'Dimension check',
      },
    ];
    skipCurrentProcess.value = true;
    vi.stubGlobal(
      'confirm',
      vi.fn(() => false),
    );
    mockService.checkDiCycle.mockResolvedValue({ status: 200, data: { diCycle: 'Y' } });

    await submitCurrentMeasure();

    expect(mockService.submitMeasureSet).not.toHaveBeenCalled();
  });

  it('runs move-in processing until all selected rows are complete', async () => {
    const { rows, runMoveInProcess } = useProcessInquire();

    rows.value = [
      {
        id: '1',
        processName: 'Dimension check',
        subOperation: 'CD',
        status: 'Y',
        description: 'Dimension check',
      },
      {
        id: '2',
        processName: 'Overlay check',
        subOperation: 'OVER',
        status: 'Y',
        description: 'Overlay check',
      },
    ];
    mockService.moveIn.mockResolvedValue({
      status: 200,
      data: { finish: 'Y' },
    });

    await runMoveInProcess();

    expect(mockService.moveIn).toHaveBeenCalled();
    expect(rows.value.every((row) => row.status === 'C')).toBe(true);
  });

  it('continues move-in processing until the final row finishes', async () => {
    const { rows, runMoveInProcess } = useProcessInquire();

    rows.value = [
      {
        id: '1',
        processName: 'Dimension check',
        subOperation: 'CD',
        status: 'Y',
        description: 'Dimension check',
      },
      {
        id: '2',
        processName: 'Overlay check',
        subOperation: 'OVER',
        status: 'Y',
        description: 'Overlay check',
      },
    ];
    mockService.moveIn
      .mockResolvedValueOnce({ status: 200, data: { finish: 'N' } })
      .mockResolvedValueOnce({ status: 200, data: { finish: 'Y' } });

    await runMoveInProcess();

    expect(mockService.moveIn).toHaveBeenCalledTimes(2);
    expect(rows.value.filter((row) => row.status === 'C')).toHaveLength(2);
  });

  it('handles move-in failures by showing an alert and setting the error message', async () => {
    const { rows, errorMessage, runMoveInProcess } = useProcessInquire();

    rows.value = [
      {
        id: '1',
        processName: 'Dimension check',
        subOperation: 'CD',
        status: 'Y',
        description: 'Dimension check',
      },
    ];
    mockService.moveIn.mockRejectedValue(new Error('move failed'));

    await runMoveInProcess();

    expect(errorMessage.value).toBe('MOVE IN 처리에 실패했습니다.');
    expect(globalThis.alert).toHaveBeenCalledWith('MOVE IN 처리에 실패했습니다.');
  });
});
