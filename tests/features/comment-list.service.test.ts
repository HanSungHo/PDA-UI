import { fetchCommentList } from 'src/features/comment-list/services/comment-list.service';
import { describe, expect, it } from 'vitest';

describe('fetchCommentList', () => {
  it('returns mock items with the supplied eSheet context', async () => {
    const context = {
      lotId: 'WP00001',
      operation: 'P00002',
      subOperation: '00',
      processStep: 'Inspection',
      operSequence: '0002',
      facility: 'GUMI',
    };
    const result = await fetchCommentList(context);
    expect(result.context).toEqual(context);
    expect(result.items.length).toBeGreaterThan(0);
  });
});
