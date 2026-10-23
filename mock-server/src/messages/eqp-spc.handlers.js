import { fail, pass } from '../utils/response.js';

export function createEQPspcHandlers() {
  return {
    // EQPspcActivity uses SetGasusage as its HTTP message name even though
    // the AIFMSG envelope is INTLKPOPUPCHECK.
    SETGASUSAGE: ({ payload }) => {
      if (payload.EVENT_TYPE !== 'EQPSPC' || payload.USER_CONFIRM !== 'Y') {
        return fail('Invalid EQPSPC confirmation.');
      }
      return pass({});
    },
  };
}
