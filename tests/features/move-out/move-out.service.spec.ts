import apiClient from 'src/services/api-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  executeMoveOut,
  fetchAreaBayInfo,
  fetchBayStockerInfo,
  fetchLotInfo,
  fetchMoveOutFqcSampling,
  fetchSlotInfo,
  parseMoveOutMessageResponse,
} from '~/features/move-out/services/move-out.service';

vi.mock('src/services/api-client', () => ({
  default: {
    post: vi.fn(),
  },
}));

const postMock = vi.mocked(apiClient.post);

function pass(body: Record<string, unknown>) {
  return {
    data: {
      result: JSON.stringify({
        STATUS: 'PASS',
        MSGBODY: body,
      }),
    },
  };
}

function fail(message: string) {
  return {
    data: {
      result: JSON.stringify({
        STATUS: 'FAIL',
        ERRMSG: message,
      }),
    },
  };
}

describe('move-out.service', () => {
  beforeEach(() => {
    postMock.mockReset();
  });

  it('parses PASS response bodies', () => {
    expect(
      parseMoveOutMessageResponse({
        result: JSON.stringify({ STATUS: 'PASS', MSGBODY: { LOTID: 'LOT-DEMO-01' } }),
      }),
    ).toEqual({ LOTID: 'LOT-DEMO-01' });
  });

  it('throws legacy error messages for FAIL responses', () => {
    expect(() =>
      parseMoveOutMessageResponse({
        result: JSON.stringify({ STATUS: 'FAIL', ERRMSG: 'LOT 정보를 찾을 수 없습니다.' }),
      }),
    ).toThrow('LOT 정보를 찾을 수 없습니다.');
  });

  it('calls LOTINFO with MVOU type and normalizes lot data', async () => {
    postMock.mockResolvedValueOnce(
      pass({
        PRODUCT: 'PRODUCT-DEMO',
        JOBCODE: 'JOB-A',
        QUANTITY: '25',
        GOODCHIPS: '100',
        COMMENTQTY: '1',
        NWCOMMENTQTY: '0',
        BATCHID: 'BAT-ID',
        AREA: 'ETCH',
        WORKEDEQPID: 'EQP-01',
        WORKEDRECIPE: 'RCP-01',
        WORKEDRETICLE: 'MASK-01',
        PROCESSSTEP: 'CUR',
        OPERATION: '1000',
        SUBOPERATION: '00',
        NEXTPROCESSSTEP: 'NEXT',
        NEXTOPERATION: '2000',
        NEXTSUBOPERATION: '00',
        STATE: 'WIP',
        STATUS: '',
        HOLDSTATUS: '',
        NEXTBAY: 'BAY-A',
        NEXTSTOCKER: 'STK-A',
      }),
    );

    const lot = await fetchLotInfo({
      lotId: 'LOT-DEMO-01',
      facility: 'FACILITY',
      operatorId: 'OPERATOR_ID',
    });

    expect(postMock).toHaveBeenCalledWith('/hifos/LOTINFO', {
      LOTID: 'LOT-DEMO-01',
      FACILITY: 'FACILITY',
      TYPE: 'MVOU',
      OPERATORID: 'OPERATOR_ID',
    });
    expect(lot.lotId).toBe('LOT-DEMO-01');
    expect(lot.batchId).toBe('BAT-ID');
    expect(lot.display.product).toBe('PRODUCT-DEMO(JOB-A)');
    expect(lot.display.currentOperation).toBe('CUR(100000)');
    expect(lot.display.nextOperation).toBe('NEXT(200000)');
  });

  it('calls MOVEOUT and returns post messages', async () => {
    postMock.mockResolvedValueOnce(pass({ TANPI: 'TANPI MSG', SAMPLERESULT: 'SAMPLE MSG' }));

    const result = await executeMoveOut({
      lotId: 'LOT-DEMO-01',
      facility: 'FACILITY',
      eqpId: 'EQP-01',
      operation: '1000',
      subOperation: '00',
      recipe: 'RCP-01',
      opType: 'MVOU',
      isSkip: 'N',
      operatorId: 'OPERATOR_ID',
      comment: '; W/H:#1,2,3',
      isCarry: 'N',
      bay: '',
      stocker: '',
      quantity: '25',
      inputMaskLogo: '',
      wfInterlock: 'N',
    });

    expect(postMock).toHaveBeenCalledWith('/hifos/MOVEOUT', {
      LOTID: 'LOT-DEMO-01',
      FACILITY: 'FACILITY',
      EQPID: 'EQP-01',
      OPERATION: '1000',
      SUBOPERATION: '00',
      RECIPE: 'RCP-01',
      OPTYPE: 'MVOU',
      ISSKIP: 'N',
      OPERATORID: 'OPERATOR_ID',
      COMMENT: '; W/H:#1,2,3',
      ISCARRY: 'N',
      BAY: '',
      STOCKER: '',
      QUANTITY: '25',
      INPUTMASKLOGO: '',
      WFINTERLOCK: 'N',
    });
    expect(result).toEqual({ tanpi: 'TANPI MSG', sampleResult: 'SAMPLE MSG' });
  });

  it('calls FQCSAMPLING and SLOTINFO', async () => {
    postMock
      .mockResolvedValueOnce(
        pass({ CYCLECOMMENT: 'CYCLE', RECIPECOMMENT: '', DELETECODE: '', UPDATECODE: '' }),
      )
      .mockResolvedValueOnce(pass({ WAFERLIST: '1,2,3', QUANTITY: '3', CHECKETCH: 'N' }));

    await expect(
      fetchMoveOutFqcSampling({
        lotId: 'LOT-DEMO-01',
        opType: 'MVOU',
        eqpId: 'EQP-01',
        oper: '1000',
        subOper: '00',
      }),
    ).resolves.toEqual({
      cycleComment: 'CYCLE',
      recipeComment: '',
      deleteCode: '',
      updateCode: '',
    });

    await expect(
      fetchSlotInfo({
        lotId: 'LOT-DEMO-01',
        facility: 'FACILITY',
        operatorId: 'OPERATOR_ID',
      }),
    ).resolves.toEqual({ waferList: '1,2,3', quantity: '3', checkEtch: 'N' });
  });

  it('calls BAY lookup messages with legacy FACILITY payload', async () => {
    postMock
      .mockResolvedValueOnce(pass({ BAY1: 'BAY-A' }))
      .mockResolvedValueOnce(pass({ STOCKER1: 'STK-A' }));

    await expect(fetchAreaBayInfo()).resolves.toEqual([{ label: 'BAY-A', value: 'BAY-A' }]);
    expect(postMock).toHaveBeenNthCalledWith(1, '/hifos/AREABAYINFO', {
      FACILITY: 'FACILITY',
    });

    await expect(fetchBayStockerInfo('BAY-A')).resolves.toEqual([
      { label: 'STK-A', value: 'STK-A' },
    ]);
    expect(postMock).toHaveBeenNthCalledWith(2, '/hifos/BAYSTOCKERINFO', {
      BAY: 'BAY-A',
      FACILITY: 'FACILITY',
    });
  });

  it('throws when MOVEOUT returns FAIL', async () => {
    postMock.mockResolvedValueOnce(fail('LOT-DEMO-FAIL MOVE OUT failed.'));

    await expect(
      executeMoveOut({
        lotId: 'LOT-DEMO-FAIL',
        facility: 'FACILITY',
        eqpId: 'EQP-01',
        operation: '',
        subOperation: '',
        recipe: '',
        opType: '',
        isSkip: 'N',
        operatorId: 'OPERATOR_ID',
        comment: '',
        isCarry: 'N',
        bay: '',
        stocker: '',
        quantity: '',
        inputMaskLogo: '',
        wfInterlock: 'N',
      }),
    ).rejects.toThrow('LOT-DEMO-FAIL MOVE OUT failed.');
  });
});
