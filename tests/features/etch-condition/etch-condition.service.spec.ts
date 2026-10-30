import {
  EtchConditionMessageError,
  fetchEtchCondition,
} from 'src/features/etch-condition/services/etch-condition.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPostAifMessage } = vi.hoisted(() => ({ mockPostAifMessage: vi.fn() }));

vi.mock('src/services/aif-message.service', () => ({ postAifMessage: mockPostAifMessage }));

function pass(body: unknown) {
  return { statusCode: 200, result: JSON.stringify({ STATUS: 'PASS', MSGBODY: body }) };
}

describe('etch condition service', () => {
  beforeEach(() => {
    mockPostAifMessage.mockReset();
  });

  it('posts ETCH_COMMRCPFROMB to the etchcommrcpfromb route and reads COMMRCP.ITEM', async () => {
    mockPostAifMessage.mockResolvedValueOnce(
      pass({
        PROCESS_TYPE: 'DPS POLY',
        OPERDESC: '4200 DPS POLY',
        PARA2ND: 'RF',
        VALUE2ND: 650,
        COMM2ND: '',
        HMEEN: 'EEN',
        COMMRCP: { ITEM: [{ CHAMBER: 'A', BASE_VALUE: 600, CHKCHK: null }] },
      }),
    );

    await expect(fetchEtchCondition('LOT-1', '4E03-21')).resolves.toEqual({
      processType: 'DPS POLY',
      operDesc: '4200 DPS POLY',
      para2nd: 'RF',
      value2nd: '650',
      comm2nd: '',
      hmEen: 'EEN',
      rows: [{ CHAMBER: 'A', BASE_VALUE: '600', CHKCHK: '' }],
    });
    expect(mockPostAifMessage).toHaveBeenCalledWith('etchcommrcpfromb', 'ETCH_COMMRCPFROMB', [
      ['LOTID', 'LOT-1'],
      ['CHKEQPID', '4E03-21'],
    ]);
  });

  it('accepts a single ITEM object and treats a missing COMMRCP as an empty list', async () => {
    mockPostAifMessage
      .mockResolvedValueOnce(pass({ COMMRCP: { ITEM: { COL: 'GAP', VALUE: '1' } } }))
      .mockResolvedValueOnce(pass({ COMMRCP: '' }));

    await expect(fetchEtchCondition('LOT-1', '')).resolves.toMatchObject({
      processType: '',
      rows: [{ COL: 'GAP', VALUE: '1' }],
    });
    await expect(fetchEtchCondition('LOT-1', '')).resolves.toMatchObject({ rows: [] });
  });

  it('treats a PASS without MSGBODY as an error like MessageSender.checkValidate', async () => {
    mockPostAifMessage.mockResolvedValueOnce({
      statusCode: 200,
      result: JSON.stringify({ STATUS: 'PASS', MSGBODY: '' }),
    });

    await expect(fetchEtchCondition('LOT-1', '')).rejects.toThrow('BODY가 존재하지 않습니다');
  });

  it('throws the server ERRMSG on a failed reply', async () => {
    mockPostAifMessage.mockResolvedValueOnce({
      statusCode: 200,
      result: JSON.stringify({ STATUS: 'FAIL', ERRMSG: 'LOT 정보가 없습니다.' }),
    });

    const request = fetchEtchCondition('LOT-X', '');

    await expect(request).rejects.toBeInstanceOf(EtchConditionMessageError);
    await expect(request).rejects.toThrow('LOT 정보가 없습니다.');
  });
});
