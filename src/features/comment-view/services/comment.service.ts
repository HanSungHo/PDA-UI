import type { CommentRequest, CommentResponse, CommentSetRequest } from '../types/comment.types';

export interface CommentService {
  comment(request: CommentRequest): Promise<CommentResponse>;
  commentSet(request: CommentSetRequest): Promise<void>;
}

/**
 * Production adapter placeholder.
 * Intentionally not implemented: the real backend adapter must be provided
 * by the application (dependency injection). This makes missing runtime
 * wiring fail fast and explicitly.
 */
export class CommentServiceNotImplemented implements CommentService {
  comment(): Promise<CommentResponse> {
    return Promise.reject(new Error('CommentService not implemented: production adapter missing'));
  }

  commentSet(): Promise<void> {
    return Promise.reject(new Error('CommentService not implemented: production adapter missing'));
  }
}

export default CommentService;
