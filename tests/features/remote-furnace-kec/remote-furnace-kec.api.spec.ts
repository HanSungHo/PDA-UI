import { AxiosHeaders } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  BATCHLISTBYLOT,
  buildRemoteFurnaceKecStartBody,
  CHANGEEQPSTATUS,
  FURNACE_KJCHECK,
  FURNACEDUMMYRCP,
  FURNACEINTLKCHECK,
  FurnaceremoteStart_KEC,
  LOTINFO,
  MACHINEPORTCLEAR,
  MACHINEPORTSTATUS_KJ,
  parseRemoteFurnaceKecResponse,
  RECIPEINFO,
  REMOTEEQPINFO,
  type RemoteFurnaceKecStartRequest,
} from '../../../src/features/remote-furnace-kec/services/remote-furnace-kec.api';
import apiClient from '../../../src/services/api-client';

vi.mock('../../../src/services/api-client', () => ({
  default: { post: vi.fn() },
}));

const request: RemoteFurnaceKecStartRequest = {
  machineName: 'PROC-EQP',
  batchId: 'BATCH-01',
  recipeName: 'RCP-01',
  eventUser: 'OPERATOR-01',
  portName: 'PORT-01',
  commandType: 'ENTER_START',
  lotList: "'LOT-01','LOT-02'",
  isDummy: 'F',
  lotName: 'LOT-01',
  checkNoBatch: 'F',
  stepRemove: 'F',
  mwfCount: '3',
};

const mockPost = vi.mocked(apiClient.post);

function expectMessage(messageName: string, body: unknown): void {
  expect(mockPost).toHaveBeenLastCalledWith('/hifos/message', body, {
    headers: {
      'Content-Type': 'application/xml',
      Accept: 'application/xml, text/xml, */*',
      MESSAGENAME: messageName,
      ORIGIN: 'P',
      ACK: 'YES',
    },
    responseType: 'text',
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPost.mockResolvedValue({
    data: '{"STATUS":"PASS","MSGBODY":{"ACK":"Y"}}',
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { headers: new AxiosHeaders() },
  });
});

describe('buildRemoteFurnaceKecStartBody', () => {
  it('preserves the legacy KEC message name, XML field names, order and values', () => {
    expect(buildRemoteFurnaceKecStartBody(request)).toBe(`<BODY>
  <MACHINENAME>PROC-EQP</MACHINENAME>
  <BATCHID>BATCH-01</BATCHID>
  <RECIPENAME>RCP-01</RECIPENAME>
  <EVENTUSER>OPERATOR-01</EVENTUSER>
  <PORTNAME>PORT-01</PORTNAME>
  <CMDTYPE>ENTER_START</CMDTYPE>
  <LOTLIST>'LOT-01','LOT-02'</LOTLIST>
  <ISDUMMY>F</ISDUMMY>
  <LOTNAME>LOT-01</LOTNAME>
  <CHKNOBATCH>F</CHKNOBATCH>
  <STEPREMOVE>F</STEPREMOVE>
  <MWFCOUNT>3</MWFCOUNT>
</BODY>`);
  });
});

describe('Remote Furnace KEC message contracts', () => {
  it('sends the parent furnace type check with LOTID', async () => {
    await FURNACE_KJCHECK('LOT-01');

    expectMessage('FURNACE_KJCHECK', '<BODY>\n  <LOTID>LOT-01</LOTID>\n</BODY>');
  });

  it('sends equipment lookup with EQPID', async () => {
    await REMOTEEQPINFO('EQP-01');

    expectMessage('REMOTEEQPINFO', '<BODY>\n  <EQPID>EQP-01</EQPID>\n</BODY>');
  });

  it('preserves the initial LOTINFO request field order and OPERATORID', async () => {
    await LOTINFO({ lotId: 'LOT-01', facility: 'FAB1', operatorId: 'OP-01' }, true);

    expectMessage(
      'LOTINFO',
      '<BODY>\n  <LOTID>LOT-01</LOTID>\n  <FACILITY>FAB1</FACILITY>\n  <TYPE>MVIN</TYPE>\n  <OPERATORID>OP-01</OPERATORID>\n</BODY>',
    );
  });

  it('preserves the comment-check LOTINFO request field order without OPERATORID', async () => {
    await LOTINFO({ lotId: 'LOT-02', facility: 'FAB2' }, false);

    expectMessage(
      'LOTINFO',
      '<BODY>\n  <TYPE>MVIN</TYPE>\n  <LOTID>LOT-02</LOTID>\n  <FACILITY>FAB2</FACILITY>\n</BODY>',
    );
  });

  it('includes exact RECIPEINFO legacy fields', async () => {
    await RECIPEINFO({
      lotId: 'LOT-01',
      operation: 'OP-1',
      subOperation: 'SUB-1',
      product: 'PRODUCT-1',
      equipmentId: 'EQP-1',
      operationType: 'M',
      facility: 'FAB1',
      isDummy: 'F',
    });

    expectMessage('RECIPEINFO', expect.stringContaining('<ISPHOTO>N</ISPHOTO>'));
    expectMessage('RECIPEINFO', expect.stringContaining('<ISDUMMY>F</ISDUMMY>'));
  });

  it('sends the exact batch, interlock, port status and port clear message fields', async () => {
    await FURNACEDUMMYRCP('MAIN-1');
    expectMessage('FURNACEDUMMYRCP', '<BODY>\n  <MACHINENAME>MAIN-1</MACHINENAME>\n</BODY>');

    await BATCHLISTBYLOT('LOT-01', 'FAB1', 'BASE-RCP');
    expectMessage(
      'BATCHLISTBYLOT',
      '<BODY>\n  <LOTID>LOT-01</LOTID>\n  <FACILITY>FAB1</FACILITY>\n  <STATUS>BASE-RCP</STATUS>\n</BODY>',
    );

    await FURNACEINTLKCHECK('M-1', 'B-1', 'R-1', 'LOT-01,LOT-02');
    expectMessage('FURNACEINTLKCHECK', expect.stringContaining('<LOTLIST>LOT-01,LOT-02</LOTLIST>'));

    await MACHINEPORTSTATUS_KJ('MAIN-1', 'PORT-1', 'LOT-01', 'R-1');
    expectMessage('MACHINEPORTSTATUS_KJ', expect.stringContaining('<RECIPE>R-1</RECIPE>'));

    await MACHINEPORTCLEAR('MAIN-1', 'PORT-1');
    expectMessage(
      'MACHINEPORTCLEAR',
      '<BODY>\n  <MACHINENAME>MAIN-1</MACHINENAME>\n  <PORTNAME>PORT-1</PORTNAME>\n</BODY>',
    );
  });

  it('serializes the fixed equipment status transition used by KEC', async () => {
    await CHANGEEQPSTATUS({
      equipmentId: 'MAIN-1',
      facility: 'FAB1',
      operatorId: 'OP-1',
      operatorName: 'Operator',
    });

    expectMessage(
      'CHANGEEQPSTATUS',
      expect.stringContaining('<EQPSTATUSCODE>R  가동중</EQPSTATUSCODE>'),
    );
    expectMessage(
      'CHANGEEQPSTATUS',
      expect.stringContaining('<LOGINGUSERID1>Operator</LOGINGUSERID1>'),
    );
  });

  it('parses start success and reports backend errors and malformed bodies', async () => {
    const body = await FurnaceremoteStart_KEC(request);
    expect(body).toEqual({ ACK: 'Y' });
    expectMessage('FURNACEREMOTESTART_KEC', buildRemoteFurnaceKecStartBody(request));

    expect(() => parseRemoteFurnaceKecResponse('{"STATUS":"FAIL","ERRMSG":"rejected"}')).toThrow(
      'rejected',
    );
    expect(() => parseRemoteFurnaceKecResponse('{"STATUS":"PASS","MSGBODY":{}}')).toThrow(
      'BODY가 존재하지 않습니다',
    );
    expect(() => parseRemoteFurnaceKecResponse('not-json')).toThrow('not-json');
  });
});
