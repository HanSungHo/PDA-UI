import { beforeEach, describe, expect, it, vi } from 'vitest';

const { postJsonMessage } = vi.hoisted(() => ({ postJsonMessage: vi.fn() }));

vi.mock('src/services/json-message.service', () => ({
  body: (response: { MSGBODY?: Record<string, unknown> }) => response.MSGBODY ?? {},
  list: (value: Record<string, unknown>, key: string) =>
    Array.isArray(value[key]) ? value[key] : [],
  postJsonMessage,
  text: (value: Record<string, unknown>, key: string) => String(value[key] ?? ''),
}));

import {
  getDispatch,
  setDispatch,
} from '../../../src/features/dispatching/services/dispatching.service';

describe('dispatching.service', () => {
  beforeEach(() => vi.resetAllMocks());

  it('sends legacy GETDISPATCH keys and combines reserve and dispatch rows', async () => {
    postJsonMessage.mockResolvedValue({
      STATUS: 'PASS',
      MSGBODY: {
        RESERVELOT: [{ LOTNAME: 'R1', PODESC: 'PD', PROCESSOPERATIONNAME: 'PO' }],
        DISPLOT: [{ LOTNAME: 'D1', BOXSTATUS: 'INBAY', BAYNAME: 'BAY' }],
        HIDE: Array.from({ length: 9 }, (_, index) => ({ HIDEFLAG: index === 8 ? 'Y' : 'N' })),
      },
    });
    const result = await getDispatch({ reserve: 'T', machineName: 'EQP1', wet: '3' });
    expect(postJsonMessage).toHaveBeenCalledWith('GETDISPATCH', {
      RESERVE: 'T',
      RTD: 'EQP1',
      WET: '3',
    });
    expect(result.rows).toMatchObject([
      { LOTNAME: 'R1', OPREATIONDESC: 'PD', OPREATIONNAME: 'PO' },
      { LOTNAME: 'D1', TRANSPORTLOCATION: 'BAY' },
    ]);
    expect(result.hiddenColumns).toEqual(['DOPANT']);
  });

  it('sends legacy SETDISPATCH payload and preserves legacy misspelled XML tags', async () => {
    postJsonMessage.mockResolvedValue({ STATUS: 'PASS' });
    await setDispatch({
      machineName: 'EQP1',
      operatorId: 'OP1',
      operatorName: 'Kim',
      reserve: 'Y',
      items: [
        {
          NUMBER: '',
          RESERVE: 'N',
          LOTNAME: 'LOT1',
          OPREATIONNAME: 'OP',
          OPREATIONDESC: 'DESC',
          PRODUCTSPECNAME: 'PROD',
          MAINTITEM: '',
          REWORKSTATUS: '',
        },
      ],
    });
    expect(postJsonMessage).toHaveBeenCalledWith(
      'SETDISPATCH',
      expect.objectContaining({
        MACHINE: 'EQP1',
        USERID: 'OP1',
        USERID1: 'Kim',
        RESERVE: 'Y',
        RESERVEITEM:
          '\n<ITEM>\n<LOTNAME>LOT1</LOTNAME>\n<PROECSSOPER>OP</PROECSSOPER>\n<PROECSSOPERDESC>DESC</PROECSSOPERDESC>\n<PRODUCT>PROD</PRODUCT>\n</ITEM>',
      }),
    );
  });

  it('maps the non-INBAY dispatch branch and cancellation payload', async () => {
    postJsonMessage
      .mockResolvedValueOnce({
        STATUS: 'PASS',
        MSGBODY: {
          RESERVELOT: [],
          DISPLOT: [
            {
              LOTNAME: 'D2',
              OPREATIONNAME: '3000',
              OPREATIONDESC: 'DIFF',
              BOXSTATUS: 'OUTBAY',
              TRANSPORT: 'OHT-02',
              REWORKSTATUS: 'Normal',
            },
          ],
          HIDE: [],
        },
      })
      .mockResolvedValueOnce({ STATUS: 'PASS' });

    const result = await getDispatch({ reserve: 'F', machineName: 'EQP1', wet: '' });
    expect(result.rows[0]).toMatchObject({
      TRANSPORTLOCATION: 'OHT-02',
      REWORKSTATUS: 'N',
    });

    await setDispatch({
      machineName: 'EQP1',
      operatorId: 'OP1',
      operatorName: 'Kim',
      reserve: 'N',
      items: [result.rows[0]],
    });
    expect(postJsonMessage).toHaveBeenLastCalledWith(
      'SETDISPATCH',
      expect.objectContaining({
        RESERVE: 'N',
        RESERVEITEM: '\n<ITEM>\n<LOTNAME>D2</LOTNAME>\n<PROECSSOPER>3000</PROECSSOPER>\n</ITEM>',
      }),
    );
  });

  it('applies Android per-list overwrites and ERRMSG verbatim', async () => {
    postJsonMessage.mockResolvedValueOnce({
      STATUS: 'PASS',
      MSGBODY: {
        RESERVELOT: [
          {
            LOTNAME: 'R1',
            OPREATIONNAME: 'keep?',
            PODESC: '',
            PROCESSOPERATIONNAME: '',
            TRANSPORTLOCATION: 'AS-IS',
            BOXSTATUS: 'INBAY',
            BAYNAME: 'IGNORED',
          },
        ],
        DISPLOT: [{ LOTNAME: 'D1', OPREATIONNAME: '3000', TRANSPORT: 'T', TRANSPORTLOCATION: 'X' }],
      },
    });
    const result = await getDispatch({ reserve: 'F', machineName: 'E', wet: '' });
    expect(result.rows[0]).toMatchObject({
      OPREATIONNAME: '',
      OPREATIONDESC: '',
      TRANSPORTLOCATION: 'AS-IS',
    });
    expect(result.rows[1]).toMatchObject({ OPREATIONNAME: '3000', TRANSPORTLOCATION: 'T' });

    postJsonMessage.mockResolvedValueOnce({ STATUS: 'FAIL' });
    await expect(getDispatch({ reserve: 'F', machineName: 'E', wet: '' })).rejects.toMatchObject({
      message: '',
    });
    postJsonMessage.mockResolvedValueOnce({ STATUS: 'FAIL', ERRMSG: 'BAD' });
    await expect(
      setDispatch({ machineName: 'E', operatorId: '', operatorName: '', reserve: 'N', items: [] }),
    ).rejects.toMatchObject({ message: 'BAD' });
  });

  it('maps InRework to Y and ignores HIDE indexes beyond the column list', async () => {
    postJsonMessage.mockResolvedValueOnce({
      STATUS: 'PASS',
      MSGBODY: {
        DISPLOT: [{ LOTNAME: 'D1', REWORKSTATUS: 'InRework' }],
        HIDE: Array.from({ length: 50 }, (_, index) => ({
          HIDEFLAG: index === 8 || index === 45 ? 'Y' : 'N',
        })),
      },
    });
    const result = await getDispatch({ reserve: 'F', machineName: 'E', wet: '' });
    expect(result.rows[0]?.REWORKSTATUS).toBe('Y');
    expect(result.hiddenColumns).toEqual(['DOPANT']);
  });
});
