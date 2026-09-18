import { fetchCommentList } from 'src/features/comment-list/services/comment-list.service';
import { describe, expect, it } from 'vitest';

describe('fetchCommentList', () => {
  it('returns comment list context and items in the expected shape', async () => {
    const response = await fetchCommentList();

    expect(response.context).toMatchObject({
      lotId: 'LOT-A260915-018',
      operation: 'PHOTO',
      subOperation: 'INSP',
      processStep: 'Final Inspection',
      operSequence: '0042',
      facility: 'KFAB',
    });

    expect(response.items).toHaveLength(3);
    expect(response.items[0]).toMatchObject({
      no: '0001',
      subOperation: 'INSP',
      workCode: 'W',
      trackType: 'CURRENT',
      isCheck: false,
      writer: 'KIM HS',
      writeTime: '2026-09-15 08:12',
      reader: '',
      readTime: '',
    });
  });
});
