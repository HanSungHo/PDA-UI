import { ApiError } from 'src/services/api-error';

import type {
  mockCheckDiCycleResponse,
  mockMeasureSetResponse,
  mockMoveInResponse,
  mockSlotInfoResponse,
} from '../mocks/process-inquire.mock';
import {
  createProcessInquireMockScenario,
  mockMeasureInfoResponse,
  type ProcessInquireMockScenario,
} from '../mocks/process-inquire.mock';
import type {
  MeasureInfoResponse,
  MeasureRow,
  ProcessInquireForm,
} from '../types/process-inquire.types';

/**
 * ============================================================
 * MEASURE SET REQUEST
 * ============================================================
 *
 * Kotlin:
 *
 * MessageFactoryUtil.measureSet(
 *     lotId,
 *     DeviceInfo.FACILITY,
 *     m_sOperation,
 *     sSubOperation,
 *     DeviceInfo.OPERATOR_ID,
 *     qty,
 *     sLotList,
 *     waferList,
 *     semSLotList,
 *     semWaferList
 * )
 */
export interface MeasureSetRequest {
  lotId: string;
  facility: string;
  operation: string;
  subOperation: string;
  qty: string;
  slotList: string;
  waferList: string;
  semSlotList: string;
  semWaferList: string;
}

/**
 * ============================================================
 * MOVE IN REQUEST
 * ============================================================
 *
 * Kotlin:
 *
 * MessageFactoryUtil.moveIn(
 *     lotId,
 *     DeviceInfo.FACILITY,
 *     "",
 *     "",
 *     m_sOperation,
 *     subOperation,
 *     "Y",
 *     DeviceInfo.OPERATOR_ID,
 *     "N",
 *     "",
 *     "",
 *     qty,
 *     "",
 *     m_reworkSkip
 * )
 */
export interface MoveInRequest {
  lotId: string;
  facility: string;
  operation: string;
  subOperation: string;
  qty: string;
  reworkSkip: string;
}

/**
 * ============================================================
 * MEASURE INFO RESPONSE
 * ============================================================
 */
export interface MeasureInfoApiResponse {
  product?: string;
  operation?: string;
  subOperation?: string;
  photoJobCode?: string;
  processStep?: string;
  quantity?: string;
  slotList?: string;
  waferList?: string;
  semSlotList?: string;
  semWaferList?: string;
  measureItems?: MeasureRow[];
}

/**
 * ============================================================
 * MOCK SCENARIO
 *
 * Change this to test Kotlin flows.
 * ============================================================
 */
let currentScenario: ProcessInquireMockScenario = 'normal';

export function setProcessInquireMockScenario(scenario: ProcessInquireMockScenario): void {
  currentScenario = scenario;
}

export function getProcessInquireMockScenario(): ProcessInquireMockScenario {
  return currentScenario;
}

/**
 * ============================================================
 * SERVICE
 * ============================================================
 */
export const mockProcessInquireService = {
  /**
   * ==========================================================
   * 1. getMeasureInfo()
   *
   * Kotlin:
   *
   * private fun getMeasureInfo()
   * ==========================================================
   */
  async getMeasureInfo(lotId: string): Promise<{
    data: MeasureInfoApiResponse;
    status: number;
  }> {
    await new Promise((resolve) => setTimeout(resolve, 300));

    if (!lotId || lotId === 'UNKNOWN') {
      throw new ApiError('Measure info not found.', {
        code: 'MEASURE_INFO_NOT_FOUND',
        status: 404,
      });
    }

    const scenario = createProcessInquireMockScenario(currentScenario);

    /*
     * measure-error scenario can be used to simulate
     * a failed MEASURE lookup if needed.
     */
    if (currentScenario === 'measure-error') {
      throw new ApiError('Measure information request failed.', {
        code: 'MEASURE_INFO_ERROR',
        status: 500,
      });
    }

    return {
      data: scenario.measureInfo,
      status: 200,
    };
  },

  /**
   * ==========================================================
   * 2. getSlotInfo()
   * ==========================================================
   */
  async getSlotInfo(lotId: string): Promise<{
    data: typeof mockSlotInfoResponse;
    status: number;
  }> {
    await new Promise((resolve) => setTimeout(resolve, 300));

    if (!lotId || lotId === 'INVALID') {
      throw new ApiError('Slot info not found.', {
        code: 'SLOT_INFO_NOT_FOUND',
        status: 404,
      });
    }

    const scenario = createProcessInquireMockScenario(currentScenario);

    return {
      data: scenario.slotInfo,
      status: 200,
    };
  },

  /**
   * ==========================================================
   * 3. checkDiCycle()
   *
   * Kotlin:
   *
   * MessageFactoryUtil.checkDiCycle(
   *     lotId,
   *     DeviceInfo.FACILITY,
   *     sOperation,
   *     "MULTI"
   * )
   *
   * ==========================================================
   */
  async checkDiCycle(
    lotId: string,
    _operation: string,
    _selectedOps: string[],
  ): Promise<{
    data: typeof mockCheckDiCycleResponse;
    status: number;
  }> {
    await new Promise((resolve) => setTimeout(resolve, 300));

    if (!lotId || lotId === 'INVALID') {
      throw new ApiError('DI cycle check failed.', {
        code: 'DI_CYCLE_CHECK_FAILED',
        status: 400,
      });
    }

    const scenario = createProcessInquireMockScenario(currentScenario);

    return {
      data: scenario.diCycle,
      status: 200,
    };
  },

  /**
   * ==========================================================
   * 4. submitMeasureSet()
   *
   * Kotlin:
   *
   * MessageFactoryUtil.measureSet(...)
   * ==========================================================
   */
  async submitMeasureSet(payload: MeasureSetRequest): Promise<{
    data: typeof mockMeasureSetResponse;
    status: number;
  }> {
    await new Promise((resolve) => setTimeout(resolve, 300));

    if (!payload.lotId || !payload.subOperation || !payload.operation) {
      throw new ApiError('Invalid measure payload.', {
        code: 'INVALID_MEASURE_PAYLOAD',
        status: 400,
      });
    }

    if (currentScenario === 'measure-error') {
      throw new ApiError('Measurement setup failed.', {
        code: 'MEASURE_SET_FAILED',
        status: 500,
      });
    }

    const scenario = createProcessInquireMockScenario(currentScenario);

    return {
      data: scenario.measureSet,
      status: 200,
    };
  },

  /**
   * ==========================================================
   * 5. moveIn()
   *
   * Kotlin:
   *
   * MessageFactoryUtil.moveIn(...)
   * ==========================================================
   */
  async moveIn(payload: MoveInRequest): Promise<{
    data: typeof mockMoveInResponse;
    status: number;
  }> {
    await new Promise((resolve) => setTimeout(resolve, 300));

    if (payload.lotId === 'UNKNOWN' || payload.subOperation === '') {
      throw new ApiError('Move-in request is not allowed.', {
        code: 'MOVE_IN_NOT_ALLOWED',
        status: 409,
      });
    }

    const scenario = createProcessInquireMockScenario(currentScenario);

    return {
      data: scenario.moveIn,
      status: 200,
    };
  },
};

/**
 * ============================================================
 * FALLBACK DEMO
 * ============================================================
 */
export function createDemoMeasureInfo(form: Partial<ProcessInquireForm>): MeasureInfoResponse {
  return {
    ...mockMeasureInfoResponse,

    product: form.productName ?? mockMeasureInfoResponse.product,

    photoJobCode: form.job ?? mockMeasureInfoResponse.photoJobCode,

    quantity: form.quantity ?? mockMeasureInfoResponse.quantity,

    slotList: form.currentSlot ?? mockMeasureInfoResponse.slotList,

    waferList: form.currentWf ?? mockMeasureInfoResponse.waferList,

    semSlotList: form.semSlot ?? mockMeasureInfoResponse.semSlotList,

    semWaferList: form.semWf ?? mockMeasureInfoResponse.semWaferList,

    /*
     * Always clone rows.
     */
    measureItems: mockMeasureInfoResponse.measureItems.map((row) => ({
      ...row,
    })),
  };
}

export function createMockScenarioData(scenario: ProcessInquireMockScenario = 'normal') {
  return createProcessInquireMockScenario(scenario);
}

export default mockProcessInquireService;
