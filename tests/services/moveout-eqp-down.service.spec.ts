import * as moveOutApi from 'src/services/moveout-eqp-down.api';
import { moveOutEqpDownService } from 'src/services/moveout-eqp-down.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('moveOutEqpDownService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('delegates changeEqpStatus to sendChangeEqpStatusApi', async () => {
    const spy = vi.spyOn(moveOutApi, 'sendChangeEqpStatusApi').mockResolvedValueOnce({
      success: true,
      message: 'OK',
    });

    const params = {
      machine: 'PHOTO-01',
      chamberList: ['CH-1'],
      mainFlag: 'Y' as const,
    };

    const res = await moveOutEqpDownService.changeEqpStatus(params);

    expect(spy).toHaveBeenCalledWith(params);
    expect(res.success).toBe(true);
  });
});
