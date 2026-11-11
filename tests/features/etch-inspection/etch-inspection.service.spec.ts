import * as service from 'src/features/etch-inspection/services/etch-inspection.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

const executionPayload = {
  facility: 'FAB-A',
  lotId: 'LOT-1',
  product: 'PRODUCT-A',
  oldOperation: 'ETCH-010',
  oldOperationDesc: 'Old operation',
  oldMachine: 'EQP-1',
  operatorId: 'OPERATOR-1',
  comment: 'memo',
};

describe('Etch Inspection service (mock server API)', () => {
  beforeEach(() => {
    postAifMessage.mockReset();
  });

  it('sends ETCHINSPINFO with the legacy TYPE=S and LOTID fields', async () => {
    postAifMessage.mockResolvedValue(pass({}));

    await service.searchData('LOT-1');

    expect(postAifMessage).toHaveBeenCalledWith('EtchInspectionInfo', 'ETCHINSPINFO', [
      ['TYPE', 'S'],
      ['LOTID', 'LOT-1'],
    ]);
  });

  it('maps the response keys the legacy Activity reads and defaults missing ones to empty', async () => {
    postAifMessage.mockResolvedValue(
      pass({
        OLDPROCESSOPERATIONNAME: 'ETCH-010',
        OLDMACHINENAME: 'ETCH-EQP-01',
        INSPDATE: '2026-09-29 10:30:00',
      }),
    );

    const response = await service.searchData('LOT-EXIST');

    expect(response.success).toBe(true);
    expect(response.data).toEqual({
      OLDPROCESSOPERATIONNAME: 'ETCH-010',
      OLDOPERATIONDESCRIPTION: '',
      OLDMACHINENAME: 'ETCH-EQP-01',
      NOWPROCESSOPERATIONNAME: '',
      NOWOPERATIONDESCRIPTION: '',
      INSPDATE: '2026-09-29 10:30:00',
      PRODUCTSPECNAME: '',
    });
  });

  it('returns the server error message when the search fails', async () => {
    postAifMessage.mockResolvedValue(fail('LOT 정보가 없습니다.'));

    expect(await service.searchData('LOT-NOTFOUND')).toEqual({
      success: false,
      data: null,
      errorMessage: 'LOT 정보가 없습니다.',
    });
  });

  it('turns a transport error into a failed search', async () => {
    postAifMessage.mockRejectedValue(new Error('Network Error'));

    expect(await service.searchData('LOT-1')).toEqual({
      success: false,
      data: null,
      errorMessage: 'Network Error',
    });
  });

  it('sends ETCHINSPEXCUTION with the legacy request fields', async () => {
    postAifMessage.mockResolvedValue(pass({}));

    const response = await service.execution(executionPayload);

    expect(response).toEqual({ success: true, errorMessage: '' });
    expect(postAifMessage).toHaveBeenCalledWith('EtchInspectionexecution', 'ETCHINSPEXCUTION', [
      ['FACILITY', 'FAB-A'],
      ['LOTNAME', 'LOT-1'],
      ['PRODUCTSPEC', 'PRODUCT-A'],
      ['MACHINE', 'EQP-1'],
      ['OPERATION', 'ETCH-010'],
      ['OPERATIONDESC', 'Old operation'],
      ['USERID', 'OPERATOR-1'],
      ['COMMENT', 'memo'],
    ]);
  });

  it('returns the server error message when execution fails', async () => {
    postAifMessage.mockResolvedValue(fail('완성검사 처리에 실패하였습니다.'));

    expect(await service.execution(executionPayload)).toEqual({
      success: false,
      errorMessage: '완성검사 처리에 실패하였습니다.',
    });
  });
});
