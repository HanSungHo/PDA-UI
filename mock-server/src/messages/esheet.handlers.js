import { fail, pass } from '../utils/response.js';

function normalize(value) {
  return String(value || '').trim();
}

export function createESheetHandlers(store) {
  return {
    FURNACE_KJCHECK: ({ payload }) => {
      const lotId = normalize(payload.LOTID);
      const result = store.getESheetFurnaceClassification(lotId);
      return result ? pass(result) : fail(`LOT ${lotId}의 Furnace 정보를 찾을 수 없습니다.`);
    },
    ESHEETINFO: ({ payload }) => {
      const lotId = normalize(payload.LOTID);
      if (!lotId) return fail('LOT NO를 입력하세요');
      if (lotId.toUpperCase() === 'WP-ERROR') return fail('eSheet 조회에 실패하였습니다.');
      const data = store.getESheetInfo(lotId);
      if (!data) return fail(`LOT ${lotId}을(를) 찾을 수 없습니다.`);
      return pass(data);
    },
    GETWAFER: ({ payload }) => {
      const lotId = normalize(payload.LOTID);
      const waferList = store.getESheetWaferList(lotId);
      return waferList === undefined
        ? fail(`LOT ${lotId}의 WAFER 정보를 찾을 수 없습니다.`)
        : pass({ WAFERLIST: waferList });
    },
    MASKINFO: ({ payload }) => {
      // MultiMaskLocationActivity omits ID_IDENT and reads single MSGBODY fields;
      // eSheet sends ID_IDENT=T for a reticle list and reads MSGBODY.ITEMS.ITEM.
      if (payload.ID_IDENT !== 'T') {
        const mask = store.getMaskInfo(payload.RETICLEID);
        return mask ? pass(mask) : fail(`${normalize(payload.RETICLEID)} MASK 정보가 없습니다.`);
      }
      const rows = store.getESheetMaskInfo(payload.RETICLEID);
      return rows
        ? pass({ ITEMS: { ITEM: rows } })
        : fail('마스크 위치정보를 조회하지 못했습니다.');
    },
    PCMREWORKRECIPE: ({ payload }) => {
      const result = store.getESheetPcmReworkRecipe(payload.LOTID);
      return result ? pass(result) : fail('PCM 조회에 실패하였습니다.');
    },
    CHECKFUTURE: ({ payload }) => {
      const lotId = normalize(payload.LOTNAME);
      if (!store.getESheetInfo(lotId)) return fail(`LOT ${lotId}을(를) 찾을 수 없습니다.`);
      return pass({
        FUTURELIST: store.getESheetFutureActions(lotId, payload.OPERATION, payload.SUBOPERATION),
      });
    },
    CHECKPHOTOSAMPLE: ({ payload }) => {
      const sample = store.getESheetPhotoSample(payload.LOTID, payload.LOCATION);
      return sample ? pass(sample) : fail('공정 샘플 정보를 확인할 수 없습니다.');
    },
  };
}
