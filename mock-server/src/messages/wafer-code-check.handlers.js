import { wafercodecheckFixtures } from '../data/fixtures.js';
import { fail, pass } from '../utils/response.js';

export function createWafercodecheckHandlers() {
  return {
    GETWAFERTYPE: ({ payload }) => {
      const lotName = String(payload.LOTNAME || '')
        .trim()
        .toUpperCase();
      if (!lotName) return fail(wafercodecheckFixtures.errors.lookup);

      const result = wafercodecheckFixtures.getByRunName[lotName];
      return result ? pass(result) : fail(wafercodecheckFixtures.errors.lookup);
    },
    COMPAREWAFERTYPE: ({ payload }) => {
      if (!payload.LOTNAME || !payload.WAFERTYPE) {
        return fail(wafercodecheckFixtures.errors.compare);
      }

      return pass(
        String(payload.LOTNAME).toUpperCase() === 'LOT-WAFER-NG-01'
          ? wafercodecheckFixtures.compareFailure
          : wafercodecheckFixtures.compareSuccess,
      );
    },
  };
}
