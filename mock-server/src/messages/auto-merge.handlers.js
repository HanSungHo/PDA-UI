import { fail, pass } from '../utils/response.js';

const product = 'PRODUCT-AM';
const route = 'ROUTE-AM';
const operation = '1000';

export function createAutoMergeHandlers() {
  return {
    GETAUTOMERGELOT({ payload }) {
      const lotId = payload.LOTID || '';
      if (!lotId) return fail('LOT ID을 입력하세요');
      if (lotId === 'AM-SEARCH-FAIL') return fail('Auto Merge LOT 조회 실패');
      const rows =
        lotId === 'AM-EMPTY'
          ? []
          : [1, 2].map((index) => ({
              LOTNAME: `${lotId}-0${index}`,
              MAINLOTNAME: `${lotId}-PARENT`,
              PRODUCTSPECNAME: product,
              PROCESSFLOWNAME: route,
              PROCESSOPERATIONNAME: operation,
              DESCRIPTION: 'MERGE 공정 설명',
            }));
      return pass({ ITEMS: { ITEM: rows } });
    },
    GETAUTOMERGELOT2({ payload }) {
      const lotId = payload.LOTID || '';
      if (lotId.startsWith('AM-DETAIL-FAIL')) return fail('Auto Merge 상세 조회 실패');
      const lots = String(payload.LOTLIST || lotId)
        .split(',')
        .filter(Boolean);
      const rows = lotId.startsWith('AM-DETAIL-EMPTY')
        ? []
        : lots.map((name, index) => ({
            LOTNAME: name,
            PRODUCTQUANTITY: index === 0 ? '10' : '15',
            PRODUCTSPECNAME: product,
            PROCESSFLOWNAME: index === 1 && lotId.startsWith('AM-ROUTE-MISMATCH') ? 'OTHER' : route,
            PROCESSOPERATIONNAME:
              index === 1 && lotId.startsWith('AM-OPER-MISMATCH') ? '2000' : operation,
            OPERATIONDESCRIPTION: '공정 설명',
            LOTSTATE: 'Released',
          }));
      return pass({
        PARENTLOTNAME: lotId.startsWith('AM-NO-PARENT') ? '' : payload.PARENTLOTID || '',
        PARENTQTY: '25',
        PARENTPRODUCTSPECNAME: product,
        PARENTPROCESSFLOWNAME: lotId.startsWith('AM-PARENT-ROUTE') ? 'OTHER' : route,
        PARENTOPERATION: lotId.startsWith('AM-PARENT-OPER-MISMATCH') ? '2000' : operation,
        PARENTDESCRIPTION: 'PARENT 공정 설명',
        ITEMS: { ITEM: rows },
      });
    },
    EXECUTEAUTOMERGE({ payload }) {
      if (payload.LOTNAME === 'AM-EXECUTE-FAIL') return fail('Auto Merge 실행 실패');
      if (!payload.MERGELOT || !payload.PARENTLOTNAME) return fail('Merge할 Lot이 없습니다.');
      const id = payload.LOTNAME || '';
      return pass({
        FAILLOTNAME: ['AM-PARTIAL', 'AM-BOTH'].includes(id) ? `${id}-02` : '',
        SUCCESS: ['AM-PARTIAL', 'AM-NO-SUCCESS'].includes(id) ? 'N' : 'Y',
      });
    },
  };
}
