import { assertPass, postJsonMessage } from 'src/services/json-message.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ERRORMSG_MSGBODY,
  remoteImpBatchService,
} from '../../../src/features/remote_imp_batch/services/remote-imp-batch.service';

vi.mock('src/services/json-message.service', () => ({
  postJsonMessage: vi.fn(),
  assertPass: vi.fn(),
  body: vi.fn((p: Record<string, unknown>) => p.MSGBODY ?? p.BODY ?? {}),
}));

type ParsedResult = Awaited<ReturnType<typeof postJsonMessage>>;

const mockParsed = (value: Record<string, unknown>) =>
  vi.mocked(postJsonMessage).mockResolvedValue(value as unknown as ParsedResult);

describe('remoteImpBatchService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. returns the Error message when the request rejects with an Error', async () => {
    vi.mocked(postJsonMessage).mockRejectedValue(new Error('Network offline'));
    const res = await remoteImpBatchService.lotInfo('MVIN', 'LOT-01', 'KFAB');
    expect(res.isSuccessFul).toBe(false);
    expect(res.errorMessage).toBe('Network offline');
  });

  it('2. falls back to ERRORMSG_MSGBODY when rejecting with a non-Error', async () => {
    vi.mocked(postJsonMessage).mockRejectedValue('Unknown string rejection');
    const res = await remoteImpBatchService.lotInfo('MVIN', 'LOT-01', 'KFAB');
    expect(res.isSuccessFul).toBe(false);
    expect(res.errorMessage).toBe(ERRORMSG_MSGBODY);
  });

  it('3. falls back to ERRORMSG_MSGBODY when the Error has an empty message', async () => {
    vi.mocked(postJsonMessage).mockRejectedValue(new Error(''));
    const res = await remoteImpBatchService.areaBayInfo('KFAB');
    expect(res.isSuccessFul).toBe(false);
    expect(res.errorMessage).toBe(ERRORMSG_MSGBODY);
  });

  it('4. merges a JSON-string result into the parsed response', async () => {
    mockParsed({
      statusCode: 200,
      result: JSON.stringify({ STATUS: 'PASS', MSGBODY: { BAY0: 'BAY-A', BAY1: 'BAY-B' } }),
    });
    const res = await remoteImpBatchService.areaBayInfo('KFAB');
    expect(assertPass).toHaveBeenCalledWith(
      expect.objectContaining({ STATUS: 'PASS' }),
      'AREABAYINFO',
    );
    expect(res.isSuccessFul).toBe(true);
    expect(res.body).toEqual({ BAY0: 'BAY-A', BAY1: 'BAY-B' });
  });

  it('5. returns a failure (does not throw) when the result string is malformed JSON', async () => {
    mockParsed({ statusCode: 200, result: '{ malformed' });
    const res = await remoteImpBatchService.areaBayInfo('KFAB');
    expect(res.isSuccessFul).toBe(false);
    expect(res.errorMessage).toBeTruthy();
  });

  it('6. returns the thrown message when assertPass throws', async () => {
    mockParsed({ RETURN: { RETURNCODE: '1' } });
    vi.mocked(assertPass).mockImplementationOnce(() => {
      throw new Error('Internal Error');
    });
    const res = await remoteImpBatchService.bayStockerInfo('BAY-A', 'KFAB');
    expect(res.isSuccessFul).toBe(false);
    expect(res.errorMessage).toBe('Internal Error');
  });

  it('7. coerces payload values to strings (null -> "") and verifies RECIPEINFO key contract', async () => {
    mockParsed({ BODY: { RECIPE: 'RCP-01' } });
    await remoteImpBatchService.recipeInfo(
      'N',
      'LOT-01',
      '3100',
      '00',
      'PROD',
      'EQP-01',
      'MVIN',
      'KFAB',
    );
    const recipeCall = vi.mocked(postJsonMessage).mock.calls[0];
    expect(recipeCall[0]).toBe('RECIPEINFO');
    expect(recipeCall[1].ISPHOTO).toBe('N');
    expect(recipeCall[1].CHAMBERYN).toBeUndefined();
    expect(Object.values(recipeCall[1]).every((v) => typeof v === 'string')).toBe(true);

    await remoteImpBatchService.impBatchRemoteStart({
      LOTNAME1: 'L1',
      LOTNAME2: null as unknown as string,
      MACHINENAME: 'EQP',
      MACHINETYPE: '',
      RECIPENAME: 'R',
      ISCARRY: 'N',
      BAY: '',
      STOCKER: '',
      EVENTUSER: 'U',
      PRODUCTNAME1: 'P1',
      PRODUCTNAME2: 'P2',
      OPERATION1: 'O1',
      OPERATION2: 'O2',
      JOBCODE1: 'J1',
      JOBCODE2: 'J2',
    });
    const startCall = vi.mocked(postJsonMessage).mock.calls[1];
    expect(startCall[0]).toBe('IMPBATCHREMOTESTART');
    expect(startCall[1].LOTNAME2).toBe('');
  });

  it('8. memorization sends legacy contract keys (PORTNAME, CH_EQPID, USER_ID, EQP_TYPE)', async () => {
    mockParsed({ BODY: { POPUP: '' } });
    const res = await remoteImpBatchService.memorization('EQP-01', 'RCP-01', 'LOT-01');
    expect(postJsonMessage).toHaveBeenCalledWith('MEMORIZATION', {
      EQPID: 'EQP-01',
      RECIPE: 'RCP-01',
      LOTID: 'LOT-01',
      PORTNAME: '',
      CH_EQPID: 'EQP-01',
      USER_ID: 'ENGINEER',
      EQP_TYPE: 'IMP',
    });
    expect(res.isSuccessFul).toBe(true);
  });

  it('9. memorization forwards explicit portName, userId and eqpType', async () => {
    mockParsed({ BODY: {} });
    await remoteImpBatchService.memorization(
      'EQP-01',
      'RCP-01',
      'LOT-01',
      'PORT-1',
      'OP-99',
      'IMP',
    );
    expect(postJsonMessage).toHaveBeenCalledWith(
      'MEMORIZATION',
      expect.objectContaining({
        PORTNAME: 'PORT-1',
        CH_EQPID: 'EQP-01',
        USER_ID: 'OP-99',
        EQP_TYPE: 'IMP',
      }),
    );
  });

  it('10. areaBayInfo and bayStockerInfo build the expected payloads', async () => {
    mockParsed({ BODY: {} });

    await remoteImpBatchService.areaBayInfo('KFAB');
    expect(postJsonMessage).toHaveBeenLastCalledWith('AREABAYINFO', { FACILITY: 'KFAB' });

    await remoteImpBatchService.bayStockerInfo('BAY-A', 'KFAB');
    expect(postJsonMessage).toHaveBeenLastCalledWith('BAYSTOCKERINFO', {
      BAY: 'BAY-A',
      FACILITY: 'KFAB',
    });
  });

  it('11. lotInfo builds the expected payload', async () => {
    mockParsed({ BODY: {} });
    await remoteImpBatchService.lotInfo('MVIN', 'LOT-01', 'KFAB');
    expect(postJsonMessage).toHaveBeenLastCalledWith('LOTINFO', {
      TYPE: 'MVIN',
      LOTID: 'LOT-01',
      FACILITY: 'KFAB',
    });
  });
});
