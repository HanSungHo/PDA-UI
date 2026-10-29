import { getESheetInfo } from 'src/features/esheet/services/esheet.service';
import { sendMessage } from 'src/services/message.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('src/services/message.service', () => ({
  sendMessage: vi.fn(),
}));

const request = {
  facility: 'GUMI',
  forwardCount: '20',
  historyCount: '20',
  lotId: 'WP00001',
};

describe('getESheetInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends the exact legacy ESHEETINFO message and payload through the shared gateway', async () => {
    const response = { statusCode: 200, result: '{"STATUS":"PASS","MSGBODY":{}}' };
    vi.mocked(sendMessage).mockResolvedValue(response);

    await expect(getESheetInfo(request)).resolves.toBe(response);

    expect(sendMessage).toHaveBeenCalledExactlyOnceWith('ESHEETINFO', {
      LOTID: 'WP00001',
      HISTORYCOUNT: '20',
      FORWARDCOUNT: '20',
      FACILITY: 'GUMI',
    });
  });

  it('propagates transport errors so the page can show its legacy error dialog', async () => {
    const error = new Error('Network down');
    vi.mocked(sendMessage).mockRejectedValue(error);

    await expect(getESheetInfo(request)).rejects.toBe(error);
  });
});
