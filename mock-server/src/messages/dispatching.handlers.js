import { fail, pass } from '../utils/response.js';

function lotNames(reserveItem) {
  return [...String(reserveItem || '').matchAll(/<LOTNAME>([^<]+)<\/LOTNAME>/g)].map(
    ([, lotName]) => lotName,
  );
}

export function createDispatchingHandlers(store) {
  return {
    GETDISPATCH: ({ payload }) => {
      if (!String(payload.RTD || '').trim()) return fail('Machine을 입력해주세요');
      const dispatching = store.getDispatching(payload.RTD);
      if (!dispatching) return fail('조회 결과가 없습니다.');
      return pass({
        RESERVELOT: dispatching.rows.filter((row) => row.RESERVE === 'Y'),
        DISPLOT: dispatching.rows.filter((row) => row.RESERVE !== 'Y'),
        HIDE: dispatching.hide,
      });
    },
    SETDISPATCH: ({ payload }) => {
      const reserve = payload.RESERVE;
      if (reserve !== 'Y' && reserve !== 'N') return fail('예약 정보가 올바르지 않습니다.');
      const lots = lotNames(payload.RESERVEITEM);
      if (!lots.length) return fail('선택된 예약 해제 LOT이 없습니다.');
      if (!store.setDispatchingReservation(payload.MACHINE, lots, reserve)) {
        return fail('장비명이 확인 되지 않습니다.');
      }
      return pass({});
    },
  };
}
