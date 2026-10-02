import { beforeEach, describe, expect, it, vi } from 'vitest';

const { post } = vi.hoisted(() => ({
  post: vi.fn(),
}));

vi.mock('src/services/api-client', () => ({
  default: {
    post,
  },
}));

import { sendChangeEqpStatusApi } from 'src/features/move-out/services/moveout-eqp-down.api';

describe('moveout-eqp-down.api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends CHANGEEQPSTATUS with valid payload and receives SUCCESS response', async () => {
    post.mockResolvedValueOnce({
      data: `<BODY>
<RESULT>SUCCESS</RESULT>
<MESSAGE>Equipment status changed successfully.</MESSAGE>
</BODY>`,
    });

    const result = await sendChangeEqpStatusApi({
      machine: 'PHOTO-01',
      facility: 'FAB1',
      chamberList: ['CH-1'],
      mainFlag: 'Y',
      operatorId: 'OP10023',
      operatorName: 'KIM OPERATOR',
    });

    expect(result.success).toBe(true);
    expect(result.message).toBe('Equipment status changed successfully.');
    expect(result.errorDesc).toBeUndefined();
  });

  it('handles server failure response when result is ERROR', async () => {
    post.mockResolvedValueOnce({
      data: `<BODY>
<RESULT>ERROR</RESULT>
<ERRORDESC>Equipment is currently in an invalid state for LOAD DOWN transition.</ERRORDESC>
</BODY>`,
    });

    const result = await sendChangeEqpStatusApi({
      machine: 'PHOTO-01',
      facility: 'FAB1',
      chamberList: ['CH-1'],
      mainFlag: 'Y',
    });

    expect(result.success).toBe(false);
    expect(result.errorDesc).toContain('Equipment is currently in an invalid state');
  });
});
