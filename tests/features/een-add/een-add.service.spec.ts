import { beforeEach, describe, expect, it, vi } from 'vitest';

const { post } = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock('src/services/api-client', () => ({ default: { post } }));

import * as service from 'src/features/een-add/services/een-add.service';

vi.mock('src/features/main/stores/main.store', () => ({
  useMainStore: () => ({ mobileServerName: 'SERVER', deviceName: 'DEVICE' }),
}));

const passResponse = (messageBody: Record<string, unknown> = {}) => ({
  data: {
    statusCode: 200,
    result: JSON.stringify({ STATUS: 'PASS', MSGBODY: messageBody }),
  },
});

describe('EEN Add HTTP service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    service.resetEenAddService();
    post.mockResolvedValue(passResponse({ OK: 'Y' }));
  });

  it.each([
    [
      'getProcessFlow',
      () => service.getProcessFlow('FAB', 'P', 'OP'),
      '/hifos/message',
      'GETPROCESSFLOW',
    ],
    [
      'getProcessOperation',
      () => service.getProcessOperation('FAB', 'P', 'FLOW'),
      '/hifos/message',
      'GETPROCESSOPERATION',
    ],
    ['getTagId', () => service.getTagId('FAB'), '/hifos/gettagid', 'GETTAGID'],
    [
      'getTagPosition',
      () => service.getTagPosition('LOT'),
      '/hifos/gettagposition',
      'GETTAGPOSITION',
    ],
    [
      'insertEen',
      () => service.insertEen('LOT', 'OP', 'FAB', 'P', 'STEP', 'MOVEIN', 'FLOW', 'memo', 'TAG'),
      '/hifos/inserteen',
      'INSERTEEN',
    ],
  ])(
    'sends %s using its legacy endpoint and message',
    async (_name, call, endpoint, messageName) => {
      await expect(call()).resolves.toEqual({
        isSuccess: true,
        messageBody: { OK: 'Y' },
        errorMessage: '',
      });
      expect(post).toHaveBeenCalledWith(endpoint, {
        sMsg: expect.stringContaining(`<MSGNAME>${messageName}</MSGNAME>`),
      });
    },
  );

  it('parses unsuccessful responses and their error message', async () => {
    post.mockResolvedValueOnce({
      data: {
        statusCode: 200,
        result: JSON.stringify({ STATUS: 'FAIL', ERRMSG: 'Rejected', MSGBODY: '' }),
      },
    });

    await expect(service.getTagId('FAB')).resolves.toEqual({
      isSuccess: false,
      messageBody: {},
      errorMessage: 'Rejected',
    });
  });

  it('parses non-200 responses as failures', async () => {
    post.mockResolvedValueOnce({
      data: { statusCode: 500, result: JSON.stringify({ STATUS: 'PASS', MSGBODY: { OK: 'Y' } }) },
    });

    const response = await service.getTagId('FAB');
    expect(response.isSuccess).toBe(false);
    expect(response.messageBody).toEqual({});
  });

  it('allows swapping and resetting the service implementation', async () => {
    const fakeService = {
      getProcessFlow: vi
        .fn()
        .mockResolvedValue({ isSuccess: true, messageBody: {}, errorMessage: '' }),
      getProcessOperation: vi.fn(),
      getTagId: vi.fn(),
      getTagPosition: vi.fn(),
      insertEen: vi.fn(),
    };

    service.setEenAddService(fakeService);
    await service.getProcessFlow('F', 'P', 'O');
    expect(fakeService.getProcessFlow).toHaveBeenCalledWith('F', 'P', 'O');

    service.resetEenAddService();
    await service.getTagId('FAB');
    expect(post).toHaveBeenCalledWith('/hifos/gettagid', expect.any(Object));
  });
});
