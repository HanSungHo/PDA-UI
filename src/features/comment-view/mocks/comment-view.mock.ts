import type { CommentService } from '../services/comment.service';
import type { CommentRequest, CommentResponse, CommentSetRequest } from '../types/comment.types';

export type CommentViewMockScenario =
  | 'current-writable'
  | 'current-checked'
  | 'current-read-only'
  | 'historical'
  | 'empty'
  | 'comment-error'
  | 'comment-set-error';

export interface CommentViewMockData {
  response: CommentResponse;
  commentSetError?: string;
}

export const commentViewMockScenarios: Record<CommentViewMockScenario, CommentViewMockData> = {
  'current-writable': {
    response: {
      DESCRIPTION: 'Check wafer edge before move-out. Hold if residue is visible on slot 18.',
      PROCESSSTEP: 'Final Inspection',
      PW: '1234',
      ISCURRENT: 'Y',
      WORKCODE: 'W',
      ISCHECK: 'N',
    },
  },
  'current-checked': {
    response: {
      DESCRIPTION: 'Comment has already been checked by the current process.',
      PROCESSSTEP: 'Final Inspection',
      PW: '',
      ISCURRENT: 'Y',
      WORKCODE: 'W',
      ISCHECK: 'Y',
    },
  },
  'current-read-only': {
    response: {
      DESCRIPTION: 'This comment belongs to the current process but is read-only.',
      PROCESSSTEP: 'Final Inspection',
      PW: '',
      ISCURRENT: 'Y',
      WORKCODE: 'N',
      ISCHECK: 'N',
    },
  },
  historical: {
    response: {
      DESCRIPTION: 'Previous step reported a minor particle trend. Confirm the SPC note.',
      PROCESSSTEP: 'Previous Inspection',
      PW: '',
      ISCURRENT: 'N',
      WORKCODE: 'W',
      ISCHECK: 'N',
    },
  },
  empty: {
    response: {
      DESCRIPTION: '',
      PROCESSSTEP: '',
      PW: '',
      ISCURRENT: 'N',
      WORKCODE: '',
      ISCHECK: '',
    },
  },
  'comment-error': {
    response: {
      DESCRIPTION: '',
      PROCESSSTEP: '',
      PW: '',
      ISCURRENT: 'N',
      WORKCODE: '',
      ISCHECK: '',
    },
  },
  'comment-set-error': {
    response: {
      DESCRIPTION: 'Comment is ready for confirmation.',
      PROCESSSTEP: 'Final Inspection',
      PW: '1234',
      ISCURRENT: 'Y',
      WORKCODE: 'W',
      ISCHECK: 'N',
    },
    commentSetError: 'Unable to confirm comment in mock mode.',
  },
};

export function createMockCommentService(
  scenario: CommentViewMockScenario = 'current-writable',
): CommentService {
  const data = commentViewMockScenarios[scenario] ?? commentViewMockScenarios['current-writable'];

  return {
    comment(_request: CommentRequest): Promise<CommentResponse> {
      if (scenario === 'comment-error') {
        return Promise.reject(new Error('Unable to load comment in mock mode.'));
      }

      return Promise.resolve(data.response);
    },
    commentSet(_request: CommentSetRequest): Promise<void> {
      if (data.commentSetError) {
        return Promise.reject(new Error(data.commentSetError));
      }

      return Promise.resolve();
    },
  };
}
