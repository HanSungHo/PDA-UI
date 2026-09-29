import { describe, expect, it } from 'vitest';

import {
  mockCheckDiCycleResponse,
  mockMeasureSetResponse,
  mockSlotInfoResponse,
} from '../../../src/features/move-in/mocks/process-inquire.mock';
import mockProcessInquireService, {
  createDemoMeasureInfo,
  createMockScenarioData,
  setProcessInquireMockScenario,
} from '../../../src/features/move-in/services/mock-process-inquire.service';
import { ApiError } from '../../../src/services/api-error';

describe('mockProcessInquireService', () => {
  it('getMeasureInfo returns mock measure data and rows', async () => {
    const response = await mockProcessInquireService.getMeasureInfo('LOT-001');

    expect(response.status).toBe(200);
    expect(response.data.product).toBe('HIFI-UI-DEMO');
    expect(response.data.operation).toBe('OP01');
    expect(response.data.measureItems).toHaveLength(3);
    expect(response.data.measureItems?.map((item) => item.subOperation)).toEqual([
      'CD',
      'OVER',
      'ETC',
    ]);
  });

  it('getSlotInfo returns the mock wafer list', async () => {
    const response = await mockProcessInquireService.getSlotInfo('LOT-001');

    expect(response.status).toBe(200);
    expect(response.data).toEqual(mockSlotInfoResponse);
    expect(response.data.waferList).toContain('01');
    expect(response.data.waferList).toContain('10');
  });

  it('checkDiCycle returns the mock DI cycle check', async () => {
    setProcessInquireMockScenario('skip-warning');

    const response = await mockProcessInquireService.checkDiCycle('LOT-001', 'OP01', [
      'CD',
      'OVER',
    ]);

    expect(response.status).toBe(200);
    expect(response.data).toEqual({ ...mockCheckDiCycleResponse, diCycle: 'Y' });
    expect(response.data.diCycle).toBe('Y');
  });

  it('submitMeasureSet returns success status and mock payload', async () => {
    const response = await mockProcessInquireService.submitMeasureSet({
      lotId: 'LOT-001',
      facility: 'KFAB',
      operation: 'OP01',
      subOperation: 'OVER',
      qty: '25',
      slotList: '01,02,03,04',
      waferList: '01,02,03,04',
      semSlotList: '05,06,07,08',
      semWaferList: '05,06,07,08',
    });

    expect(response.status).toBe(200);
    expect(response.data).toEqual(mockMeasureSetResponse);
    expect(response.data.PROCESSSTEP).toBe('VI');
  });

  it('moveIn returns the mock finish status', async () => {
    setProcessInquireMockScenario('move-in-finish');

    const response = await mockProcessInquireService.moveIn({
      lotId: 'LOT-001',
      facility: 'KFAB',
      operation: 'OP01',
      subOperation: 'OVER',
      qty: '25',
      reworkSkip: 'N',
    });

    expect(response.status).toBe(200);
    expect(response.data).toEqual({ finish: 'Y' });
    expect(response.data.finish).toBe('Y');
  });

  it('createDemoMeasureInfo fills the form from provided values', () => {
    const result = createDemoMeasureInfo({
      productName: 'PRODUCT-NEW',
      job: 'JOB-NEW',
      quantity: '50',
      currentSlot: '11,12',
      currentWf: '11,12',
      semSlot: '13,14',
      semWf: '13,14',
    });

    expect(result.product).toBe('PRODUCT-NEW');
    expect(result.photoJobCode).toBe('JOB-NEW');
    expect(result.quantity).toBe('50');
    expect(result.slotList).toBe('11,12');
    expect(result.waferList).toBe('11,12');
    expect(result.semSlotList).toBe('13,14');
    expect(result.semWaferList).toBe('13,14');
  });

  it('createMockScenarioData exposes values for selected scenario', () => {
    const result = createMockScenarioData('move-in-finish');

    expect(result.measureInfo.measureItems.every((item) => item.status === 'C')).toBe(true);
    expect(result.moveIn.finish).toBe('Y');
  });

  it('getMeasureInfo rejects with ApiError when lot is unknown', async () => {
    const error = await mockProcessInquireService
      .getMeasureInfo('UNKNOWN')
      .catch((err: unknown) => err);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      code: 'MEASURE_INFO_NOT_FOUND',
      message: 'Measure info not found.',
      status: 404,
    });
  });

  it('getSlotInfo rejects with ApiError when slot request is invalid', async () => {
    const error = await mockProcessInquireService
      .getSlotInfo('INVALID')
      .catch((err: unknown) => err);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      code: 'SLOT_INFO_NOT_FOUND',
      message: 'Slot info not found.',
      status: 404,
    });
  });

  it('submitMeasureSet rejects with ApiError when payload is invalid', async () => {
    const error = await mockProcessInquireService
      .submitMeasureSet({
        lotId: '',
        facility: 'KFAB',
        operation: 'OP01',
        subOperation: '',
        qty: '25',
        slotList: '01,02',
        waferList: '01,02',
        semSlotList: '05,06',
        semWaferList: '05,06',
      })
      .catch((err: unknown) => err);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      code: 'INVALID_MEASURE_PAYLOAD',
      message: 'Invalid measure payload.',
      status: 400,
    });
  });

  it('moveIn rejects with ApiError when move-in request is invalid', async () => {
    const error = await mockProcessInquireService
      .moveIn({
        lotId: 'UNKNOWN',
        facility: 'KFAB',
        operation: 'OP01',
        subOperation: 'OVER',
        qty: '25',
        reworkSkip: 'N',
      })
      .catch((err: unknown) => err);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      code: 'MOVE_IN_NOT_ALLOWED',
      message: 'Move-in request is not allowed.',
      status: 409,
    });
  });
});
