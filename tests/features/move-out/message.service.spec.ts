import apiClient from 'src/services/api-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { body, postJsonMessage, text } from '~/features/move-out/services/message.service';

vi.mock('src/services/api-client', () => ({
  default: {
    post: vi.fn(),
  },
}));

const postMock = vi.mocked(apiClient.post);

describe('move-out message.service', () => {
  beforeEach(() => {
    postMock.mockReset();
  });

  it('posts messages to the legacy endpoint path without exposing transport naming', async () => {
    postMock.mockResolvedValueOnce({
      data: {
        result: JSON.stringify({
          STATUS: 'PASS',
          MSGBODY: { LOTID: 'LOT-DEMO-01', COMMENTQTY: 1 },
        }),
      },
    });

    const parsed = await postJsonMessage('LOTINFO', { LOTID: 'LOT-DEMO-01' });

    expect(postMock).toHaveBeenCalledWith('/hifos/LOTINFO', { LOTID: 'LOT-DEMO-01' });
    expect(text(body(parsed), 'COMMENTQTY')).toBe('1');
  });
});
