import { sendMessage } from 'src/services/message.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { checkPhotoSample } from '~/features/esheet/services/mask-location-dialog.service';

vi.mock('src/services/message.service', () => ({ sendMessage: vi.fn() }));

describe('checkPhotoSample', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends the legacy lot and location parameters and maps the response', async () => {
    vi.mocked(sendMessage).mockResolvedValueOnce({
      statusCode: 200,
      result: JSON.stringify({
        STATUS: 'PASS',
        MSGBODY: { RET: 'PASS', ALIGN: 'TREE-A', GRADE: 'A', ETCH_RW: 'ETCH', STOP: '' },
      }),
    });

    await expect(checkPhotoSample('LOT001', 'EQ001')).resolves.toEqual({
      align: 'TREE-A',
      etchRw: 'ETCH',
      grade: 'A',
      ret: 'PASS',
      stop: '',
    });
    expect(sendMessage).toHaveBeenCalledWith('CHECKPHOTOSAMPLE', {
      LOTID: 'LOT001',
      LOCATION: 'EQ001',
    });
  });

  it('throws the gateway error so the caller can preserve the legacy silent failure', async () => {
    vi.mocked(sendMessage).mockResolvedValueOnce({
      statusCode: 200,
      result: JSON.stringify({ STATUS: 'FAIL', ERRMSG: 'No sample result', MSGBODY: {} }),
    });

    await expect(checkPhotoSample('LOT001', 'EQ001')).rejects.toThrow('No sample result');
  });
});
