import apiClient from 'src/services/api-client';
import { sendMessage } from 'src/services/message.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('src/services/api-client', () => ({
  default: {
    post: vi.fn(),
  },
}));

const postMock = vi.mocked(apiClient.post);

describe('message.service', () => {
  beforeEach(() => {
    postMock.mockReset();
  });

  it('posts message payload to the shared message endpoint', async () => {
    const response = {
      statusCode: 200,
      result: '{"STATUS":"PASS","MSGBODY":{}}',
    };
    postMock.mockResolvedValueOnce({ data: response });

    const result = await sendMessage('METRECIPESEARCH', {
      LOTID: 'LOT-A',
      FACILITY: 'FAC-A',
    });

    expect(postMock).toHaveBeenCalledWith('/message/send', {
      messageName: 'METRECIPESEARCH',
      payload: {
        LOTID: 'LOT-A',
        FACILITY: 'FAC-A',
      },
    });
    expect(result).toBe(response);
  });
});
