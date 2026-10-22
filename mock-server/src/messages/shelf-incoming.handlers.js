import { fail, pass } from '../utils/response.js';

export function createShelfIncomingHandlers(store) {
  return {
    SHELFCALL: ({ payload }) => {
      const shelf = store.getShelfIncoming(payload.SHELFNO);
      return shelf ? pass({ CATEGORY: shelf.CATEGORY }) : fail('SHELF 정보를 찾을 수 없습니다.');
    },
    CHECKINSHELFLOT: ({ payload }) => {
      const lot = store.getShelfIncomingLot(payload.LOTID);
      return lot ? pass(lot) : fail('입고가 불가능한 LOT 입니다.');
    },
    LOTINSHELF: ({ payload }) => store.transactShelfIncoming(payload, true),
    LOTOUTSHELF: ({ payload }) => store.transactShelfIncoming(payload, false),
  };
}
