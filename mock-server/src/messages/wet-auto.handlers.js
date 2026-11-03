import { fail, pass } from '../utils/response.js';

export function createWetAutoHandlers(store) {
  return {
    WETREMOTEEQPINFO: ({ payload }) => {
      const equipment = store.getWetAutoEquipment(payload.EQPID);
      return equipment ? pass(equipment) : fail('유효하지 않은 장비입니다.');
    },
    WETREMOTESTART: ({ payload }) =>
      store.shouldFailWetAutoStart(payload.MACHINENAME2)
        ? fail('WET Remote Start mock 오류')
        : pass({ RESULT: 'OK' }),
  };
}
