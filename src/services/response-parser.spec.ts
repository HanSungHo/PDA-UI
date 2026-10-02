import { describe, expect, it } from 'vitest';

import { getErrorMessage, parseResponseData } from './response-parser';

describe('response-parser', () => {
  it('parses a successful response and extracts RECIPE and QTY', () => {
    const api = {
      isSuccessFul: true,
      result: '<AIFMSG><MSGBODY><RECIPE>RCP1</RECIPE><QTY>42</QTY></MSGBODY></AIFMSG>',
    } as const;

    const parsed = parseResponseData(api);

    expect(parsed.isSuccess).toBe(true);
    expect(parsed.messageBody.RECIPE).toBe('RCP1');
    expect(parsed.messageBody.QTY).toBe('42');
  });

  it('extracts error message from failed response', () => {
    const api = {
      isSuccessFul: false,
      result:
        '<AIFMSG><MSGBODY><ERRORMESSAGE>Something went wrong</ERRORMESSAGE></MSGBODY></AIFMSG>',
    } as const;

    const err = getErrorMessage(api);
    expect(err).toBe('Something went wrong');
  });
});
