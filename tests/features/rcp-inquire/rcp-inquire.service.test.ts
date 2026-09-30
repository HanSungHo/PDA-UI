import {
  checkinspection,
  metRecipeSearch,
} from 'src/features/rcp-inquire/services/rcp-inquire.service';
import apiClient from 'src/services/api-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('src/services/api-client', () => ({
  default: {
    post: vi.fn(),
  },
}));

const postMock = vi.mocked(apiClient.post);

function passResponse(body: Record<string, unknown>) {
  return {
    data: {
      statusCode: 200,
      result: JSON.stringify({
        STATUS: 'PASS',
        MSGBODY: body,
      }),
    },
  };
}

function failResponse(message: string) {
  return {
    data: {
      statusCode: 200,
      result: JSON.stringify({
        STATUS: 'FAIL',
        ERRMSG: message,
      }),
    },
  };
}

describe('rcp-inquire.service', () => {
  beforeEach(() => {
    postMock.mockReset();
  });

  it('sends METRECIPESEARCH and maps CDOVERAYVI recipe items', async () => {
    postMock.mockResolvedValueOnce(
      passResponse({
        PRODUCTSPECNAME: 'PRODUCT-A',
        PROCESSOPERATIONNAME: '100-200',
        OPERATIONDESCRIPTION: 'DESC-A',
        CATEGORY: 'CDOVERAYVI',
        RCPOVITEMS: [{ OVRCP: 'OV-RCP-A01', OVMACHINE: 'OVL-E' }],
        RCPVIITEMS: [{ MACHINERECIPENAME: 'VI-RCP-B01', MACHINENAME: 'VI-EQ' }],
        RCPCDITEMS: [{ CDRCP: 'CD-RCP-C01', CDMACHINE: 'CD-EQ' }],
        MASKITEMS: [{ RETICLENAME: 'MASK-D01', MACHINENAME: 'EXP-E' }],
      }),
    );

    const result = await metRecipeSearch('LOT-A', 'FAC-A');

    expect(postMock).toHaveBeenCalledWith('/message/send', {
      messageName: 'METRECIPESEARCH',
      payload: {
        LOTID: 'LOT-A',
        FACILITY: 'FAC-A',
      },
    });
    expect(result).toEqual({
      ok: true,
      data: {
        productSpecName: 'PRODUCT-A',
        processOperationName: '100-200',
        operationDescription: 'DESC-A',
        category: 'CDOVERAYVI',
        rcpCdItems: [{ CDRCP: 'CD-RCP-C01', CDMACHINE: 'CD-EQ' }],
        rcpOvItems: [{ OVRCP: 'OV-RCP-A01', OVMACHINE: 'OVL-E' }],
        rcpViItems: [{ MACHINERECIPENAME: 'VI-RCP-B01', MACHINENAME: 'VI-EQ' }],
        maskItems: [{ RETICLENAME: 'MASK-D01', MACHINENAME: 'EXP-E' }],
        rcpItems: [],
      },
    });
  });

  it('sends CHECKINSPACTION and preserves legacy response key casing', async () => {
    postMock.mockResolvedValueOnce(
      passResponse({
        MACROMSG: 'MACRO-A',
        SCOPEMSG: 'SCOPE-A',
        CDMSG: 'CD-A',
        sOvMSG: 'OV-A',
        sSampleViMSG: 'VI-SAMPLE-A',
        sSampleCdMSG: 'CD-SAMPLE-A',
        sSampleOvMSG: 'OV-SAMPLE-A',
      }),
    );

    const result = await checkinspection({
      lotId: 'LOT-A',
      facility: 'FAC-A',
      type: 'RCP',
      mOper: '100',
      sOper: '200',
    });

    expect(postMock).toHaveBeenCalledWith('/message/send', {
      messageName: 'CHECKINSPACTION',
      payload: {
        LOTID: 'LOT-A',
        FACILITY: 'FAC-A',
        TYPE: 'RCP',
        AFOPERM: '100',
        AFOPERS: '200',
      },
    });
    expect(result).toEqual({
      ok: true,
      data: {
        macroMsg: 'MACRO-A',
        scopeMsg: 'SCOPE-A',
        cdMsg: 'CD-A',
        ovMsg: 'OV-A',
        sampleViMsg: 'VI-SAMPLE-A',
        sampleCdMsg: 'CD-SAMPLE-A',
        sampleOvMsg: 'OV-SAMPLE-A',
      },
    });
  });

  it('returns shared error message when the message response fails', async () => {
    postMock.mockResolvedValueOnce(failResponse('SEARCH FAILED'));

    const result = await metRecipeSearch('LOT-A', 'FAC-A');

    expect(result).toEqual({ ok: false, message: 'SEARCH FAILED' });
  });
});
