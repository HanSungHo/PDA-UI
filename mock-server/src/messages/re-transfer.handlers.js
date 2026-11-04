import { reTransferFixtures } from '../data/fixtures.js';
import { fail, pass } from '../utils/response.js';

export function createReTransferHandlers() {
  return {
    CARRYINFO: ({ payload }) => {
      const lotId = String(payload.LOTID || '');
      if (lotId.includes('ERROR') || lotId.includes('FAIL')) {
        return fail('CARRYINFO 조회 중 오류가 발생하였습니다.');
      }
      if (lotId === 'NOSTK') {
        return pass(reTransferFixtures.carryInfoNoStk);
      }
      return pass(reTransferFixtures.carryInfoDefault);
    },

    FABBAYINFO: ({ payload }) => {
      const fab = String(payload.FAB || '');
      if (fab.includes('ERROR')) {
        return fail('FABBAYINFO 조회 중 오류가 발생하였습니다.');
      }
      return pass(reTransferFixtures.fabBayInfo);
    },

    PDALIST: ({ payload }) => {
      const bay = String(payload.BAY || '');
      if (bay.includes('ERROR')) {
        return fail('PDALIST 조회 중 오류가 발생하였습니다.');
      }
      return pass(reTransferFixtures.pdaList);
    },

    CARRY: ({ payload }) => {
      const lotId = String(payload.LOTID || '');
      if (lotId.includes('FAIL') || lotId.includes('ERROR')) {
        return fail('반송 처리에 실패하였습니다.');
      }
      return pass({});
    },
  };
}
