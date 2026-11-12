import { fail, pass } from '../utils/response.js';

// Source: hifos2 SplitActivity.kt (CALLCUSTOMER, SPLIT). SLOTINFO is shared with Move Out and
// lives in move-out.handlers.js, which falls back to splitLotFixtures for the Split LOT ids.
export function createSplitHandlers({ customerByProduct }) {
  return {
    CALLCUSTOMER: ({ payload }) => {
      const product = String(payload.PRODUCT || '').trim();
      return pass({ CUSTOMER: customerByProduct[product] ?? '' });
    },

    // SPLITITEMS carries back-to-back <ITEM> blocks (SPLITLOTID/SPLITQTY/SPLITPROD/WAFERID).
    SPLIT: ({ payload }) => {
      const lotId = String(payload.LOTID || '').toUpperCase();
      if (!lotId) return fail('LOT ID을 입력하세요');
      if (lotId.includes('FAIL')) return fail(`LOT [${lotId}] SPLIT에 실패하였습니다.`);

      const items = [...String(payload.SPLITITEMS || '').matchAll(/<ITEM>([\s\S]*?)<\/ITEM>/gi)];
      if (items.length === 0) return fail('자 LOT의 개수를 입력하세요');
      return pass({});
    },
  };
}
