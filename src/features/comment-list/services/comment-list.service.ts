import {
  assertPass,
  body,
  firstList,
  postJsonMessage,
  text,
} from 'src/features/move-out/services/message.service';

import { defaultCommentListContext } from '../mocks/comment-list.mock';
import type { CommentListContext, CommentListItem } from '../types/comment-list.types';

export interface CommentListResponse {
  context: CommentListContext;
  items: CommentListItem[];
}

export async function fetchCommentList(
  context: CommentListContext = defaultCommentListContext,
): Promise<CommentListResponse> {
  const parsed = await postJsonMessage('COMMENTLIST', {
    LOTID: context.lotId,
    FACILITY: context.facility,
    OPERATION: context.operation,
    SUBOPERATION: context.subOperation,
    OPERSEQUENCE: context.processStep,
  });
  assertPass(parsed, 'COMMENTLIST_FAILED');

  const responseBody = body(parsed);
  const items = firstList(responseBody, ['COMMENTITEMS', 'ITEMS']).map(
    (item): CommentListItem => ({
      no: text(item, 'NO'),
      subOperation: text(item, 'SUBOPERATION'),
      workCode: text(item, 'WORKCODE'),
      trackType: text(item, 'TRACKTYPE'),
      isCheck: text(item, 'ISCHECK') === 'Y',
      writer: text(item, 'WRITER'),
      writeTime: text(item, 'WRITETIME'),
      reader: text(item, 'READER'),
      readTime: text(item, 'READTIME'),
      description: text(item, 'DESCRIPTION'),
    }),
  );

  return {
    context: { ...context },
    items,
  };
}
