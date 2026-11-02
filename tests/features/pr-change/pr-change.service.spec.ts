import { prChangeService } from 'src/features/pr-change/services/pr-change.service';
import { postAifMessage } from 'src/services/aif-message.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('src/services/aif-message.service', () => ({ postAifMessage: vi.fn() }));

function respond(body: unknown): void {
  vi.mocked(postAifMessage).mockResolvedValue({
    statusCode: 200,
    result: JSON.stringify(body),
  });
}

describe('prChangeService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends the PUMPSTATUS message with PUMPID and returns the message body', async () => {
    respond({ STATUS: 'PASS', MSGBODY: { EQPID: 'EQP-1', FLAG: '1' } });

    await expect(prChangeService.pumpStatus({ pumpId: 'PUMP-001' })).resolves.toEqual({
      isSuccessFul: true,
      messageBody: { EQPID: 'EQP-1', FLAG: '1' },
      errorMessage: '',
    });
    expect(postAifMessage).toHaveBeenCalledWith('PUMPSTATUS', 'PUMPSTATUS', [
      ['PUMPID', 'PUMP-001'],
    ]);
  });

  it('sends the CURRENTPRINFO fields in the legacy order', async () => {
    respond({ STATUS: 'PASS', MSGBODY: { PRID: '1001' } });

    await prChangeService.currentPrInfo({
      eqpId: 'EQP-1',
      pumpName: 'PUMP-001',
      prId: '1001',
      prLot: 'LT123',
      viscosity: '0450',
    });

    expect(postAifMessage).toHaveBeenCalledWith('CURRENTPRINFO', 'CURRENTPRINFO', [
      ['EQPID', 'EQP-1'],
      ['PUMPNAME', 'PUMP-001'],
      ['PRID', '1001'],
      ['PRLOT', 'LT123'],
      ['VISCOSITY', '0450'],
    ]);
  });

  it('sends the PRINFO fields including VALIDDATE', async () => {
    respond({ STATUS: 'PASS', MSGBODY: {} });

    await prChangeService.prInfo({
      eqpId: 'EQP-1',
      pumpName: 'PUMP-001',
      prId: '1003',
      prLot: '0450',
      viscosity: 'LT123',
      validate: '261231',
    });

    expect(postAifMessage).toHaveBeenCalledWith('PRINFO', 'PRINFO', [
      ['EQPID', 'EQP-1'],
      ['PUMPNAME', 'PUMP-001'],
      ['PRID', '1003'],
      ['PRLOT', '0450'],
      ['VISCOSITY', 'LT123'],
      ['VALIDDATE', '261231'],
    ]);
  });

  it('sends the COMPAREPRINFO fields including TIME and BANJANGID', async () => {
    respond({ STATUS: 'PASS', MSGBODY: {} });

    await prChangeService.comparePrInfo({
      eqpId: 'EQP-1',
      pumpName: 'PUMP-001',
      prId: '1001',
      prLot: 'LT123',
      viscosity: '0450',
      time: '20261027090000',
      banJangId: 'OP1',
    });

    expect(postAifMessage).toHaveBeenCalledWith('COMPAREPRINFO', 'COMPAREPRINFO', [
      ['EQPID', 'EQP-1'],
      ['PUMPNAME', 'PUMP-001'],
      ['PRID', '1001'],
      ['PRLOT', 'LT123'],
      ['VISCOSITY', '0450'],
      ['TIME', '20261027090000'],
      ['BANJANGID', 'OP1'],
    ]);
  });

  it('posts the PRCHANGE message to the legacy currentprinfo endpoint', async () => {
    respond({ STATUS: 'PASS', MSGBODY: {} });

    await prChangeService.prChange({
      eqpId: 'EQP-1',
      pumpName: 'PUMP-001',
      prId: '1003',
      prDesc: 'SE-PR-1003',
      prComp: 'SHIN-ETSU',
      viscosity: '1003',
      prLot: 'LT123',
      validateTime: '261231',
      userId: 'OP1',
      userName: 'Operator',
      leak: 'false',
      inDate: '202610270900',
    });

    expect(postAifMessage).toHaveBeenCalledWith('CURRENTPRINFO', 'PRCHANGE', [
      ['EQPID', 'EQP-1'],
      ['PUMPNAME', 'PUMP-001'],
      ['PRID', '1003'],
      ['PRDESC', 'SE-PR-1003'],
      ['PRCOMP', 'SHIN-ETSU'],
      ['VISCOSITY', '1003'],
      ['PRLOT', 'LT123'],
      ['VALIDTIME', '261231'],
      ['USERID', 'OP1'],
      ['USERNAME', 'Operator'],
      ['LEAK', 'false'],
      ['INDATE', '202610270900'],
    ]);
  });

  it('reports the server ERRMSG when STATUS is not PASS', async () => {
    respond({ STATUS: 'FAIL', ERRMSG: '등록되지 않은 PUMP 입니다.', MSGBODY: '' });

    await expect(prChangeService.pumpStatus({ pumpId: 'NOPE' })).resolves.toEqual({
      isSuccessFul: false,
      messageBody: {},
      errorMessage: '등록되지 않은 PUMP 입니다.',
    });
  });

  it('reports transport errors as an unsuccessful message', async () => {
    vi.mocked(postAifMessage).mockRejectedValue(new Error('Network Error'));

    await expect(prChangeService.pumpStatus({ pumpId: 'PUMP-001' })).resolves.toEqual({
      isSuccessFul: false,
      messageBody: {},
      errorMessage: 'Network Error',
    });
  });

  it('stringifies non-Error rejections', async () => {
    vi.mocked(postAifMessage).mockRejectedValue('boom');

    const result = await prChangeService.pumpStatus({ pumpId: 'PUMP-001' });

    expect(result.errorMessage).toBe('boom');
  });
});
