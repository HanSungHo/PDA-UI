import { describe, expect, it } from 'vitest';

import * as mf from './message-factory';

describe('message-factory', () => {
  it('produces a LOTINFO envelope with expected tags', () => {
    const s = mf.lotInfo('LOT123', 'FAC1', 'MVIN', 'OP1');

    expect(s).toContain('<AIFMSG>');
    expect(s).toContain('<MSGNAME>LOTINFO</MSGNAME>');
    expect(s).toContain('<LOTID>LOT123</LOTID>');
    expect(s).toContain('<FACILITY>FAC1</FACILITY>');
    expect(s).toContain('<OPERATORID>OP1</OPERATORID>');
    expect(s).toContain('</AIFMSG>');
  });
});
