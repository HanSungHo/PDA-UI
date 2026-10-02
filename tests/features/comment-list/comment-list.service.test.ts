import { fetchCommentList } from 'src/features/comment-list/services/comment-list.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { post } = vi.hoisted(() => ({
  post: vi.fn(),
}));

vi.mock('src/services/api-client', () => ({
  default: {
    post,
  },
}));

describe('fetchCommentList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('posts COMMENTLIST and maps the returned COMMENTITEMS', async () => {
    post.mockResolvedValueOnce({
      data: {
        result: JSON.stringify({
          STATUS: 'PASS',
          MSGBODY: {
            COMMENTITEMS: [
              {
                NO: '0001',
                SUBOPERATION: '00',
                WORKCODE: 'W',
                TRACKTYPE: 'CURRENT',
                ISCHECK: 'N',
                WRITER: 'KIM',
                WRITETIME: '2026-10-01 08:00',
                READER: '',
                READTIME: '',
                DESCRIPTION: 'Check before move out.',
              },
            ],
          },
        }),
      },
    });
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
    expect(result.items).toEqual([
      {
        no: '0001',
        subOperation: '00',
        workCode: 'W',
        trackType: 'CURRENT',
        isCheck: false,
        writer: 'KIM',
        writeTime: '2026-10-01 08:00',
        reader: '',
        readTime: '',
        description: 'Check before move out.',
      },
    ]);
    expect(post).toHaveBeenCalledWith('/hifos/COMMENTLIST', {
      LOTID: 'WP00001',
      FACILITY: 'GUMI',
      OPERATION: 'P00002',
      SUBOPERATION: '00',
      OPERSEQUENCE: 'Inspection',
    });
  });

  it('maps an empty COMMENTLIST response without relying on seeded server data', async () => {
    post.mockResolvedValueOnce({
      data: {
        result: JSON.stringify({
          STATUS: 'PASS',
          MSGBODY: {},
        }),
      },
    });

    await expect(fetchCommentList()).resolves.toMatchObject({
      items: [],
    });
  });
});
