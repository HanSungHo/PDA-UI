import { fail, pass } from '../utils/response.js';

function batchItemBody(item) {
  return {
    NUM: String(item.num || ''),
    ISDCOL: item.isdcol || '',
    LOTID: item.lotId,
    STATUS: item.status,
    COMMENTQTY: String(item.commentQty || 0),
    STATE: item.status,
    PROCESSSTEP: item.processStep,
    PRODUCT: item.product,
    QUANTITY: item.quantity,
    ERRORMESSAGE: item.errorMessage,
    OPERATION: item.operation,
    SUBOPERATION: item.subOperation,
    LOTSTATE: item.lotState,
    NWCOMMENTQTY: String(item.nwCommentQty || 0),
    OPERSEQUENCE: item.operSequence,
    OPTYPE: item.opType,
    BAYNAME: item.bayName,
    STOCKERNAME: item.stockerName,
    PROCESSNAME: item.processName || '',
    THICKAREA: item.thickArea || '',
    N: item.n || '',
    RECIPE: item.recipe || '',
    VIEWCOUNT: item.viewCount || '',
    WAFERTYPE: item.waferType || '',
    THIN: item.thin || '',
    THSPEC: item.thspec || '',
    PTIN: item.ptin || '',
    PTSPEC: item.ptspec || '',
  };
}

function activityLotBody(lot, batchId = '') {
  return {
    CHECKMACHINE: lot.CHECKMACHINE || '',
    CHECKOPERTION: lot.CHECKOPERTION || '',
    CHECKDEPOCOMMENT: lot.CHECKDEPOCOMMENT || '',
    CHECKTHCIKNESSCOMMENT: lot.CHECKTHCIKNESSCOMMENT || '',
    CHECKRECYCLECOMMENT: lot.CHECKRECYCLECOMMENT || '',
    MAXBATCHMESSAGE: lot.MAXBATCHMESSAGE || '',
    PRODUCT: lot.PRODUCT || '',
    OPERATION: lot.OPERATION || '',
    SUBOPERATION: lot.SUBOPERATION || '',
    PROCESSSTEP: lot.PROCESSSTEP || '',
    QUANTITY: lot.QUANTITY || '',
    BATCHID: lot.BATCHID || batchId || '',
    STEPRECIPE: lot.STEPRECIPE || lot.WORKEDRECIPE || '',
    LIMITZONE: lot.LIMITZONE || '',
    STATUS: lot.STATUS || '',
    VIEWCOUNT: lot.VIEWCOUNT || '',
    PROCESSNAME: lot.PROCESSNAME || '',
    PTIN: lot.PTIN || '',
    PTSPEC: lot.PTSPEC || '',
    CHECKQTIME: lot.CHECKQTIME || '',
    PROCESSOPERATIONTYPE: lot.PROCESSOPERATIONTYPE || '',
    JALOT: lot.JALOT || '',
    MOLOT: lot.MOLOT || '',
    CHECKRECIPE: lot.CHECKRECIPE || lot.WORKEDRECIPE || '',
    JACOUNT: lot.JACOUNT || '1',
    LIMITRECIPE: lot.LIMITRECIPE || lot.WORKEDRECIPE || '',
    FQCSAMPLE: lot.FQCSAMPLE || '',
  };
}

// The HTTP envelope is JSON; BATCHITEMS remains the seven-field XML fragment
// produced by BatchActivity.setBatch (including its six padded rows).
function parseBatchItems(fragment) {
  if (typeof fragment !== 'string') return null;
  const fields = ['ZONE', 'LOTID', 'OPERATION', 'SUBOPERATION', 'SLOTTYPE', 'PTIN', 'THIN'];
  const itemPattern = /<ITEM>\s*([\s\S]*?)\s*<\/ITEM>/g;
  const matches = [...fragment.matchAll(itemPattern)];
  if (matches.length !== 6 || fragment.replace(itemPattern, '').trim()) return null;
  const decode = (value) =>
    value.replace(
      /&(lt|gt|quot|apos|amp);/g,
      (_, entity) => ({ lt: '<', gt: '>', quot: '"', apos: "'", amp: '&' })[entity],
    );
  const items = [];
  for (const match of matches) {
    let content = match[1];
    const item = {};
    for (const field of fields) {
      const node = new RegExp(`^\\s*<${field}>([^<]*)</${field}>`).exec(content);
      if (!node) return null;
      item[field] = decode(node[1]);
      content = content.slice(node[0].length);
    }
    if (content.trim()) return null;
    items.push(item);
  }
  return items;
}

export function createBatchHandlers(store) {
  return {
    REALEQPID: ({ payload }) => {
      if (payload.TYPE !== 'BACHCREATE') return fail('지원하지 않는 장비 조회 유형입니다.');
      const equipment = store.getActivityBatchEquipment(payload.EQPID);
      if (!equipment) return fail('장비 정보가 없습니다.');
      return pass(equipment);
    },
    BLOTINFO: ({ payload }) => {
      let lot = store.getActivityBatchLot(payload.LOTID) || store.getLot(payload.LOTID);
      let batch = store.getBatchByLot(payload.LOTID);
      // Related 子/母 reloads first call BLOTINFO with the related batch ID.
      if (!lot) {
        batch = store.getBatch(payload.LOTID);
        const firstLotId = batch?.items.find((item) => item.lotId)?.lotId;
        if (firstLotId) lot = store.getActivityBatchLot(firstLotId) || store.getLot(firstLotId);
      }
      if (!lot) return fail('LOT 정보를 찾을 수 없습니다.');
      return pass(activityLotBody(lot, batch?.context?.batchId));
    },
    BATCHLISTBYLOT: ({ payload }) => {
      const batch =
        store.getBatch(payload.BATCHID) ||
        store.getBatchByLot(payload.LOTID) ||
        store.getBatch(payload.LOTID);
      if (!batch) return fail('해당 Batch를 찾을 수 없습니다.');
      const items = batch.items.filter((item) => item.lotId).map(batchItemBody);
      return pass({
        BATCHID: batch.context.batchId,
        LOTID: batch.context.lotId,
        EQPID: batch.context.eqpId,
        BATCHTYPE: batch.context.batchType || 'R',
        MWCOUNT: batch.context.monitorWaferCount || '1',
        RECIPE: batch.context.recipe,
        PARENTBATCHID: batch.context.parentBatchId || '',
        CHILDZONE: batch.context.childZone || '',
        COMMENT: batch.context.comment,
        TRANSPORT: batch.context.transport,
        FACILITY: payload.FACILITY || batch.context.facility,
        CHECKPARAMETER: batch.checkParameter,
        UNREADWORKCOMMENTQTY: String(batch.unreadWorkCommentQty),
        BATCHITEMS: payload.CASE === 'SERCH' ? { ITEM: items } : items,
        ITEMS: items,
      });
    },
    BATCHLIST: ({ payload }) => {
      const batch = store.getBatch(payload.BATID || payload.BATCHID);
      if (!batch) return fail('해당 Batch를 찾을 수 없습니다.');
      return pass({
        BATID: batch.context.batchId,
        FACILITY: payload.FACILITY || batch.context.facility,
        ITEMS: batch.items
          .filter((item) => item.lotId)
          .map((item, index) => ({
            NO: String(index + 1),
            LOTID: item.lotId,
            ISDCOL:
              item.lotId === 'D/W' || item.waferType === 'D/W' || item.processName === 'MW_TEST'
                ? 'Y'
                : '',
          })),
      });
    },
    BATCHTYPE: ({ payload }) => {
      if (payload.BATCHTYPE !== 'C') return fail('지원하지 않는 Batch Type입니다.');

      const batch = store.getBatch(payload.BATCHID);
      if (!batch) return fail('해당 Batch를 찾을 수 없습니다.');

      const children = store.getActivityBatchChildren(payload.BATCHID);
      if (children.length) {
        return pass({
          ITEMS: children.map((child, index) => ({
            ROWNUM: String(index + 1),
            BATCHID: child.context.batchId,
            LOT1: child.items[0]?.lotId || '',
          })),
        });
      }
      return pass({
        ITEMS: batch.items
          .filter((item) => item.lotId)
          .map((item, index) => ({
            ROWNUM: String(index + 1),
            BATCHID: batch.context.batchId,
            LOT1: item.lotId,
          })),
      });
    },
    BATCHCOUNTSERCH: () => pass({ BATCHCOUNTVIEW: store.getActivityBatchCountView() }),
    GETPARENTBATCHID: ({ payload }) => {
      if (!payload.LOTID || !payload.MACHINENAME) return fail('LOTID/MACHINENAME이 필요합니다.');
      const result = store.getActivityBatchParentIds(payload.MACHINENAME, payload.LOTID);
      return result?.error ? fail(result.error) : pass({ ITEMS: { ITEM: result } });
    },
    GETBATCHZONE: ({ payload }) => {
      if (!payload.MBATCHID) return fail('MBATCHID가 필요합니다.');
      const zone = store.getActivityBatchZone(payload.MBATCHID);
      return zone === undefined ? fail('ZONE 조회에 실패했습니다.') : pass({ ZONE: zone });
    },
    BATCHCRTCHECK: ({ payload }) => {
      if (!payload.EQPID) return fail('장비를 입력하세요.');
      if (!['Y', 'N'].includes(payload.CHALIDCHECK)) return fail('CHALIDCHECK가 필요합니다.');
      const items = parseBatchItems(payload.BATCHITEMS);
      if (!items) return fail('BATCHITEMS 형식이 올바르지 않습니다.');
      const result = store.getActivityBatchPrecheck(payload.EQPID);
      return result.error ? fail(result.error) : pass(result);
    },
    BATCHCRT: ({ payload }) => {
      if (!['C', 'M', 'D'].includes(payload.TYPE))
        return fail('지원하지 않는 BATCH 처리 유형입니다.');
      if (payload.ROWNO !== '6') return fail('ROWNO는 6이어야 합니다.');
      if (payload.TYPE === 'D') {
        if (!payload.BATCHID || payload.BATCHITEMS !== '' || payload.MWCOUNT !== '')
          return fail('삭제 요청 형식이 올바르지 않습니다.');
      } else {
        if (!payload.EQPID || !['Y', ''].includes(payload.CHALIDCHECK))
          return fail('장비와 CHALIDCHECK가 필요합니다.');
        if (payload.CHALIDCHECK === 'Y' && (!payload.MBATCHID || !payload.CHALIDZONE))
          return fail('모 BATCH ID와 자 ZONE을 입력 하세요.');
      }
      const items = payload.TYPE === 'D' ? [] : parseBatchItems(payload.BATCHITEMS);
      if (!items) return fail('BATCHITEMS 형식이 올바르지 않습니다.');
      const warnings = store.getActivityBatchCreateResult(payload.EQPID);
      if (warnings.error) return fail(warnings.error);
      const result = store.saveActivityBatch(payload, items);
      return pass({ ...warnings, BATCHID: result.batchId });
    },
    BATCHCOUNT: () => pass({ BATCHDOWN: 'N', DOWNMESSAGE: '' }),
    CHECKBATCHCOUNT: () => pass({ BATCHDOWN: 'N', DOWNMESSAGE: '' }),
  };
}
