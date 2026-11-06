import { fail, pass } from '../utils/response.js';

/**
 * Handlers for the TEST | TUNING screen (Kotlin: TestTuningActivity).
 * Messages: CVDTESTMAININFO, CVDTESTSUBINFO, CVDTESTBODYINFO
 *
 * Payload fields mirror the legacy XML body tags built by MessageFactoryUtil:
 *  - CVDTESTMAININFO: EQPID
 *  - CVDTESTSUBINFO:  EQPID, MAINID, TYPEID ('TEST' | 'TUNING')
 *  - CVDTESTBODYINFO: EQPID, MAINID, SUBID, TYPEID
 *
 * Response MSGBODY:
 *  - CVDTESTMAININFO: { RCP_GROUP: string }        pipe-delimited list, may be empty
 *  - CVDTESTSUBINFO:  { SUBID: string }            pipe-delimited list, may be empty
 *  - CVDTESTBODYINFO: { BODY: {ITEM: object[]}, LOTID? }  LOTID only meaningful for TYPEID='TEST'
 *
 * Test helpers:
 *  - EQPID containing 'FAIL'  -> FAIL on CVDTESTMAININFO (unknown equipment)
 *  - EQPID 'TT-EQP-EMPTY'     -> PASS with empty RCP_GROUP (no MAIN options)
 *  - MAINID containing 'FAIL' -> FAIL on CVDTESTSUBINFO
 *  - SUBID containing 'FAIL'  -> FAIL on CVDTESTBODYINFO
 */
export function createTestTuningHandlers(store) {
  return {
    CVDTESTMAININFO: ({ payload }) => {
      const eqpId = String(payload.EQPID || '').trim();
      if (!eqpId) return fail('장비를 입력하세요.');
      if (eqpId.toUpperCase().includes('FAIL')) return fail('장비 정보를 찾을 수 없습니다.');

      const rcpGroup = store.getCvdTestMainGroups(eqpId);
      if (rcpGroup === undefined) return fail('조회된 장비정보가 없습니다.');

      return pass({ RCP_GROUP: rcpGroup });
    },

    CVDTESTSUBINFO: ({ payload }) => {
      const eqpId = String(payload.EQPID || '').trim();
      const mainId = String(payload.MAINID || '').trim();
      const typeId = String(payload.TYPEID || '').trim();
      if (!eqpId || !mainId) return fail('필수 정보가 없습니다.');
      if (mainId.toUpperCase().includes('FAIL')) return fail('SUB 정보를 찾을 수 없습니다.');

      return pass({ SUBID: store.getCvdTestSubIds(eqpId, mainId, typeId) });
    },

    CVDTESTBODYINFO: ({ payload }) => {
      const eqpId = String(payload.EQPID || '').trim();
      const mainId = String(payload.MAINID || '').trim();
      const subId = String(payload.SUBID || '').trim();
      const typeId = String(payload.TYPEID || '').trim();
      if (!eqpId || !mainId || !subId) return fail('필수 정보가 없습니다.');
      if (subId.toUpperCase().includes('FAIL')) return fail('조회된 정보가 없습니다.');

      const { lotId, rows } = store.getCvdTestBody(eqpId, mainId, subId, typeId);
      // Real server wraps list bodies as BODY.ITEM[] (ResponseDataToJsonUtil convention).
      const result = { BODY: { ITEM: rows } };
      if (typeId.toUpperCase() === 'TEST') result.LOTID = lotId;
      return pass(result);
    },
  };
}
