import {
  changeMaskLocation,
  fetchMaskDetailLocations,
  fetchMaskInfo,
  fetchMaskLocationGroups,
  fetchMaskStatuses,
  MultiMaskMessageError,
} from 'src/features/multi-mask-location/services/multi-mask-location.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPostAifMessage } = vi.hoisted(() => ({ mockPostAifMessage: vi.fn() }));

vi.mock('src/services/aif-message.service', () => ({ postAifMessage: mockPostAifMessage }));

function pass(body: unknown) {
  return { statusCode: 200, result: JSON.stringify({ STATUS: 'PASS', MSGBODY: body }) };
}

describe('multi mask location service', () => {
  beforeEach(() => {
    mockPostAifMessage.mockReset();
  });

  it('reads MASKSTATUSINFO STATUSES.ITEM like getMessageBodyList', async () => {
    mockPostAifMessage.mockResolvedValueOnce(
      pass({ STATUSES: { ITEM: [{ STATUS: 'STOCK' }, { STATUS: 'INUSE' }] } }),
    );

    await expect(fetchMaskStatuses('GUMI')).resolves.toEqual(['STOCK', 'INUSE']);
    expect(mockPostAifMessage).toHaveBeenCalledWith('maskstatusinfo', 'MASKSTATUSINFO', [
      ['FACILITY', 'GUMI'],
    ]);
  });

  it('accepts a single ITEM object as a one-entry list', async () => {
    mockPostAifMessage.mockResolvedValueOnce(pass({ LOCGROUPS: { ITEM: { LOCGROUP: 'PHOTO' } } }));

    await expect(fetchMaskLocationGroups('INUSE', '', 'GUMI')).resolves.toEqual(['PHOTO']);
    expect(mockPostAifMessage).toHaveBeenCalledWith('masklocgroupinfo', 'MASKLOCGROUPINFO', [
      ['STATUS', 'INUSE'],
      ['FLOOR', ''],
      ['FACILITY', 'GUMI'],
    ]);
  });

  it('sends MASKLOCATIONINFO through the masklocgroupinfo route as Android does', async () => {
    mockPostAifMessage.mockResolvedValueOnce(pass({ LOCATIONS: { ITEM: [{ LOCATION: 'A-01' }] } }));

    await expect(fetchMaskDetailLocations('STOCK', 'STOCKER-A', '2F', 'GUMI')).resolves.toEqual([
      'A-01',
    ]);
    expect(mockPostAifMessage).toHaveBeenCalledWith('masklocgroupinfo', 'MASKLOCATIONINFO', [
      ['STATUS', 'STOCK'],
      ['LOCGROUP', 'STOCKER-A'],
      ['FLOOR', '2F'],
      ['FACILITY', 'GUMI'],
    ]);
  });

  it('maps single-mask MASKINFO fields to the grid columns', async () => {
    mockPostAifMessage.mockResolvedValueOnce(
      pass({
        RETICLETAG: 'MASK-0001',
        PRODUCT: 'P-1',
        STATUS: 'STOCK',
        ISUSE: 'Y',
        CURRLOC: 'STOCKER-A',
      }),
    );

    await expect(fetchMaskInfo('RT-0001', 'GUMI')).resolves.toEqual({
      MASKTAG: 'MASK-0001',
      ISUSE: 'Y',
      STATUS: 'STOCK',
      CURRLOC: 'STOCKER-A',
      PRODUCT: 'P-1',
    });
    expect(mockPostAifMessage).toHaveBeenCalledWith('maskinfo', 'MASKINFO', [
      ['RETICLEID', 'RT-0001'],
      ['FACILITY', 'GUMI'],
    ]);
  });

  it('sends CHANGEMASKLOCATION through the checkpellicle route in the legacy field order', async () => {
    mockPostAifMessage.mockResolvedValueOnce(pass({ RETCILES: 'MASK-0001', SCOUNT: '1' }));

    await changeMaskLocation(
      'RT-0001',
      { status: 'CLEAN', location: 'CLEAN-ROOM', detailLocation: 'CR-01', floor: '4F' },
      { facility: 'GUMI', operatorId: 'OP-01' },
    );

    expect(mockPostAifMessage).toHaveBeenCalledWith('checkpellicle', 'CHANGEMASKLOCATION', [
      ['RETICLEID', 'RT-0001'],
      ['FACILITY', 'GUMI'],
      ['LOCTYPE', 'MULTI'],
      ['LOCATION', ''],
      ['ETCSTATUS', 'CLEAN'],
      ['ETCLOCATION', 'CLEAN-ROOM'],
      ['ETCDETAILLOC', 'CR-01'],
      ['SUBLOCATION3', ''],
      ['OPERATORID', 'OP-01'],
      ['FLOOR', '4F'],
    ]);
  });

  it('treats a PASS without MSGBODY as an error like MessageSender.checkValidate', async () => {
    mockPostAifMessage.mockResolvedValueOnce({
      statusCode: 200,
      result: JSON.stringify({ STATUS: 'PASS', MSGBODY: '' }),
    });

    await expect(fetchMaskStatuses('GUMI')).rejects.toThrow('BODY가 존재하지 않습니다');
  });

  it('throws the server ERRMSG for a failed response', async () => {
    mockPostAifMessage.mockResolvedValueOnce({
      statusCode: 200,
      result: JSON.stringify({ STATUS: 'FAIL', ERRMSG: 'MASK 정보가 없습니다.' }),
    });

    await expect(fetchMaskInfo('RT-NONE', 'GUMI')).rejects.toEqual(
      new MultiMaskMessageError('MASK 정보가 없습니다.'),
    );
  });
});
