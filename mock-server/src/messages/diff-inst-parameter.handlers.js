import { fail, pass } from '../utils/response.js';

export function createDiffInstParameterHandlers(store) {
  return {
    DIFFEQPDATAINFO: ({ payload }) => {
      const data = store.getDiffLot(payload.LOTID);
      return data ? pass(data) : fail('LOT 정보를 찾을 수 없습니다.');
    },
    GETEQPPARA: ({ payload }) => {
      const rows = store.getDiffParameters(payload.MACHINE || payload.MACHINENAME);
      if (rows.length === 0) return pass({ GETDATE: 'N', EQPDATA: [] });
      return pass({ GETDATE: 'Y', EQPDATA: rows });
    },
    INSERTPARA: ({ payload }) => {
      store.setDiffParameterValues(payload.MACHINENAME, payload.EQPPARA);
      return pass({ MACHIHNESTATE: '' });
    },
  };
}
