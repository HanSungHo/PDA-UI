import { beforeEach, describe, expect, it, vi } from 'vitest';

const { post } = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock('src/services/api-client', () => ({ default: { post } }));

import { createPinia, setActivePinia } from 'pinia';

import {
  deleteEEN,
  fetchEENSettingItems,
  fetchEENTagOptions,
  updateEENModifyItem,
} from '../../../src/features/een-setting/services/een-setting.service';

function messageResponse(status: 'PASS' | 'FAIL', messageBody: object = {}, errorMessage = '') {
  return {
    data: {
      statusCode: 200,
      result: JSON.stringify({ STATUS: status, MSGBODY: messageBody, ERRMSG: errorMessage }),
    },
  };
}

function sentMessage(call = 0): { url: string; sMsg: string } {
  const [url, body] = post.mock.calls[call] as [string, { sMsg: string }];
  return { url, sMsg: body.sMsg };
}

const listRow = {
  EENID: 'EEN-0001',
  PROCESSOPERATIONNAMEDESC: 'PHOTO-EXPOSURE',
  TAGCOMMENT: 'Designer Review',
  ACTIONPOINT: 'MOVEIN',
  FACTORYNAME: 'GUMI',
  PRODUCTSPECNAME: 'HIFI-UI-DEMO',
  PROCESSFLOWNAME: 'PHOTO-DEMO',
  PROCESSOPERATIONNAME: '1200',
  TAGID: 'TAG-001',
  CREATETIME: '2026-10-28 09:12:30',
  CREATEUSER: 'DEMO',
  CONFIRMUSER: '',
  CONFIRMTIME: '',
  DESCRIPTION: 'PHOTO-EXPOSURE-DESC',
};

describe('EEN setting service', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    post.mockReset();
  });

  it('loads GETEENLIST rows through the message route with LOTNAME and FACILITY', async () => {
    post.mockResolvedValueOnce(messageResponse('PASS', { ITEMS: { ITEM: [listRow] } }));

    const result = await fetchEENSettingItems({ lotId: 'LOT-DEMO-01', facility: 'GUMI' });

    const { url, sMsg } = sentMessage();
    expect(url).toBe('/hifos/message');
    expect(sMsg).toContain('<MSGNAME>GETEENLIST</MSGNAME>');
    expect(sMsg).toContain('<LOTNAME>LOT-DEMO-01</LOTNAME>');
    expect(sMsg).toContain('<FACILITY>GUMI</FACILITY>');
    expect(result).toEqual({
      success: true,
      data: [
        {
          id: 'EEN-0001',
          eenId: 'EEN-0001',
          processName: 'PHOTO-EXPOSURE',
          tagComment: 'Designer Review',
          actionPoint: 'MOVEIN',
          factoryName: 'GUMI',
          product: 'HIFI-UI-DEMO',
          route: 'PHOTO-DEMO',
          operation: '1200',
          processOperationName: '1200',
          tagId: 'TAG-001',
          createTime: '2026-10-28 09:12:30',
          createUser: 'DEMO',
          confirmUser: '',
          confirmTime: '',
          poDesc: 'PHOTO-EXPOSURE-DESC',
        },
      ],
    });
  });

  it('accepts a single GETEENLIST row object and an empty list', async () => {
    post.mockResolvedValueOnce(messageResponse('PASS', { ITEMS: { ITEM: listRow } }));
    post.mockResolvedValueOnce(messageResponse('PASS', { ITEMS: '' }));

    const single = await fetchEENSettingItems({ lotId: 'LOT-DEMO-01', facility: 'GUMI' });
    const empty = await fetchEENSettingItems({ lotId: 'LOT-NONE', facility: 'GUMI' });

    expect(single.success && single.data.map(({ eenId }) => eenId)).toEqual(['EEN-0001']);
    expect(empty).toEqual({ success: true, data: [] });
  });

  it('returns the GETEENLIST business error and network errors', async () => {
    post.mockResolvedValueOnce(messageResponse('FAIL', {}, 'LOT 정보가 없습니다.'));
    post.mockRejectedValueOnce(new Error('Network down'));

    expect(await fetchEENSettingItems({ lotId: 'X', facility: 'GUMI' })).toEqual({
      success: false,
      message: 'LOT 정보가 없습니다.',
    });
    expect(await fetchEENSettingItems({ lotId: 'X', facility: 'GUMI' })).toEqual({
      success: false,
      message: 'Network down',
    });
  });

  it('loads GETTAGID options from its own route and splits TAGLIST rows', async () => {
    post.mockResolvedValueOnce(
      messageResponse('PASS', { TAGLIST: 'TAG-001\tFirst comment\nTAG-002\t두 번째 TAG 설명\n' }),
    );

    const result = await fetchEENTagOptions('GUMI');

    const { url, sMsg } = sentMessage();
    expect(url).toBe('/hifos/gettagid');
    expect(sMsg).toContain('<FACTORYNAME>GUMI</FACTORYNAME>');
    expect(result).toEqual({
      success: true,
      data: [
        { tagId: 'TAG-001', tagComment: 'First comment' },
        { tagId: 'TAG-002', tagComment: '두 번째 TAG 설명' },
      ],
    });
  });

  it('returns an empty TAG list and the GETTAGID business error', async () => {
    post.mockResolvedValueOnce(messageResponse('PASS', { TAGLIST: '' }));
    post.mockResolvedValueOnce(messageResponse('FAIL', {}, 'GETTAGID mock error'));

    expect(await fetchEENTagOptions('GUMI')).toEqual({ success: true, data: [] });
    expect(await fetchEENTagOptions('GUMI')).toEqual({
      success: false,
      message: 'GETTAGID mock error',
    });
  });

  it('sends UPDATEEEN through the message route with the legacy fields', async () => {
    post.mockResolvedValueOnce(messageResponse('PASS', { RESULT: 'OK' }));

    const result = await updateEENModifyItem({
      lotId: 'LOT-DEMO-01',
      userId: 'OPERATOR01',
      facility: 'GUMI',
      product: 'HIFI-UI-DEMO',
      operation: '1200',
      actionPoint: 'MOVEOUT',
      eenId: 'EEN-0001',
      processFlow: 'PHOTO-DEMO',
      tagComment: 'Updated comment',
      tagId: null,
      oldTagComment: 'Designer Review',
      changeCause: 'Design QA',
    });

    const { url, sMsg } = sentMessage();
    expect(url).toBe('/hifos/message');
    expect(sMsg).toContain('<MSGNAME>UPDATEEEN</MSGNAME>');
    for (const field of [
      '<LOTNAME>LOT-DEMO-01</LOTNAME>',
      '<USERID>OPERATOR01</USERID>',
      '<FACILITY>GUMI</FACILITY>',
      '<PRODUCT>HIFI-UI-DEMO</PRODUCT>',
      '<OPERATION>1200</OPERATION>',
      '<ACTIONPOINT>MOVEOUT</ACTIONPOINT>',
      '<TAGCOMMENT>Updated comment</TAGCOMMENT>',
      '<EENID>EEN-0001</EENID>',
      '<PROCESSFLOW>PHOTO-DEMO</PROCESSFLOW>',
      '<TAGID>null</TAGID>',
      '<OLDTAGCOMMENT>Designer Review</OLDTAGCOMMENT>',
      '<CHANGECAUSE>Design QA</CHANGECAUSE>',
    ]) {
      expect(sMsg).toContain(field);
    }
    expect(result).toEqual({ success: true });
  });

  it('returns the UPDATEEEN business error', async () => {
    post.mockResolvedValueOnce(messageResponse('FAIL', {}, 'EEN 정보를 찾을 수 없습니다.'));

    const result = await updateEENModifyItem({
      lotId: 'LOT-DEMO-01',
      userId: 'OPERATOR01',
      facility: 'GUMI',
      product: 'HIFI-UI-DEMO',
      operation: '1200',
      actionPoint: 'MOVEIN',
      eenId: 'MISSING',
      processFlow: 'PHOTO-DEMO',
      tagComment: 'Comment',
      tagId: 'TAG-001',
      oldTagComment: 'Comment',
      changeCause: '',
    });

    expect(result).toEqual({ success: false, message: 'EEN 정보를 찾을 수 없습니다.' });
  });

  it('sends DELETEEEN through the message route and maps its error', async () => {
    post.mockResolvedValueOnce(messageResponse('PASS', { RESULT: 'OK' }));
    post.mockResolvedValueOnce(messageResponse('FAIL', {}, 'EEN 정보를 찾을 수 없습니다.'));
    const request = {
      lotId: 'LOT-DEMO-01',
      userId: 'OPERATOR01',
      facility: 'GUMI',
      product: 'HIFI-UI-DEMO',
      operation: '1200',
      actionPoint: 'MOVEIN',
      eenId: 'EEN-0001',
      route: 'PHOTO-DEMO',
      comment: 'Designer Review',
      tagId: 'TAG-001',
      deleteReason: '  reason kept as typed  ',
    };

    expect(await deleteEEN(request)).toEqual({ success: true });
    expect(await deleteEEN(request)).toEqual({
      success: false,
      errorMessage: 'EEN 정보를 찾을 수 없습니다.',
    });

    const { url, sMsg } = sentMessage();
    expect(url).toBe('/hifos/message');
    expect(sMsg).toContain('<MSGNAME>DELETEEEN</MSGNAME>');
    for (const field of [
      '<LOTNAME>LOT-DEMO-01</LOTNAME>',
      '<USERID>OPERATOR01</USERID>',
      '<FACILITY>GUMI</FACILITY>',
      '<PRODUCT>HIFI-UI-DEMO</PRODUCT>',
      '<OPERATION>1200</OPERATION>',
      '<ACTIONPOINT>MOVEIN</ACTIONPOINT>',
      '<EENID>EEN-0001</EENID>',
      '<PROCESSFLOW>PHOTO-DEMO</PROCESSFLOW>',
      '<TAGCOMMENT>Designer Review</TAGCOMMENT>',
      '<TAGID>TAG-001</TAGID>',
      '<CHANGECAUSE>  reason kept as typed  </CHANGECAUSE>',
    ]) {
      expect(sMsg).toContain(field);
    }
  });
});
