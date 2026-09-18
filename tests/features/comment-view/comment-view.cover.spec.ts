import { useCommentView } from 'src/features/comment-view/composables/useCommentView';
import { CommentServiceNotImplemented } from 'src/features/comment-view/services/comment.service';
import { describe, expect, it } from 'vitest';

describe('comment-view coverage helpers', () => {
  it('service not implemented rejects', async () => {
    const svc = new CommentServiceNotImplemented();
    await expect(svc.comment()).rejects.toThrow();
    await expect(svc.commentSet()).rejects.toThrow();
  });

  it('composable can be imported', () => {
    const out = useCommentView({});
    expect(out).toBeDefined();
  });
});
