import { fail, pass } from '../utils/response.js';
import { readXmlTag } from '../utils/xml.js';

/** STOCKERS carries the raw <ITEM><LOTID/><STOCKER/></ITEM> fragments built by stockerOut(). */
function readStockOutItems(stockers) {
  return [...String(stockers ?? '').matchAll(/<ITEM>([\s\S]*?)<\/ITEM>/gi)].map(([, item]) => ({
    LOTID: readXmlTag(item, 'LOTID'),
    STOCKER: readXmlTag(item, 'STOCKER'),
  }));
}

/**
 * Legacy calls: LotStatusByBayActivity -> MessageFactoryUtil.blstInfo / stockOut. AREABAYINFO and
 * BAYSTOCKERINFO are shared with Move Out and Setting (move-out.handlers.js).
 */
export function createLotStatusByBayHandlers(store) {
  return {
    BLSTINFO: ({ payload }) => {
      const jobCode = String(payload.JOBCODE ?? '').trim();
      if (jobCode === 'FAIL') return fail(`JOB [${jobCode}] 조회에 실패하였습니다.`);
      const lots = store.getLotStatusByBayLots({
        bay: payload.BAY,
        stocker: payload.STOCKER,
        jobCode,
      });
      return pass({ BLSTITEMS: { ITEM: lots } });
    },

    STOCKOUT: ({ payload }) => {
      const items = readStockOutItems(payload.STOCKERS);
      if (items.length !== Number(payload.ROWNO))
        return fail('ROWNO가 STOCKERS와 일치하지 않습니다.');
      for (const item of items) {
        const lot = store.getLotStatusByBayLot(item.LOTID);
        if (!lot) return fail(`LOT NO [${item.LOTID}]가 존재하지 않습니다.`);
        if (lot.LOC_TYPE !== 'S' || lot.LOCATION !== item.STOCKER) {
          return fail(`LOT NO [${item.LOTID}]는 STOCKER내에 있지 않습니다`);
        }
        if (item.LOTID.includes('FAIL'))
          return fail(`LOT NO [${item.LOTID}] 출고에 실패하였습니다.`);
      }
      for (const item of items) store.stockOutLot(item.LOTID, item.STOCKER, payload.PORT);
      return pass({});
    },
  };
}
