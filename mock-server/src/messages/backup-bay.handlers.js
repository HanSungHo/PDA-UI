import { readPayloadField } from '../utils/xml.js';
import { fail, pass } from '../utils/response.js';

// Source: hifos2 BackupBayDialogActivity.kt (JSON replies, not the XML Android-less path in xml.handlers.js).
//  - GETFLOORDATA  -> FABS.ITEM[{FLOOR}]
//  - GETBAYDATA (FLOOR) -> FABS.ITEM[{AREANAME}]
//  - GETPROCESSFACTORYLOT (LOTID) -> LOTSTATE/LOTHOLDSTATE/LOTPROCESSSTATE/JOBCODE/PRODUCTQUANTITY/
//    OPERATIONDESCRIPTION. LOTPROCESSSTATE "RUN" and LOTHOLDSTATE "OnHold" block the change.
//  - INFACTORY (CHANGEFACTORY0..6 = "LOT|BAY|OPERATOR") -> SUCCESSLOT count of non-empty entries.
//
// Scenario LOT IDs: WA2409001 WAIT, WA2409002 RUN, WA2409003 OnHold, WA2409004 not Released;
// ...NOTFOUND -> FAIL. Any other LOT is a normal WAIT/Released LOT. INFACTORY fails when an entry has
// a LOT containing INFAIL.
const BAYS_BY_FLOOR = {
  '1F': ['BAY-A01', 'BAY-A02', 'BAY-A03', 'BAY-A04', 'BAY-A05'],
  '2F': ['BAY-B01', 'BAY-B02', 'BAY-B03', 'BAY-B04'],
  '3F': ['BAY-C01', 'BAY-C02', 'BAY-C03'],
};

const LOTS = {
  WA2409001: ['WAIT', 'NotOnHold', 'Released', 'JOB-8821', '25', 'PHOTO ETCHING PROCESS'],
  WA2409002: ['RUN', 'NotOnHold', 'Released', 'JOB-8822', '25', 'DIFFUSION OXIDATION'],
  WA2409003: ['WAIT', 'OnHold', 'Released', 'JOB-8823', '20', 'ION IMPLANTATION'],
  WA2409004: ['WAIT', 'NotOnHold', 'Created', 'JOB-8824', '25', 'CHEMICAL VAPOR DEPOSITION'],
};

export function createBackupBayHandlers() {
  return {
    GETFLOORDATA: () =>
      pass({ FABS: { ITEM: Object.keys(BAYS_BY_FLOOR).map((FLOOR) => ({ FLOOR })) } }),

    GETBAYDATA: ({ payload }) => {
      const floor = readPayloadField(payload, 'FLOOR').trim().toUpperCase();
      const bays = BAYS_BY_FLOOR[floor];
      if (!bays) return fail('BAY DATA Empty!');
      return pass({ FABS: { ITEM: bays.map((AREANAME) => ({ AREANAME })) } });
    },

    GETPROCESSFACTORYLOT: ({ payload }) => {
      const lotId = readPayloadField(payload, 'LOTID').trim().toUpperCase();
      if (!lotId) return fail('LOT ID을 입력하세요');
      if (lotId.includes('NOTFOUND')) return fail('LOT 정보가 없습니다.');

      const [process, hold, state, jobCode, quantity, operation] = LOTS[lotId] ?? [
        'WAIT',
        'NotOnHold',
        'Released',
        'JOB-0001',
        '25',
        'ETCHING & THIN FILM FABRICATION',
      ];
      return pass({
        LOTPROCESSSTATE: process,
        LOTHOLDSTATE: hold,
        LOTSTATE: state,
        JOBCODE: jobCode,
        PRODUCTQUANTITY: quantity,
        OPERATIONDESCRIPTION: operation,
      });
    },

    INFACTORY: ({ payload }) => {
      const entries = Array.from({ length: 7 }, (_unused, index) =>
        readPayloadField(payload, `CHANGEFACTORY${index}`).trim(),
      ).filter(Boolean);
      if (entries.some((entry) => entry.toUpperCase().includes('INFAIL'))) {
        return fail('BACKUP BAY 변경에 실패하였습니다.');
      }
      return pass({ SUCCESSLOT: String(entries.length) });
    },
  };
}
