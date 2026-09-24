import { getESheetInfo } from 'src/features/esheet/services/esheet.service';
import { isResponseSuccessful } from 'src/services/message-response.helper';
import { describe, expect, it } from 'vitest';

const request = {
  facility: 'GUMI',
  forwardCount: '20',
  historyCount: '20',
  lotId: 'WP00001',
};

describe('getESheetInfo', () => {
  it('returns a successful legacy response envelope for a known LOT', async () => {
    const result = await getESheetInfo(request);

    expect(isResponseSuccessful(result)).toBe(true);
    const messageBody = JSON.parse(result.result).MSGBODY;
    expect(messageBody.PHOTOJOBCODE).toBe('20151115');
    expect(messageBody.ESHEETITEMS).toHaveLength(20);
    expect(
      messageBody.ESHEETITEMS.some((step: { ISCURRENT: string }) => step.ISCURRENT === 'Y'),
    ).toBe(true);
  });

  it('provides a large-data scenario for RevoGrid verification', async () => {
    const result = await getESheetInfo({ ...request, lotId: 'WP-LARGE' });

    expect(JSON.parse(result.result).MSGBODY.ESHEETITEMS).toHaveLength(10_000);
  });

  it.each([
    ['UNKNOWN', 'NOT_FOUND'],
    ['WP-EMPTY', 'EMPTY'],
    ['WP-ERROR', 'SERVER_ERROR'],
  ] as const)('returns %s as a controlled %s scenario', async (lotId, code) => {
    await expect(getESheetInfo({ ...request, lotId })).rejects.toMatchObject({
      code,
    });
  });
});
