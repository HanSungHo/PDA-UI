import { remoteMeasMainFixtures } from '../data/fixtures.js';
import { fail, pass } from '../utils/response.js';

export function createRemoteMeasMainHandlers() {
  return {
    // RemoteMeasMainActivity.checkEqpType: XRFEQPTYPECHECK (EQPID) -> MSGBODY.ITEMS.ITEM[].
    XRFEQPTYPECHECK: ({ payload }) => {
      const eqpId = String(payload.EQPID || '').toUpperCase();

      if (eqpId.includes('FAIL')) return fail('장비 TYPE 조회에 실패하였습니다.');
      if (eqpId.includes('EMPTY')) return pass({ ITEMS: { ITEM: [] } });

      const item = remoteMeasMainFixtures.equipments[eqpId];
      if (!item) return fail(`${eqpId} 장비 정보가 없습니다.`);
      return pass({ ITEMS: { ITEM: [{ ...item }] } });
    },
  };
}
