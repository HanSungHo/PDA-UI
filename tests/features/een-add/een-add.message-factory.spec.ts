import { beforeEach, describe, expect, it, vi } from 'vitest';

const { store } = vi.hoisted(() => ({
  store: { mobileServerName: 'MOBILE', deviceName: 'DEVICE' },
}));

vi.mock('src/features/main/stores/main.store', () => ({
  useMainStore: () => store,
}));

import * as factory from 'src/features/een-add/services/een-add.message-factory';

describe('EEN Add message factory', () => {
  beforeEach(() => {
    store.mobileServerName = 'MOBILE';
    store.deviceName = 'DEVICE';
  });

  it.each([
    [
      'GETPROCESSFLOW',
      factory.getProcessFlow('FAB', 'PRODUCT', '10001-010'),
      [
        '<FACTORYNAME>FAB</FACTORYNAME>',
        '<PRODUCT>PRODUCT</PRODUCT>',
        '<PROCESSOPER>10001-010</PROCESSOPER>',
      ],
    ],
    [
      'GETPROCESSOPERATION',
      factory.getProcessOperation('FAB', 'PRODUCT', 'FLOW-A'),
      [
        '<FACTORYNAME>FAB</FACTORYNAME>',
        '<PRODUCT>PRODUCT</PRODUCT>',
        '<PROCESSFLOW>FLOW-A</PROCESSFLOW>',
      ],
    ],
    ['GETTAGID', factory.getTagId('FAB'), ['<FACTORYNAME>FAB</FACTORYNAME>']],
    ['GETTAGPOSITION', factory.getTagPosition('LOT-1'), ['<LOTNAME>LOT-1</LOTNAME>']],
    [
      'INSERTEEN',
      factory.insertEen(
        'LOT-1',
        'OP-1',
        'FAB',
        'PRODUCT',
        '10001',
        'MOVEIN',
        'FLOW-A',
        'memo',
        'TAG-1',
      ),
      [
        '<LOTNAME>LOT-1</LOTNAME>',
        '<USERID>OP-1</USERID>',
        '<FACILITY>FAB</FACILITY>',
        '<PRODUCT>PRODUCT</PRODUCT>',
        '<OPERATION>10001</OPERATION>',
        '<ACTIONPOINT>MOVEIN</ACTIONPOINT>',
        '<PROCESSFLOW>FLOW-A</PROCESSFLOW>',
        '<TAGCOMMENT>memo</TAGCOMMENT>',
        '<TAGID>TAG-1</TAGID>',
      ],
    ],
  ])('builds the legacy %s envelope', (messageName, message, bodyFields) => {
    expect(message).toContain(`<MSGNAME>${messageName}</MSGNAME>`);
    expect(message).toContain('<RECEIVER>MOBILE</RECEIVER>');
    expect(message).toContain('<SENDER>DEVICE</SENDER>');
    expect(message).toContain('<MSGTYPE>P</MSGTYPE>');
    expect(message).toContain('<WITHREPLY>YES</WITHREPLY>');
    expect(message).toContain('<MSGBODY>');
    for (const field of bodyFields) expect(message).toContain(field);
    expect(message).toContain('</AIFMSG>');
  });
});
