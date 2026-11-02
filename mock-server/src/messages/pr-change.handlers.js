import { fail, pass } from '../utils/response.js';

const pad = (value) => String(value).padStart(2, '0');

/** yyyyMMddHHmmss, the TIME format echoed back by COMPAREPRINFO. */
function nowTime(date = new Date()) {
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

/**
 * Legacy calls: PRChangeActivity -> MessageFactoryUtil.pumpStatus / currentPrInfo / prInfo /
 * comparePrInfo / prChange. The legacy app posts PRCHANGE to the currentprinfo endpoint, so
 * the route layer dispatches that alias by AIFMSG MSGNAME.
 */
export function createPrChangeHandlers() {
  const upper = (value) => String(value ?? '').toUpperCase();

  function findPump(store, payload) {
    return store.getPrChangePump(payload.PUMPNAME || payload.PUMPID);
  }

  function checkCurrentPr(store, payload) {
    const pump = findPump(store, payload);
    if (!pump) return { error: '등록되지 않은 PUMP 입니다.' };
    if (String(payload.PRID ?? '') !== pump.PRID) {
      return { error: '현재 사용중인 PR과 일치하지 않습니다.' };
    }
    return { pump };
  }

  return {
    PUMPSTATUS: ({ payload, store }) => {
      const pump = store.getPrChangePump(payload.PUMPID);
      if (!pump) return fail('등록되지 않은 PUMP 입니다.');
      return pass(pump);
    },

    CURRENTPRINFO: ({ payload, store }) => {
      const { pump, error } = checkCurrentPr(store, payload);
      if (error) return fail(error);
      return pass({ PRID: pump.PRID });
    },

    PRINFO: ({ payload, store }) => {
      const pr = store.getPrChangePr(payload.PRID);
      if (!pr) return fail('등록되지 않은 PR 입니다.');
      return pass({ ...pr, TIME: nowTime() });
    },

    COMPAREPRINFO: ({ payload, store }) => {
      if (!String(payload.BANJANGID ?? '').trim()) return fail('사번을 입력해 주세요.');
      const { pump, error } = checkCurrentPr(store, payload);
      if (error) return fail(error);
      return pass({ PRID: pump.PRID });
    },

    PRCHANGE: ({ payload, store }) => {
      const pump = findPump(store, payload);
      if (!pump) return fail('등록되지 않은 PUMP 입니다.');
      const pr = store.getPrChangePr(payload.PRID);
      if (!pr) return fail('등록되지 않은 PR 입니다.');
      store.applyPrChange(pump.PUMPNAME, {
        ...pr,
        PRDESC: payload.PRDESC || pr.PRDESC,
        PRCOMP: payload.PRCOMP || pr.PRCOMP,
        USERID: payload.USERID,
        USERNAME: payload.USERNAME,
        LEAK: upper(payload.LEAK),
        INDATE: payload.INDATE,
        PRLOT: payload.PRLOT,
        VALIDTIME: payload.VALIDTIME,
      });
      return pass({});
    },
  };
}
