import { readPayloadField } from '../utils/xml.js';
import { fail, pass } from '../utils/response.js';

// Source: hifos2 InputScopeDataActivity.kt (sent through MessageName.MESSAGE, dispatched by MSGNAME).
//  - GETSCOPELOTINFO (LOTID) -> LOTNAME/FACTORYNAME/PROCESSOPERATIONNAME/MACHINENAME/LAYERID, ISEXIST
//    ("Y" makes the Activity ask before overwriting) and FAULTS.FAULT[{TYPEVALUE}] for the spinner.
//  - INPUTSCOPEDATA -> PASS shows "데이터가 저장 되었습니다." and returns to Move Out, FAIL shows ERRMSG.
//
// Scenario LOT IDs (substring match, case-insensitive):
//   ...ERR / ...NOTFOUND -> FAIL        ...EXIST -> ISEXIST "Y"        ...SAVEFAIL -> save FAIL
const FAULTS = ['PARTICLE', 'SCRATCH', 'PATTERN DEFECT', 'CONTAMINATION', 'BRIDGE'];

export function createInputScopeDataHandlers() {
  const saved = new Set();

  return {
    GETSCOPELOTINFO: ({ payload }) => {
      const lotId = readPayloadField(payload, 'LOTID').trim().toUpperCase();
      if (!lotId) return fail('LOT ID을 입력하세요');
      if (lotId.includes('ERR') || lotId.includes('NOTFOUND')) {
        return fail(`존재하지 않는 LOT ID 입니다. (${lotId})`);
      }

      return pass({
        ISEXIST: lotId.includes('EXIST') || saved.has(lotId) ? 'Y' : 'N',
        LOTNAME: lotId,
        FACTORYNAME: 'FAB1',
        PROCESSOPERATIONNAME: '102030',
        MACHINENAME: 'SCOPE-01',
        LAYERID: 'PHOTO_01',
        FAULTS: { FAULT: FAULTS.map((TYPEVALUE) => ({ TYPEVALUE })) },
      });
    },

    INPUTSCOPEDATA: ({ payload }) => {
      const lotId = readPayloadField(payload, 'LOTID').trim().toUpperCase();
      if (!lotId) return fail('LotName이 확인되지 않습니다..');
      if (lotId.includes('SAVEFAIL')) return fail('Scope 측정 Data 저장에 실패하였습니다.');

      saved.add(lotId);
      return pass({});
    },
  };
}
