import { defaultCommentListContext, mockCommentItems } from '../mocks/comment-list.mock';
import type { CommentListContext, CommentListItem } from '../types/comment-list.types';

export interface CommentListResponse {
  context: CommentListContext;
  items: CommentListItem[];
}

export async function fetchCommentList(): Promise<CommentListResponse> {
  await new Promise((resolve) => window.setTimeout(resolve, 220));

  return {
    context: defaultCommentListContext,
    items: mockCommentItems,
  };
}
