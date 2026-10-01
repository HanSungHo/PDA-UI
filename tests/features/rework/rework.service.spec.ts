import { ApiError } from 'src/services/api-error';
import { describe, expect, it } from 'vitest';

import {
  fetchAreaBayInfo,
  fetchBayStockerInfo,
  fetchReworkInfo,
  submitRework,
} from '../../../src/features/rework/services/rework.service';

describe('rework.service', () => {
  describe('fetchReworkInfo', () => {
    it('maps a WIP / non-hold LOT to the clean response shape', async () => {
      const response = await fetchReworkInfo({ lotId: 'LOT0001', facility: 'FAC1' });

      expect(response).toEqual({
        eqpId: 'EQP-01',
        product: 'PRD-0001',
        operation: 'OP10',
        subOperation: '00',
        processStep: 'STEP-A',
        state: 'WIP',
        status: 'RUN',
        holdStatus: 'NONE',
        qty: '25',
        reworkCodes: [
          { value: 'RW01', label: 'RW01  Particle rework' },
          { value: 'RW02', label: 'RW02  Pattern defect rework' },
        ],
      });
    });

    it('maps a HOLD / on-hold LOT to the clean response shape', async () => {
      const response = await fetchReworkInfo({ lotId: 'LOT0002', facility: 'FAC1' });

      expect(response.state).toBe('HOLD');
      expect(response.holdStatus).toBe('ONHOLD');
      expect(response.reworkCodes).toEqual([{ value: 'RW03', label: 'RW03  Bridging rework' }]);
    });

    it('throws ApiError when the LOT is not found', async () => {
      await expect(fetchReworkInfo({ lotId: 'UNKNOWN', facility: 'FAC1' })).rejects.toBeInstanceOf(
        ApiError,
      );

      try {
        await fetchReworkInfo({ lotId: 'UNKNOWN', facility: 'FAC1' });
        expect.unreachable('fetchReworkInfo should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        expect((err as ApiError).message).toBe('해당 LOT 정보를 찾을 수 없습니다.');
      }
    });
  });

  describe('fetchAreaBayInfo', () => {
    it('maps BAYS into SpinnerItem[]', async () => {
      const response = await fetchAreaBayInfo({ facility: 'FAC1' });

      expect(response).toEqual({
        bays: [
          { value: 'BAY-A', label: 'BAY-A' },
          { value: 'BAY-B', label: 'BAY-B' },
          { value: 'BAY-C', label: 'BAY-C' },
        ],
      });
    });
  });

  describe('fetchBayStockerInfo', () => {
    it('maps STOCKERS into SpinnerItem[] for a known BAY', async () => {
      const response = await fetchBayStockerInfo({ bay: 'BAY-A', facility: 'FAC1' });

      expect(response).toEqual({
        stockers: [
          { value: 'STK-01', label: 'STK-01' },
          { value: 'STK-02', label: 'STK-02' },
        ],
      });
    });

    it('throws ApiError for an unknown BAY', async () => {
      await expect(
        fetchBayStockerInfo({ bay: 'UNKNOWN-BAY', facility: 'FAC1' }),
      ).rejects.toMatchObject({
        message: '선택한 BAY의 STOCKER 목록을 찾을 수 없습니다.',
      });
    });
  });

  describe('submitRework', () => {
    it('resolves without throwing (legacy: setResult(RESULT_OK); finish())', async () => {
      await expect(
        submitRework({
          lotId: 'LOT0001',
          facility: 'FAC1',
          eqpId: 'EQP-01',
          reworkCode: 'RW01',
          comment: 'test comment',
          operatorId: 'OP01',
          operation: 'OP10',
          subOperation: '00',
          isCarry: 'N',
          bay: '',
          stocker: '',
          qty: '25',
        }),
      ).resolves.toBeUndefined();
    });
  });
});
