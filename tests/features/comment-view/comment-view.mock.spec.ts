import {
  type CommentViewMockScenario,
  commentViewMockScenarios,
  createMockCommentService,
} from 'src/features/comment-view/mocks/comment-view.mock';
import { describe, expect, it } from 'vitest';

describe('comment-view mock service', () => {
  it.each([
    ['current-writable', 'Y', 'W', 'N'],
    ['current-checked', 'Y', 'W', 'Y'],
    ['current-read-only', 'Y', 'N', 'N'],
    ['historical', 'N', 'W', 'N'],
    ['empty', 'N', '', ''],
  ] as const)(
    'returns the legacy response for %s',
    async (scenario, isCurrent, workCode, isCheck) => {
      const service = createMockCommentService(scenario);
      const response = await service.comment({
        LOTID: 'LOT-A260915-018',
        FACILITY: 'KFAB',
        OPERATION: 'PHOTO',
        SUBOPERATION: 'INSP',
        COMMENTNO: '0001',
        OPERSEQUENCE: '0042',
        OPERATORID: 'OPERATOR-01',
      });

      expect(response).toMatchObject({
        ISCURRENT: isCurrent,
        WORKCODE: workCode,
        ISCHECK: isCheck,
      });
      expect(response).toEqual(commentViewMockScenarios[scenario].response);
    },
  );

  it('rejects COMMENT failures', async () => {
    const service = createMockCommentService('comment-error');

    await expect(
      service.comment({
        LOTID: '',
        FACILITY: '',
        OPERATION: '',
        SUBOPERATION: '',
        COMMENTNO: '',
        OPERSEQUENCE: '',
        OPERATORID: '',
      }),
    ).rejects.toThrow('Unable to load comment in mock mode.');
  });

  it('rejects COMMENTSET failures', async () => {
    const service = createMockCommentService('comment-set-error');

    await expect(
      service.commentSet({
        LOTID: '',
        FACILITY: '',
        OPERATION: '',
        SUBOPERATION: '',
        COMMENTNO: '',
        OPERATORID: '',
        OPERNAME: '',
        OPERSEQUENCE: '',
        PASSWORD: '',
      }),
    ).rejects.toThrow('Unable to confirm comment in mock mode.');
  });

  it('falls back to the writable scenario for an unknown runtime scenario', async () => {
    const service = createMockCommentService('unknown' as CommentViewMockScenario);
    const response = await service.comment({
      LOTID: '',
      FACILITY: '',
      OPERATION: '',
      SUBOPERATION: '',
      COMMENTNO: '',
      OPERSEQUENCE: '',
      OPERATORID: '',
    });

    expect(response).toEqual(commentViewMockScenarios['current-writable'].response);
  });
});
