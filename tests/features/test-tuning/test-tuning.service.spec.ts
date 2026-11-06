import { testTuningService } from 'src/features/test-tuning/services/test-tuning.service';
import { afterEach, describe, expect, it, vi } from 'vitest';

const postMock = vi.hoisted(() => vi.fn());

vi.mock('src/services/api-client', () => ({
  default: { post: postMock },
}));

function messageResponse(status: 'PASS' | 'FAIL', body: unknown, errorMessage = '') {
  return {
    data: {
      statusCode: 200,
      result: JSON.stringify({ STATUS: status, MSGBODY: body, ERRMSG: errorMessage }),
    },
  };
}

describe('testTuningService', () => {
  afterEach(() => {
    postMock.mockReset();
  });

  // Kotlin: MessageFactoryUtil.cvdTestMainInfo(eqpId) -> CVDTESTMAININFO <EQPID>
  it('posts CVDTESTMAININFO and maps RCP_GROUP', async () => {
    postMock.mockResolvedValue(messageResponse('PASS', { RCP_GROUP: 'GRP1|GRP2' }));

    await expect(testTuningService.getMainInfo('EQP01')).resolves.toEqual({
      ok: true,
      rcpGroup: 'GRP1|GRP2',
    });
    expect(postMock).toHaveBeenCalledWith('/message/send', {
      messageName: 'CVDTESTMAININFO',
      payload: { EQPID: 'EQP01' },
    });
  });

  it('defaults rcpGroup to an empty string when RCP_GROUP is missing', async () => {
    postMock.mockResolvedValue(messageResponse('PASS', {}));

    await expect(testTuningService.getMainInfo('EQP01')).resolves.toEqual({
      ok: true,
      rcpGroup: '',
    });
  });

  it('surfaces the server error message when CVDTESTMAININFO fails', async () => {
    postMock.mockResolvedValue(messageResponse('FAIL', '', '장비 정보를 찾을 수 없습니다.'));

    await expect(testTuningService.getMainInfo('EQP-FAIL')).resolves.toEqual({
      ok: false,
      message: '장비 정보를 찾을 수 없습니다.',
    });
  });

  // Kotlin: MessageFactoryUtil.cvdTestSubInfo(eqpId, mainId, typeId) -> CVDTESTSUBINFO
  it('posts CVDTESTSUBINFO with EQPID/MAINID/TYPEID and maps SUBID', async () => {
    postMock.mockResolvedValue(messageResponse('PASS', { SUBID: 'SUB1|SUB2' }));

    await expect(testTuningService.getSubInfo('EQP01', 'GRP1', 'TEST')).resolves.toEqual({
      ok: true,
      subId: 'SUB1|SUB2',
    });
    expect(postMock).toHaveBeenCalledWith('/message/send', {
      messageName: 'CVDTESTSUBINFO',
      payload: { EQPID: 'EQP01', MAINID: 'GRP1', TYPEID: 'TEST' },
    });
  });

  it('surfaces the server error message when CVDTESTSUBINFO fails', async () => {
    postMock.mockResolvedValue(messageResponse('FAIL', '', 'SUB 정보를 찾을 수 없습니다.'));

    await expect(testTuningService.getSubInfo('EQP01', 'GRP-FAIL', 'TEST')).resolves.toEqual({
      ok: false,
      message: 'SUB 정보를 찾을 수 없습니다.',
    });
  });

  // Kotlin: MessageFactoryUtil.cvdTestBodyInfo(eqpId, mainId, subId, typeId) -> CVDTESTBODYINFO
  // Real server wraps list bodies as BODY.ITEM (ResponseDataToJsonUtil.getMessageBodyNullCheckList).
  it('posts CVDTESTBODYINFO with EQPID/MAINID/SUBID/TYPEID and maps LOTID + BODY.ITEM for TEST', async () => {
    postMock.mockResolvedValue(
      messageResponse('PASS', {
        LOTID: 'LOT-0001',
        BODY: { ITEM: [{ SLOT: '1', RECIPE: 'RCP-A', CHAMBER: 'CH1', MEAS_RECIPE: 'MRCP-A' }] },
      }),
    );

    await expect(testTuningService.getBodyInfo('EQP01', 'GRP1', 'SUB1', 'TEST')).resolves.toEqual({
      ok: true,
      lotId: 'LOT-0001',
      body: [{ SLOT: '1', RECIPE: 'RCP-A', CHAMBER: 'CH1', MEAS_RECIPE: 'MRCP-A' }],
    });
    expect(postMock).toHaveBeenCalledWith('/message/send', {
      messageName: 'CVDTESTBODYINFO',
      payload: { EQPID: 'EQP01', MAINID: 'GRP1', SUBID: 'SUB1', TYPEID: 'TEST' },
    });
  });

  it('wraps a single BODY.ITEM object (one row) into a one-element array', async () => {
    postMock.mockResolvedValue(
      messageResponse('PASS', {
        LOTID: 'LOT-0002',
        BODY: { ITEM: { SLOT: '1', RECIPE: 'RCP-A', CHAMBER: 'CH1', MEAS_RECIPE: 'MRCP-A' } },
      }),
    );

    await expect(testTuningService.getBodyInfo('EQP01', 'GRP1', 'SUB1', 'TEST')).resolves.toEqual({
      ok: true,
      lotId: 'LOT-0002',
      body: [{ SLOT: '1', RECIPE: 'RCP-A', CHAMBER: 'CH1', MEAS_RECIPE: 'MRCP-A' }],
    });
  });

  it('defaults lotId and body to empty values when BODY is missing from MSGBODY', async () => {
    postMock.mockResolvedValue(messageResponse('PASS', {}));

    await expect(testTuningService.getBodyInfo('EQP01', 'GRP1', 'SUB1', 'TUNING')).resolves.toEqual(
      {
        ok: true,
        lotId: '',
        body: [],
      },
    );
  });

  it('returns an empty body when BODY.ITEM is absent', async () => {
    postMock.mockResolvedValue(messageResponse('PASS', { BODY: {} }));

    await expect(
      testTuningService.getBodyInfo('EQP01', 'GRP1', 'SUB1', 'TUNING'),
    ).resolves.toEqual({ ok: true, lotId: '', body: [] });
  });

  it('surfaces the server error message when CVDTESTBODYINFO fails', async () => {
    postMock.mockResolvedValue(messageResponse('FAIL', '', '조회된 정보가 없습니다.'));

    await expect(
      testTuningService.getBodyInfo('EQP01', 'GRP1', 'SUB-FAIL', 'TEST'),
    ).resolves.toEqual({
      ok: false,
      message: '조회된 정보가 없습니다.',
    });
  });
});
