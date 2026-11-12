import { ApiError } from 'src/services/api-error';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  fetchAreaBayInfo,
  fetchBayStockerInfo,
  fetchReworkInfo,
  submitRework,
} from '../../../src/features/rework/services/rework.service';

const { postAifMessage } = vi.hoisted(() => ({ postAifMessage: vi.fn() }));
vi.mock('src/services/aif-message.service', () => ({ postAifMessage }));

const pass = (body: unknown) => ({
  statusCode: 200,
  result: JSON.stringify({ STATUS: 'PASS', MSGBODY: body }),
});
const fail = (message: string) => ({
  statusCode: 200,
  result: JSON.stringify({ STATUS: 'FAIL', ERRMSG: message, MSGBODY: '' }),
});

describe('rework.service (mock server API)', () => {
  beforeEach(() => {
    postAifMessage.mockReset();
  });

  describe('fetchReworkInfo', () => {
    it('sends REWORKINFO with LOTID/FACILITY and maps the body', async () => {
      postAifMessage.mockResolvedValue(
        pass({
          PRODUCT: 'PRD-0001',
          OPERATION: 'OP10',
          SUBOPERATION: '00',
          PROCESSSTEP: 'STEP-A',
          EQPID: 'EQP-01',
          STATE: 'WIP',
          STATUS: 'RUN',
          HOLDSTATUS: 'NONE',
          QUANTITY: '25',
          REWORKITEMS: {
            ITEM: [
              { REWORKCODE: 'RW01', RWDESCRIPTION: 'Particle rework' },
              { REWORKCODE: 'RW02', RWDESCRIPTION: 'Pattern defect rework' },
            ],
          },
        }),
      );

      const response = await fetchReworkInfo({ lotId: 'LOT0001', facility: 'FAC1' });

      expect(postAifMessage).toHaveBeenCalledWith('REWORKINFO', 'REWORKINFO', [
        ['LOTID', 'LOT0001'],
        ['FACILITY', 'FAC1'],
      ]);
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

    it('treats a single REWORKITEMS item (object) as a one-element list', async () => {
      postAifMessage.mockResolvedValue(
        pass({ REWORKITEMS: { ITEM: { REWORKCODE: 'RW03', RWDESCRIPTION: 'Bridging rework' } } }),
      );

      const response = await fetchReworkInfo({ lotId: 'LOT', facility: 'FAC1' });

      expect(response.reworkCodes).toEqual([{ value: 'RW03', label: 'RW03  Bridging rework' }]);
      expect(response.state).toBe('');
    });

    it('throws ApiError with the server ERRMSG when the LOT is not found', async () => {
      postAifMessage.mockResolvedValue(fail('해당 LOT 정보를 찾을 수 없습니다.'));

      const error = await fetchReworkInfo({ lotId: 'X', facility: 'FAC1' }).catch((e) => e);

      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).message).toBe('해당 LOT 정보를 찾을 수 없습니다.');
    });

    it('wraps a transport error in ApiError', async () => {
      postAifMessage.mockRejectedValue(new Error('Network Error'));

      await expect(fetchReworkInfo({ lotId: 'X', facility: 'FAC1' })).rejects.toMatchObject({
        name: 'ApiError',
        message: 'Network Error',
      });
    });
  });

  describe('fetchAreaBayInfo', () => {
    it('sends AREABAYINFO with FACILITY only and maps BAYS', async () => {
      postAifMessage.mockResolvedValue(
        pass({ BAYS: { ITEM: [{ BAY: 'BAY-A' }, { BAY: 'BAY-B' }] } }),
      );

      const response = await fetchAreaBayInfo({ facility: 'FAC1' });

      expect(postAifMessage).toHaveBeenCalledWith('AREABAYINFO', 'AREABAYINFO', [
        ['FACILITY', 'FAC1'],
      ]);
      expect(response.bays).toEqual([
        { value: 'BAY-A', label: 'BAY-A' },
        { value: 'BAY-B', label: 'BAY-B' },
      ]);
    });
  });

  describe('fetchBayStockerInfo', () => {
    it('sends BAYSTOCKERINFO and maps STOCKERS', async () => {
      postAifMessage.mockResolvedValue(pass({ STOCKERS: { ITEM: [{ STOCKER: 'STK-01' }] } }));

      const response = await fetchBayStockerInfo({ bay: 'BAY-A', facility: 'FAC1' });

      expect(postAifMessage).toHaveBeenCalledWith('BAYSTOCKERINFO', 'BAYSTOCKERINFO', [
        ['BAY', 'BAY-A'],
        ['FACILITY', 'FAC1'],
      ]);
      expect(response.stockers).toEqual([{ value: 'STK-01', label: 'STK-01' }]);
    });

    it('throws ApiError when the server fails', async () => {
      postAifMessage.mockResolvedValue(fail('STOCKER 없음'));

      await expect(fetchBayStockerInfo({ bay: 'X', facility: 'FAC1' })).rejects.toMatchObject({
        message: 'STOCKER 없음',
      });
    });
  });

  describe('submitRework', () => {
    const request = {
      lotId: 'LOT0001',
      facility: 'FAC1',
      eqpId: 'EQP-01',
      reworkCode: 'RW01',
      comment: 'test comment',
      operatorId: 'OP01',
      operation: 'OP10',
      subOperation: '00',
      isCarry: 'N' as const,
      bay: '',
      stocker: '',
      qty: '25',
    };

    it('sends REWORK with the legacy request tags in order', async () => {
      postAifMessage.mockResolvedValue(pass({}));

      await expect(submitRework(request)).resolves.toBeUndefined();

      expect(postAifMessage).toHaveBeenCalledWith('REWORK', 'REWORK', [
        ['LOTID', 'LOT0001'],
        ['FACILITY', 'FAC1'],
        ['EQPID', 'EQP-01'],
        ['REWORKCODE', 'RW01'],
        ['COMMENT', 'test comment'],
        ['OPERATORID', 'OP01'],
        ['OPERATION', 'OP10'],
        ['SUBOPERATION', '00'],
        ['ISCARRY', 'N'],
        ['BAY', ''],
        ['STOCKER', ''],
        ['QUANTITY', '25'],
      ]);
    });

    it('throws ApiError with ERRMSG when REWORK fails', async () => {
      postAifMessage.mockResolvedValue(fail('REWORK 처리에 실패하였습니다.'));

      await expect(submitRework(request)).rejects.toMatchObject({
        message: 'REWORK 처리에 실패하였습니다.',
      });
    });
  });
});
