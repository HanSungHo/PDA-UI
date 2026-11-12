import { readPayloadField } from '../utils/xml.js';
import { fail, pass } from '../utils/response.js';

// Source: hifos2 RemoteFurnaceActivity / RemoteFurnaceInitActivity / RemoteFurnaceKECActivity /
// RemoteImpMainActivity / RemoteRamcoActivity.
//  - FURNACEDUMMYRCP (MACHINENAME) -> RECIPE "A,B,C"; FAIL shows the "no recipe" dialog
//  - FURNACEINTLKCHECK -> RET (message dialog when non-empty) and INTLK ("Y" disables the buttons)
//  - FURNACEREMOTESTART / FURNACEREMOTESTART_KEC / IMPREMOTESTART -> PASS closes the screen
//  - MACHINEPORTSTATUS_KJ -> PORTSTATENAME1/PORTLOTNAME/BATCH_CNT/EXIST_BATCH/ACKMSG
//  - RAMJOBCANCEL -> RET "0" means the cancel was requested
//
// Scenario IDs (substring match, case-insensitive):
//   MACHINENAME/EQPID ...NORECIPE -> no dummy recipe    ...INTLK -> FURNACEINTLKCHECK RET + INTLK "Y"
//                     ...FAIL -> the action FAIL        ...PORTERR -> MACHINEPORTSTATUS_KJ FAIL
//                     ...RETFAIL -> RAMJOBCANCEL RET "1"
//   PORTNAME  ...RUN -> RUN port    ...BATCH1 -> one batch (EXIST_BATCH 1)    ...BATCH2 -> two batches
//             ...EMPTY -> empty port state            otherwise IDLE with no batch
const upper = (payload, tag) => readPayloadField(payload, tag).trim().toUpperCase();

function startHandler(failMessage) {
  return ({ payload }) => {
    const machine = upper(payload, 'MACHINENAME');
    if (!machine) return fail('장비 ID을 입력하세요');
    if (machine.includes('FAIL')) return fail(failMessage);
    return pass({});
  };
}

function portState(port) {
  if (port.includes('EMPTY')) return '';
  return port.includes('RUN') ? 'RUN' : 'IDLE';
}

export function createRemoteFurnaceHandlers() {
  return {
    FURNACEDUMMYRCP: ({ payload }) => {
      const machine = upper(payload, 'MACHINENAME');
      if (!machine) return fail('장비 ID을 입력하세요');
      if (machine.includes('NORECIPE')) return fail('진행 가능한 Recipe가 없습니다.');
      return pass({ RECIPE: 'FDUM-RCP-01,FDUM-RCP-02,FDUM-RCP-03' });
    },

    FURNACEINTLKCHECK: ({ payload }) => {
      const machine = upper(payload, 'MACHINENAME');
      if (!machine) return fail('장비 ID을 입력하세요');
      return machine.includes('INTLK')
        ? pass({ RET: 'FURNACE INTERLOCK 상태입니다.', INTLK: 'Y' })
        : pass({ RET: '', INTLK: 'N' });
    },

    FURNACEREMOTESTART: startHandler('FURNACE REMOTE START에 실패하였습니다.'),
    FURNACEREMOTESTART_KEC: startHandler('FURNACE REMOTE START에 실패하였습니다.'),
    // RemoteFurnaceKjActivity / RemoteFurnaceInitActivity (CMDTYPE S start, R restart).
    FURNACEREMOTESTART_KJ: startHandler('FURNACE REMOTE START에 실패하였습니다.'),
    IMPREMOTESTART: startHandler('IMP REMOTE START에 실패하였습니다.'),

    MACHINEPORTSTATUS_KJ: ({ payload }) => {
      const eqpId = upper(payload, 'EQPID');
      const port = upper(payload, 'PORTNAME');
      if (!eqpId) return fail('장비 ID을 입력하세요');
      if (eqpId.includes('PORTERR')) return fail('PORT 상태 정보를 가져올 수 없습니다.');

      let batches = '0';
      if (port.includes('BATCH2')) batches = '2';
      else if (port.includes('BATCH1')) batches = '1';
      return pass({
        PORTSTATENAME1: portState(port),
        PORTLOTNAME: batches === '0' ? '' : upper(payload, 'LOTID'),
        BATCH_CNT: batches,
        EXIST_BATCH: batches === '1' ? '1' : '0',
        ACKMSG: '',
      });
    },

    RAMJOBCANCEL: ({ payload }) => {
      const machine = upper(payload, 'MACHINENAME');
      if (!machine) return fail('장비 ID을 입력하세요');
      if (machine.includes('RETFAIL')) return pass({ RET: '1' });
      if (machine.includes('FAIL')) return fail('Job 삭제 요청에 실패하였습니다.');
      return pass({ RET: '0' });
    },
  };
}
