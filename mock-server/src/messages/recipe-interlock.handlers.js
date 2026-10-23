import { fail, pass } from '../utils/response.js';

/**
 * Handlers for Recipe Interlock confirmation:
 * Legacy calls: MessageFactoryUtil.intlkpopupcheck wrapped in MessageSender.send(..., MessageName.SETGASUSAGE)
 * Route: POST /hifos/SetGasusage with AIFMSG MSGNAME: INTLKPOPUPCHECK
 */
export function createRecipeInterlockHandlers(store) {
  function handleCheck(payload) {
    if (String(payload.EQPID || '').toUpperCase() === 'FAIL_EQP') {
      return fail('Recipe interlock confirmation failed.');
    }

    if (store && typeof store.addRecipeInterlock === 'function') {
      store.addRecipeInterlock(payload);
    }

    return pass({
      RESULT: 'OK',
      STATUS: 'PASS',
      MSGBODY: {
        RESULT: 'OK',
      },
    });
  }

  return {
    INTLKPOPUPCHECK: ({ payload }) => handleCheck(payload),
    SETGASUSAGE: ({ payload }) => handleCheck(payload),
  };
}
