import { sampleReleaseService } from 'src/features/sample-release/services/sample-release.service';
import type { SampleReleaseExecutionPayload } from 'src/features/sample-release/types/sample-release.types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPost } = vi.hoisted(() => ({ mockPost: vi.fn() }));

vi.mock('src/services/api-client', () => ({
  default: { post: mockPost },
}));

function messageResponse(message: Record<string, unknown>) {
  return {
    data: {
      statusCode: 200,
      result: JSON.stringify(message),
    },
  };
}

const executionPayload: SampleReleaseExecutionPayload = {
  facility: 'FAB1',
  sampleLot: 'SLOT-001',
  machine: 'MC-01',
  sampleQty: '5',
  route: 'ROUTE-01',
  operation: '1000',
  userId: 'OP-01',
  comment: 'release comment',
  mainLotName: 'MLOT-001',
  mainQty: '20',
};

describe('sample-release service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requests lookup through the JSON message endpoint and maps items', async () => {
    const item = { SLOTNAME: 'LOT-001', MPROCESSSTATE: 'WAIT' };
    mockPost.mockResolvedValueOnce(messageResponse({ STATUS: 'PASS', MSGBODY: { ITEMS: [item] } }));

    const response = await sampleReleaseService.getSampleReleaseInfo('LOT-001');

    expect(mockPost).toHaveBeenCalledWith('/message/send', {
      messageName: 'SAMPLERELEASEINFO',
      payload: { TYPE: 'S', LOTID: 'LOT-001' },
    });
    expect(response).toEqual({ isSuccessFul: true, result: { ITEMS: [item] } });
  });

  it('maps lookup failures from the message envelope', async () => {
    mockPost.mockResolvedValueOnce(messageResponse({ STATUS: 'FAIL', ERRMSG: 'lookup failed' }));

    const response = await sampleReleaseService.getSampleReleaseInfo('LOT-ERROR');

    expect(response).toEqual({
      isSuccessFul: false,
      result: { ITEMS: [] },
      errorMessage: 'lookup failed',
    });
  });

  it('maps execution fields to the JSON message contract', async () => {
    mockPost.mockResolvedValueOnce(
      messageResponse({ STATUS: 'PASS', MSGBODY: { SUCESSMSG: 'completed' } }),
    );

    const response = await sampleReleaseService.executeSampleRelease(executionPayload);

    expect(mockPost).toHaveBeenCalledWith('/message/send', {
      messageName: 'SAMPLERELEASEEXECUTION',
      payload: {
        FACILITY: 'FAB1',
        SAMPLELOTNAME: 'SLOT-001',
        SAMPLEMACHINE: 'MC-01',
        SAMPLEQTY: '5',
        ROUTE: 'ROUTE-01',
        OPERATION: '1000',
        USERID: 'OP-01',
        COMMENT: 'release comment',
        MAINLOTNAME: 'MLOT-001',
        MAINQTY: '20',
      },
    });
    expect(response).toEqual({ isSuccessFul: true, result: { SUCESSMSG: 'completed' } });
  });

  it('maps execution failures from the message envelope', async () => {
    mockPost.mockResolvedValueOnce(messageResponse({ STATUS: 'FAIL', ERRMSG: 'execution failed' }));

    const response = await sampleReleaseService.executeSampleRelease({
      ...executionPayload,
      sampleLot: 'SLOT-FAIL',
    });

    expect(response).toEqual({
      isSuccessFul: false,
      result: {},
      errorMessage: 'execution failed',
    });
  });
});
