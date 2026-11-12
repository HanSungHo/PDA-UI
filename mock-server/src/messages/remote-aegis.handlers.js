import { fail, pass } from '../utils/response.js';

export function createRemoteAegisHandlers(store) {
  return {
    AEGISLOTINFO: ({ payload }) => {
      const lotId = String(payload.LOTID || '').trim();
      const machine = String(payload.MACHINE || '').trim();

      if (!machine) {
        return fail('장비명을 입력하여 주세요.');
      }

      const lot = store.getRemoteAegisLot?.(lotId);
      if (lot) {
        return pass({
          ITEMS: {
            ITEM: lot,
          },
        });
      }

      if (lotId === 'FAIL') {
        return fail('LOT 정보를 찾을 수 없습니다.');
      }

      if (lotId === 'EMPTY') {
        return pass('');
      }

      // Default mock LOT item
      return pass({
        ITEMS: {
          ITEM: {
            LOTHOLDSTATE: 'NotOnHold',
            LOTPROCESSSTATE: 'WAIT',
            JOBCODE: 'JOB01',
            PRODUCTQUANTITY: '25',
            OPERDESC: 'PARTICLE TEST',
            OPERCODE: 'OP1-SUB1',
            PRODUCTSPECNAME: 'SPEC-AEGIS',
            RECIPE: 'RCP-AEGIS-01',
            MACHINENAME: machine || 'AEGIS01',
            FAB: 'FAB2',
            ENGINEERNAME: 'ENG01',
            OWNERCODE: 'OWN01',
            SAFELAUNCHLOT: 'Y',
            INLINESAMPLEMESSGE: 'SAMPLE NOTICE',
          },
        },
      });
    },

    AEGISMODECHANGE: ({ payload }) => {
      const mode = String(payload.MODE || '')
        .trim()
        .toUpperCase();
      if (mode !== 'LOCAL' && mode !== 'REMOTE') {
        return fail('유효하지 않은 모드입니다.');
      }
      return pass({});
    },

    AEGISREMOTESTART: ({ payload }) => {
      const runNo = String(payload.RUN_NO || '').trim();
      if (runNo.includes('FAIL')) {
        return fail('START 명령 전송 실패');
      }
      return pass({});
    },
  };
}
