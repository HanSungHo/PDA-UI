import { machineStatusDetailFixtures } from '../data/fixtures.js';
import { fail, pass } from '../utils/response.js';

export function createMachineStatusDetailHandlers() {
  return {
    EQPSTATUS: ({ payload }) => {
      const eqpId = String(payload.EQPID || '');
      if (eqpId.includes('ERROR') || eqpId.includes('FAIL')) {
        return fail('장비상태 조회 중 오류가 발생하였습니다.');
      }
      return pass(machineStatusDetailFixtures.eqpStatus);
    },

    EQPDOWNCODE: ({ payload }) => {
      const eqpId = String(payload.EQPID || '');
      const status = String(payload.EQPSTATUSCODE || payload.EQPSTATUS || 'R')
        .trim()
        .toUpperCase();
      if (eqpId.includes('ERROR')) {
        return fail('DOWNCODE 조회 중 오류가 발생하였습니다.');
      }
      return pass(
        machineStatusDetailFixtures.downCodeByStatus[status] ||
          machineStatusDetailFixtures.downCodeByStatus.R,
      );
    },

    EQPDOWNCOMMENT: ({ payload }) => {
      const downCode = String(payload.DOWNCODE || '')
        .trim()
        .toUpperCase();
      if (downCode.startsWith('PM')) {
        return pass(machineStatusDetailFixtures.downCommentSingle);
      }
      return pass(machineStatusDetailFixtures.downCommentDefault);
    },

    CHECKCHAMBER: ({ payload }) => {
      const eqpId = String(payload.EQPID || '');
      if (eqpId.includes('ERROR')) {
        return fail('Chamber 확인 중 오류가 발생하였습니다.');
      }
      return pass(machineStatusDetailFixtures.checkChamber);
    },

    CHECKNONLOT: ({ payload }) => {
      const eqpId = String(payload.EQPID || '');
      if (eqpId.includes('ERROR')) {
        return fail('NONLOT 확인 중 오류가 발생하였습니다.');
      }
      return pass(machineStatusDetailFixtures.checkNonLot);
    },

    CHANGEEQPSTATUS: ({ payload }) => {
      const eqpId = String(payload.EQPID || '');
      if (eqpId.includes('FAIL') || eqpId.includes('ERROR')) {
        return fail('장비상태 변경에 실패하였습니다.');
      }
      return pass(machineStatusDetailFixtures.changeEqpStatus);
    },
  };
}
