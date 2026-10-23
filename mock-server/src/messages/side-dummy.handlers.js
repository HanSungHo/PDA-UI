import { sideDummyFixtures } from '../data/fixtures.js';
import { fail, pass } from '../utils/response.js';

export function createSideDummyHandlers() {
  return {
    SIDEDMMSELECT: ({ payload }) => {
      const eventName = String(payload.EVENT_NAME || '').toUpperCase();
      const eqpId = String(payload.EQPID || '');
      const lotId = String(payload.LOTNAME || '');

      if (eqpId.includes('ERROR') || lotId.includes('ERROR')) {
        return fail('Side Dummy 조회 중 오류가 발생하였습니다.');
      }

      if (eventName === 'EQP') {
        if (eqpId.includes('EMPTY')) {
          return pass(sideDummyFixtures.eqpWithoutLot);
        }
        return pass(sideDummyFixtures.eqpWithLot);
      }

      if (eventName === 'LOT') {
        return pass(sideDummyFixtures.lotInfo);
      }

      return fail(`Unsupported EVENT_NAME: ${eventName}`);
    },

    SIDEDMMINSERT: ({ payload }) => {
      const eqpId = String(payload.EQPID || '');
      const lotId = String(payload.LOTNAME || '');

      if (eqpId.includes('FAIL') || lotId.includes('FAIL')) {
        return fail('Side Dummy 작업 처리에 실패하였습니다.');
      }

      return pass(sideDummyFixtures.insertSuccess);
    },
  };
}
