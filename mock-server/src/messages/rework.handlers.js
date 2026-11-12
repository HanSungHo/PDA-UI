import { readPayloadField } from '../utils/xml.js';
import { fail, pass } from '../utils/response.js';

// Source: hifos2 ReworkActivity.kt.
//  - REWORKINFO (LOTID, FACILITY) -> PRODUCT/OPERATION/SUBOPERATION/PROCESSSTEP/EQPID/STATE/STATUS/
//    HOLDSTATUS/QUANTITY + REWORKITEMS[{REWORKCODE, RWDESCRIPTION}]. The Activity refuses to rework
//    when STATE != "WIP" or HOLDSTATUS == "ONHOLD".
//  - REWORK -> PASS closes the screen (no body is read), FAIL shows ERRMSG.
//  - AREABAYINFO / BAYSTOCKERINFO are shared (move-out.handlers.js).
//
// Scenario LOT IDs (substring match, case-insensitive):
//   ...NOTFOUND -> FAIL        ...NOTWIP -> STATE "WAIT"        ...HOLD -> HOLDSTATUS "ONHOLD"
//   ...NOCODE -> empty REWORKITEMS        ...REWORKFAIL -> info PASS, REWORK FAIL
const REWORK_ITEMS = [
  { REWORKCODE: 'RW01', RWDESCRIPTION: 'Particle rework' },
  { REWORKCODE: 'RW02', RWDESCRIPTION: 'Pattern defect rework' },
  { REWORKCODE: 'RW03', RWDESCRIPTION: 'Bridging rework' },
];

export function createReworkHandlers() {
  return {
    REWORKINFO: ({ payload }) => {
      const lotId = readPayloadField(payload, 'LOTID').trim().toUpperCase();
      if (!lotId) return fail('LOT ID을 입력하세요');
      if (lotId.includes('NOTFOUND')) return fail('해당 LOT 정보를 찾을 수 없습니다.');

      return pass({
        PRODUCT: 'PRD-0001',
        OPERATION: 'OP10',
        SUBOPERATION: '00',
        PROCESSSTEP: 'STEP-A',
        EQPID: 'EQP-01',
        STATE: lotId.includes('NOTWIP') ? 'WAIT' : 'WIP',
        STATUS: 'RUN',
        HOLDSTATUS: lotId.includes('HOLD') ? 'ONHOLD' : 'NONE',
        QUANTITY: '25',
        REWORKITEMS: {
          ITEM: lotId.includes('NOCODE') ? [] : REWORK_ITEMS.map((item) => ({ ...item })),
        },
      });
    },

    REWORK: ({ payload }) => {
      const lotId = readPayloadField(payload, 'LOTID').trim().toUpperCase();
      if (!lotId) return fail('LotName이 확인되지 않습니다..');
      if (lotId.includes('REWORKFAIL')) return fail('REWORK 처리에 실패하였습니다.');
      if (!readPayloadField(payload, 'REWORKCODE').trim()) return fail('REWORK코드를 선택하세요.');
      return pass({});
    },
  };
}
