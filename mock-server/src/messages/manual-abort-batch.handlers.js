import { manualAbortBatchFixtures } from '../data/fixtures.js';
import { fail, pass } from '../utils/response.js';

const list = (rows) => ({ ITEM: rows });

export function createManualAbortBatchHandlers() {
  return {
    // ManualAbortBatchActivity.getBatchLOTInfo: FURNACEREMANUALLOT (LOTID) → MSGBODY.ITEMS.ITEM[].
    FURNACEREMANUALLOT: ({ payload }) => {
      const lotId = String(payload.LOTID || '').toUpperCase();

      if (lotId.includes('ERROR')) return fail('Abort Batch 정보가 없습니다.');
      if (lotId.includes('EMPTY')) return pass({ ITEMS: '' });
      return pass({ ITEMS: list(manualAbortBatchFixtures.rows) });
    },

    // ManualAbortBatchActivity.rebatchManualSave: FURNACEREMANUALSAVE (LOTID, EQPID, RCPID, USERID).
    FURNACEREMANUALSAVE: ({ payload }) => {
      const lotId = String(payload.LOTID || '').toUpperCase();
      const recipe = String(payload.RCPID || '').toUpperCase();

      if (lotId.includes('FAIL') || recipe.includes('ERROR')) {
        return fail('매뉴얼 등록에 실패하였습니다.');
      }
      return pass({ LOTID: lotId });
    },
  };
}
