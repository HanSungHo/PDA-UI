import { processInquireFixtures } from '../data/fixtures.js';
import { readPayloadField } from '../utils/xml.js';
import { fail, pass } from '../utils/response.js';

// Source: hifos2 MoveInActivity.kt. LOTINFO, RECIPEINFO, LOGINUSERCHECK, CHANGEEQPSTATUS, SLOTINFO,
// DUMMYEQP*, PROBECARDSET and CHECKINSPACTION already live in the other handler groups.
//
// Scenario IDs (substring match, case-insensitive):
//   EQPID  ...NOTFOUND -> FAIL    ...REMOTE -> MCFDCEQPINFO STATUS "Remote" (confirm dialog)
//          ...SUB -> EQPINFO SUBEQPID differs from MAINEQPID    ...INTERLOCK -> CHECKINTERLOCK text
//   LOTID  ...DICYCLE -> CHECKDICYCLE DICYCLE "Y"    ...MVINFAIL -> MOVEIN FAIL
//          ...MVINTRANS -> MOVEIN FAIL with ERRMSG "-1" (RF Tag re-read)    ...MVINMSG -> LOTINFOEND MVINMSG
//   PROBECARD ...BAD -> PROBECARDSTATUS "N" with PROBECARDMSG    ...NOMSG -> "N" without a message
//          ...LAST -> CHECKLASTPROBE "Y"
const upper = (payload, tag) => readPayloadField(payload, tag).trim().toUpperCase();

export function createMoveInHandlers() {
  return {
    MCFDCEQPINFO: ({ payload }) => {
      const eqpId = upper(payload, 'EQPID');
      if (!eqpId) return fail('장비 ID을 입력하세요');
      if (eqpId.includes('NOTFOUND')) return fail(`${eqpId} 장비 정보를 찾을 수 없습니다.`);
      return pass({ STATUS: eqpId.includes('REMOTE') ? 'Remote' : 'Local', EQPID: eqpId });
    },

    EQPINFO: ({ payload }) => {
      const eqpId = upper(payload, 'EQPID');
      if (!eqpId) return fail('장비 ID을 입력하세요');
      if (eqpId.includes('NOTFOUND')) return fail(`${eqpId} 장비 정보를 찾을 수 없습니다.`);
      return pass({
        MAINEQPID: eqpId,
        SUBEQPID: eqpId.includes('SUB') ? `${eqpId}-S` : eqpId,
        CHECKINTERLOCK: eqpId.includes('INTERLOCK') ? '장비 INTERLOCK 상태를 확인하세요.' : '',
      });
    },

    CHECKDICYCLE: ({ payload }) => {
      const lotId = upper(payload, 'LOTID');
      if (!lotId) return fail('LotName이 확인되지 않습니다..');
      if (lotId.includes('DIFAIL')) return fail('DI CYCLE 조회에 실패하였습니다.');
      // ProcessInquireActivity reads ITEMS.PHOTOOPERTYPE when DICYCLE is "Y".
      return lotId.includes('DICYCLE')
        ? pass({ DICYCLE: 'Y', ITEMS: processInquireFixtures.diCycleItems })
        : pass({ DICYCLE: 'N' });
    },

    // Source: hifos2 ProcessInquireActivity.getMeasureInfo() / onOk() (MEASUREINFO, MEASURESET).
    MEASUREINFO: ({ payload }) => {
      const lotId = upper(payload, 'LOTID');
      if (!lotId) return fail('LotName이 확인되지 않습니다..');
      if (lotId.includes('MEASDONE')) return fail('검색한 MEASURE 정보가 없습니다.');
      return pass({
        ...processInquireFixtures.measureInfo,
        OPERATION:
          readPayloadField(payload, 'OPERATION') || processInquireFixtures.measureInfo.OPERATION,
        MEASUREITEMS: { MEASUREITEM: processInquireFixtures.measureItems },
      });
    },

    MEASURESET: ({ payload }) => {
      const lotId = upper(payload, 'LOTID');
      if (!lotId) return fail('LotName이 확인되지 않습니다..');
      if (!readPayloadField(payload, 'SUBOPERATION')) return fail('계측할 공정을 선택하세요.');
      if (lotId.includes('MSETFAIL')) return fail(`${lotId} MEASURE SET failed.`);
      return pass({ ...processInquireFixtures.measureSet });
    },

    MOVEIN: ({ payload }) => {
      const lotId = upper(payload, 'LOTID');
      if (!lotId) return fail('LotName이 확인되지 않습니다..');
      if (lotId.includes('MVINTRANS')) return fail('-1');
      if (lotId.includes('MVINFAIL')) return fail(`${lotId} MOVE IN failed.`);
      return pass({});
    },

    LOTINFOEND: ({ payload }) => {
      const lotId = upper(payload, 'LOTID');
      if (!lotId) return fail('LotName이 확인되지 않습니다..');
      return lotId.includes('MVINMSG')
        ? pass({ MVINMSG: '다음 공정 안내를 확인하세요.', MVINACTION: 'MOVE IN 안내' })
        : pass({ MVINMSG: '', MVINACTION: '' });
    },

    PROBECARDINFO: ({ payload }) => {
      const card = upper(payload, 'PROBECARD');
      if (!card) return fail('PROBE CARD를 입력하세요');
      if (card.includes('BAD')) {
        return pass({
          PROBECARDSTATUS: 'N',
          PROBECARDNO: '',
          PROBECARDMSG: '사용할 수 없는 PROBE CARD 입니다.',
          CHECKLASTPROBE: 'N',
        });
      }
      if (card.includes('NOMSG')) {
        return pass({
          PROBECARDSTATUS: 'N',
          PROBECARDNO: '',
          PROBECARDMSG: '',
          CHECKLASTPROBE: 'N',
        });
      }
      return pass({
        PROBECARDSTATUS: 'Y',
        PROBECARDNO: `${card}-NO`,
        PROBECARDMSG: '',
        CHECKLASTPROBE: card.includes('LAST') ? 'Y' : 'N',
      });
    },

    PROBECARDVALUE: ({ payload }) => {
      if (!upper(payload, 'PROBECARD')) return fail('PROBE CARD를 입력하세요');
      return pass({ VALUE_OD: '1.0', VALUE_Z: '1.0' });
    },
  };
}
