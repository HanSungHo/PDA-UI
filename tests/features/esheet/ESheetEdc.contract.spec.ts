import apiClient from 'src/services/api-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getEdcDataMessage } from '../../../src/features/esheet/services/esheet-edc.message-factory';
import { getEdcData } from '../../../src/features/esheet/services/esheet-edc.service';
import type { ESheetEdcRequest } from '../../../src/features/esheet/types/esheet-edc.types';
import { getEdcColumns } from '../../../src/features/esheet/utils/esheet-edc.columns';

const request: ESheetEdcRequest = {
  deviceName: 'AR-DEMO',
  facility: 'KFAB',
  lotId: 'LOT-DEMO-01',
  mobileServerName: 'DEV-SERVER',
  operation: '1000',
  processStep: 'PHOTO',
  recipe: 'RCP-THK-01',
  subOperation: '00',
};

describe('ESheet EDC message factory', () => {
  it('serializes the legacy AIFMSG header and body fields in order', () => {
    expect(getEdcDataMessage(request)).toBe(
      [
        '<AIFMSG>',
        '<MSGNAME>GETEDCDATA</MSGNAME>',
        '<RECEIVER>DEV-SERVER</RECEIVER>',
        '<SENDER>AR-DEMO</SENDER>',
        '<MSGTYPE>P</MSGTYPE>',
        '<WITHREPLY>YES</WITHREPLY>',
        '<STATUS></STATUS>',
        '<ERRMSG></ERRMSG>',
        '<TID></TID>',
        '<MSGBODY>',
        '<LOTID>LOT-DEMO-01</LOTID>',
        '<FACILITY>KFAB</FACILITY>',
        '<OPERATION>1000</OPERATION>',
        '<SUBOPERATION>00</SUBOPERATION>',
        '<OPERATIONDESC>PHOTO</OPERATIONDESC>',
        '<RECIPE>RCP-THK-01</RECIPE>',
        '</MSGBODY>',
        '</AIFMSG>',
      ].join('\n'),
    );
  });
});

describe('ESheet EDC columns', () => {
  it('uses the THICK compact column set when full view is off', () => {
    const columns = getEdcColumns('THICK', false);
    const labels = columns.map((column) => column.name);

    expect(labels).toEqual([
      'SLOT',
      '생산장비',
      '계측장비',
      'PARA',
      'RECIPE',
      'MIN',
      'MAX',
      'AVG',
      'QUL',
      'QCL',
      'QLL',
      'SITECOUNT',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      'RANGE',
    ]);
    expect(columns.find((column) => column.name === 'QUL')?.size).toBe(0);
    expect(columns.find((column) => column.name === 'RANGE')?.size).toBe(120);
  });

  it('includes statistic and nine site columns in full THICK/CD view', () => {
    const labels = getEdcColumns('CD', true).map((column) => column.name);

    expect(labels).toContain('QUL');
    expect(labels).toContain('9');
    expect(labels).toContain('RANGE');
    expect(labels).toHaveLength(22);
  });

  it('keeps overlay statistics in compact view and hides only site values', () => {
    const columns = getEdcColumns('OVERLAY', false);
    const labels = columns.map((column) => column.name);

    expect(labels).toContain('MINX');
    expect(labels).toContain('AVGY');
    expect(labels).toContain('QUL');
    expect(labels).toContain('SITECOUNT');
    expect(labels).toContain('RANGEY');
    expect(labels).toContain('1');
    expect(columns.find((column) => column.name === '1')?.size).toBe(0);
  });

  it('includes all nineteen overlay site values in full view', () => {
    const labels = getEdcColumns('OVERLAY', true).map((column) => column.name);

    expect(labels).toContain('1');
    expect(labels).toContain('19');
    expect(labels).toHaveLength(36);
  });

  it('does not render a grid for unsupported process types', () => {
    expect(getEdcColumns('WT', true)).toEqual([]);
  });
});

describe('ESheet EDC service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('posts the legacy message name and serialized message to the API client', async () => {
    const response = { statusCode: 200, result: '{"STATUS":"PASS"}' };
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: response } as never);

    await expect(getEdcData(request)).resolves.toEqual(response);
    expect(post).toHaveBeenCalledWith('/hifos/getEdcData', {
      sMsg: getEdcDataMessage(request),
    });
  });
});
