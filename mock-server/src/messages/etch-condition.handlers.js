import { etchConditionFixtures } from '../data/fixtures.js';
import { fail, pass } from '../utils/response.js';

const list = (rows) => ({ ITEM: rows });

export function createEtchConditionHandlers() {
  return {
    // ETCHActivity posts AIFMSG ETCH_COMMRCPFROMB (LOTID, CHKEQPID) to /hifos/etchcommrcpfromb;
    // the registry is keyed by the route name.
    ETCHCOMMRCPFROMB: ({ payload }) => {
      const lotId = String(payload.LOTID || '').toUpperCase();
      const machine = String(payload.CHKEQPID || '');

      if (lotId.includes('ERROR')) return fail('LOT 정보가 없습니다.');

      if (lotId.includes('TE8500')) {
        return pass({
          ...etchConditionFixtures.te8500,
          COMMRCP: list(etchConditionFixtures.te8500Rows),
        });
      }

      const chamberRows = etchConditionFixtures.chamberRows.map((row) => ({
        ...row,
        CHKCHK: machine ? row.CHKCHK : '',
      }));

      if (lotId.includes('EMPTY')) {
        return pass({ ...etchConditionFixtures.dpsPoly, COMMRCP: '' });
      }
      if (lotId.includes('OTHER')) {
        return pass({
          ...etchConditionFixtures.dpsPoly,
          PROCESS_TYPE: 'OTHER',
          COMMRCP: list(chamberRows),
        });
      }
      if (lotId.includes('EMAX')) {
        return pass({ ...etchConditionFixtures.emaxCt, COMMRCP: list(chamberRows) });
      }
      return pass({
        ...etchConditionFixtures.dpsPoly,
        HMEEN: lotId.includes('EEN') ? 'EEN 적용 LOT입니다.' : '',
        COMMRCP: list(chamberRows),
      });
    },
  };
}
