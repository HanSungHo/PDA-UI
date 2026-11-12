import { fail, pass } from '../utils/response.js';

// Source: hifos2 MergeActivity.kt. Both messages travel through MessageName.MESSAGE
// (/hifos/message), so they are dispatched by the AIFMSG MSGNAME.
export function createMergeHandlers(mergeFixtures) {
  return {
    GETMERGELOT: ({ payload }) => {
      const lotId = String(payload.LOTID || '')
        .trim()
        .toUpperCase();
      if (!lotId) return fail('LOT ID을 입력하세요');
      const lot = mergeFixtures[lotId];
      return lot ? pass(structuredClone(lot)) : fail(`LOT [${lotId}]이 존재하지 않습니다.`);
    },

    // Activity reads FAILLOTNAME (shown as an error dialog) and SUCCESS == "Y" (info dialog).
    EXECUTEMERGE: ({ payload }) => {
      const lotName = String(payload.LOTNAME || '').toUpperCase();
      if (!lotName) return fail('LOTNAME이 확인되지 않습니다.');
      if (lotName.includes('FAIL')) return fail('MERGE 처리에 실패하였습니다.');
      if (!String(payload.MERGELOT || '').trim()) return fail('Merge할 LOT을 선택하세요.');
      if (lotName.includes('PARTIAL')) {
        return pass({ FAILLOTNAME: 'LOT-A260915-021', SUCCESS: 'N' });
      }
      return pass({ FAILLOTNAME: '', SUCCESS: 'Y' });
    },
  };
}
