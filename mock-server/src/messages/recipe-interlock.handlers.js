import { fail, pass } from '../utils/response.js';
import { createPremptyHandlers } from './prempty.handlers.js';

/**
 * Handlers for Recipe Interlock confirmation:
 * Legacy calls: MessageFactoryUtil.intlkpopupcheck wrapped in MessageSender.send(..., MessageName.SETGASUSAGE)
 * The legacy SetGasusage route is dispatched by interlock-confirmation.handlers.js.
 *
 * When the payload contains EVENT_TYPE === 'PR_EMPTY', the request originates
 * from the prempty (Pump Ready Empty) screen and is delegated to prempty.handlers.js.
 */
export function handleRecipeInterlockConfirmation(store, payload) {
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

export function createRecipeInterlockHandlers(store) {
  const prempty = createPremptyHandlers(store);

  return {
    INTLKPOPUPCHECK: ({ payload }) => {
      // Delegate to prempty handler when this is a PR_EMPTY event
      if (String(payload.EVENT_TYPE || '').toUpperCase() === 'PR_EMPTY') {
        return prempty.handlePremptyCheck(payload);
      }
      return handleRecipeInterlockConfirmation(store, payload);
    },
  };
}
