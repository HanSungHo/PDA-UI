import type { CommentService } from '../services/comment.service';
import type { OperatorContext } from '../types/comment.types';

export interface UseCommentViewParams {
  service: CommentService;
  operatorContext: OperatorContext;
  lotId: string;
  operation: string;
  subOperation: string;
  commentNo: string;
}

export function useCommentView(_params: UseCommentViewParams) {
  // Placeholder composable to keep feature boundary explicit.
  // The page currently implements behavior directly; this composable
  // can be extended to share logic across components.
  return {} as const;
}
