import { fail, pass } from '../utils/response.js';

export function createCommentHandlers(store) {
  return {
    COMMENTLIST: ({ payload }) => pass({ ITEMS: store.getComments(payload.LOTID) }),
    COMMENT: ({ payload }) => {
      const comment = store.getComment(payload.LOTID, payload.COMMENTNO || '1');
      if (!comment) return fail('COMMENT 정보를 찾을 수 없습니다.');
      return pass({
        DESCRIPTION: comment.description,
        PROCESSSTEP: comment.processStep,
        PW: comment.pw,
        ISCURRENT: comment.isCurrent,
        WORKCODE: comment.workCode,
        ISCHECK: comment.isCheck ? 'Y' : 'N',
      });
    },
    COMMENTSET: ({ payload }) => {
      store.markCommentRead(
        payload.LOTID,
        payload.COMMENTNO || '1',
        payload.OPERNAME || payload.OPERATORID,
      );
      return pass({});
    },
  };
}
