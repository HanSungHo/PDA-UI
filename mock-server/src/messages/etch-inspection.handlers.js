import { readPayloadField } from '../utils/xml.js';
import { fail, pass } from '../utils/response.js';

// Source: hifos2 EtchInspectionActivity.kt.
//  - ETCHINSPINFO (TYPE=S, LOTID) -> MSGBODY with the OLD*/NOW* operation fields, PRODUCTSPECNAME and
//    INSPDATE. A non-empty INSPDATE makes the Activity ask "검사 이력이 있습니다" before executing.
//  - ETCHINSPEXCUTION (note the legacy spelling) -> PASS clears the screen, FAIL shows ERRMSG.
//
// Scenario LOT IDs (substring match, case-insensitive):
//   ...NOTFOUND -> FAIL (no lot)       ...EXIST -> INSPDATE already recorded
//   ...EXECFAIL -> search PASS, execution FAIL
const baseInspection = (lotId) => ({
  OLDPROCESSOPERATIONNAME: 'ETCH-010',
  OLDOPERATIONDESCRIPTION: 'Etch scope inspection',
  OLDMACHINENAME: 'ETCH-EQP-01',
  NOWPROCESSOPERATIONNAME: 'ETCH-020',
  NOWOPERATIONDESCRIPTION: 'Final etch inspection',
  INSPDATE: '',
  PRODUCTSPECNAME: `PRODUCT-${lotId.slice(0, 1) || 'A'}`,
});

export function createEtchInspectionHandlers() {
  // Inspections recorded through ETCHINSPEXCUTION, so a later search reports INSPDATE like the DB.
  const recorded = new Map();

  return {
    ETCHINSPINFO: ({ payload }) => {
      const lotId = readPayloadField(payload, 'LOTID').trim().toUpperCase();
      if (!lotId) return fail('LOT ID을 입력하세요');
      if (lotId.includes('NOTFOUND')) return fail('LOT 정보가 없습니다.');

      const inspection = baseInspection(lotId);
      if (lotId.includes('EXIST')) inspection.INSPDATE = '2026-09-29 10:30:00';
      if (recorded.has(lotId)) inspection.INSPDATE = recorded.get(lotId);
      return pass(inspection);
    },

    ETCHINSPEXCUTION: ({ payload }) => {
      const lotId = readPayloadField(payload, 'LOTNAME').trim().toUpperCase();
      if (!lotId) return fail('LotName이 확인되지 않습니다..');
      if (lotId.includes('EXECFAIL')) return fail('완성검사 처리에 실패하였습니다.');

      recorded.set(lotId, '2026-11-09 09:00:00');
      return pass({});
    },
  };
}
