import { describe, it, expect } from 'vitest';
import { CommentServiceNotImplemented } from 'src/features/comment-view/services/comment.service';
import { useCommentView } from 'src/features/comment-view/composables/useCommentView';

describe('comment-view coverage helpers', () => {
  it('service not implemented rejects', async () => {
    const svc = new CommentServiceNotImplemented();
    await expect(svc.comment()).rejects.toThrow();
    await expect(svc.commentSet()).rejects.toThrow();
  });

  it('composable can be imported', () => {
    const out = useCommentView({} as any);
    expect(out).toBeDefined();
  });
});
