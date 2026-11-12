import { photoMachineFixtures, photoPortStates } from '../data/fixtures.js';
import { readPayloadField } from '../utils/xml.js';
import { fail, pass } from '../utils/response.js';

// Source: hifos2 RemoteMachineSelectActivity.kt (PHOTO remote flow).
//  - REMOTEEQPINFO2 (EQPID, LOTID, ...) -> MAINEQPID/PROCEQPID/ISLOCALTRACK/PRNAME/RECIPE/INLINEMODE/
//    LAYERID/RANDOMFLAG/SAMPLEFLAG/EQPTYPE/REWORK_CODE/BARCCOUNT/PMMESSAGE/PORTNAME
//  - REMOTEEQPEENINFO (sent through the REMOTEEQPINFO route) -> EEN check, an empty body is fine
//  - PHOTOCHANGEEQPSTATUS / PHOTOLOTRESERVE / PHOTOLOTSTART -> PASS with a message
//  LOTINFO and MACHINEPORTSTATUS are shared with the other handler groups (WP* LOT fixtures,
//  PHOTO01/PHOTO02 ports P01 READY, P02 RUN, P03 IDLE).
//
// Scenario IDs (substring match, case-insensitive):
//   MACHINE ...NOTFOUND -> REMOTEEQPINFO2 FAIL (machines other than PHOTO* also fail)
//           ...FAIL     -> PHOTOLOTSTART / PHOTOLOTRESERVE / PHOTOCHANGEEQPSTATUS FAIL
const upper = (payload, tag) => readPayloadField(payload, tag).trim().toUpperCase();
const ACTION_OK = { MESSAGE: 'Remote machine action completed.' };

export function createRemoteMachineSelectHandlers() {
  return {
    REMOTEEQPINFO2: ({ payload }) => {
      const eqpId = upper(payload, 'EQPID');
      if (!eqpId) return fail('장비 ID을 입력하세요');
      const machine = photoMachineFixtures[eqpId];
      if (!machine) return fail(`유효하지 않은 장비입니다. [${eqpId}]`);

      return pass({
        MAINEQPID: eqpId,
        PROCEQPID: eqpId,
        ISLOCALTRACK: machine.isLocalTrack,
        PRNAME: 'PR-PHOTO-01',
        RECIPE: 'RCP-A100-REMOTE',
        INLINEMODE: 'AUTO',
        LAYERID: 'LAYER-01',
        RANDOMFLAG: 'N',
        SAMPLEFLAG: 'Normal',
        EQPTYPE: 'TRACK',
        REWORK_CODE: '',
        BARCCOUNT: '0',
        PMMESSAGE: '',
        PORTNAME: Object.keys(photoPortStates).join(','),
      });
    },

    REMOTEEQPEENINFO: ({ payload }) => {
      if (!upper(payload, 'EQPID')) return fail('장비 ID을 입력하세요');
      return pass({ EENMESSAGE: '' });
    },

    PHOTOCHANGEEQPSTATUS: ({ payload }) => {
      const machine = upper(payload, 'MACHINENAME');
      if (!machine) return fail('장비 ID을 입력하세요');
      if (machine.includes('FAIL')) return fail('장비 상태 변경에 실패하였습니다.');
      return pass(ACTION_OK);
    },

    PHOTOLOTRESERVE: ({ payload }) => {
      if (!upper(payload, 'LOTNAME')) return fail('LotName이 확인되지 않습니다..');
      if (upper(payload, 'MACHINENAME').includes('FAIL')) return fail('LOT 예약에 실패하였습니다.');
      return pass(ACTION_OK);
    },

    PHOTOLOTSTART: ({ payload }) => {
      if (!upper(payload, 'LOTNAME')) return fail('LotName이 확인되지 않습니다..');
      if (upper(payload, 'MACHINENAME').includes('FAIL')) return fail('LOT 시작에 실패하였습니다.');
      return pass(ACTION_OK);
    },
  };
}
