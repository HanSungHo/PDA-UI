import {
  fetchESheetFutureActions,
  fetchESheetMaskInfo,
  fetchESheetPcmReworkRecipe,
  fetchESheetWaferList,
} from 'src/features/esheet/services/esheet-actions.service';
import { sendMessage } from 'src/services/message.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('src/services/message.service', () => ({ sendMessage: vi.fn() }));

describe('eSheet actions service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps PCM results while preserving the legacy sequential fields', async () => {
    vi.mocked(sendMessage).mockResolvedValueOnce({
      statusCode: 200,
      result: JSON.stringify({
        STATUS: 'PASS',
        MSGBODY: { PCMREQPLIST: 'EQP-A', RECIPELIST: 'RCP-A', PCMRESULT: 'OK' },
      }),
    });

    await expect(fetchESheetPcmReworkRecipe('LOT001')).resolves.toEqual({
      ok: true,
      data: { PCMREQPLIST: 'EQP-A', RECIPELIST: 'RCP-A', PCMRESULT: 'OK' },
    });
    expect(sendMessage).toHaveBeenCalledWith('PCMREWORKRECIPE', { LOTID: 'LOT001' });
  });

  it('uses LOTNAME with the selected operation when requesting future actions', async () => {
    vi.mocked(sendMessage).mockResolvedValueOnce({
      statusCode: 200,
      result: JSON.stringify({ STATUS: 'PASS', MSGBODY: { FUTURELIST: 'FUTURE HOLD' } }),
    });

    await expect(fetchESheetFutureActions('LOT001', 'P00001', '00')).resolves.toEqual({
      ok: true,
      data: 'FUTURE HOLD',
    });
    expect(sendMessage).toHaveBeenCalledWith('CHECKFUTURE', {
      LOTNAME: 'LOT001',
      OPERATION: 'P00001',
      SUBOPERATION: '00',
    });
  });

  it('normalizes a mask item object and preserves its legacy fields', async () => {
    vi.mocked(sendMessage).mockResolvedValueOnce({
      statusCode: 200,
      result: JSON.stringify({
        STATUS: 'PASS',
        MSGBODY: {
          ITEMS: {
            ITEM: {
              RETICLETAG: 'MASK-A',
              PRODUCT: 'PRODUCT-A',
              GIBEN: 'B01',
              STATUS: 'READY',
              ISUSE: 'Y',
              CURRLOC: 'PHOTO',
              SUBLOCATION3: 'EQP-01',
              AFTERINSP: '10:00',
            },
          },
        },
      }),
    });

    await expect(fetchESheetMaskInfo('MASK-A', 'GUMI')).resolves.toMatchObject({
      ok: true,
      data: [expect.objectContaining({ RETICLETAG: 'MASK-A', AFTERINSP: '10:00' })],
    });
    expect(sendMessage).toHaveBeenCalledWith('MASKINFO', {
      ID_IDENT: 'T',
      RETICLEID: 'MASK-A',
      FACILITY: 'GUMI',
    });
  });

  it('returns the wafer list for the read-only wafer screen', async () => {
    vi.mocked(sendMessage).mockResolvedValueOnce({
      statusCode: 200,
      result: JSON.stringify({ STATUS: 'PASS', MSGBODY: { WAFERLIST: 'LOT001.01,LOT001.02' } }),
    });

    await expect(fetchESheetWaferList('LOT001')).resolves.toEqual({
      ok: true,
      data: 'LOT001.01,LOT001.02',
    });
    expect(sendMessage).toHaveBeenCalledWith('GETWAFER', { LOTID: 'LOT001' });
  });
});
