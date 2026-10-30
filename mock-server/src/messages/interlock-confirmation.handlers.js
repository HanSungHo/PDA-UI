import { fail, pass } from '../utils/response.js';
import { createPremptyHandlers } from './prempty.handlers.js';
import { handleRecipeInterlockConfirmation } from './recipe-interlock.handlers.js';

export function createInterlockConfirmationHandlers(store) {
  const prempty = createPremptyHandlers(store);

  return {
    SETGASUSAGE: ({ payload }) => {
      if (payload.EVENT_TYPE === 'RECIPE') {
        return handleRecipeInterlockConfirmation(store, payload);
      }

      if (payload.EVENT_TYPE === 'PR_EMPTY') {
        return prempty.handlePremptyCheck(payload);
      }

      if (payload.EVENT_TYPE === 'EQPSPC' || payload.EVENT_TYPE === 'MDSSPC') {
        if (payload.USER_CONFIRM !== 'Y') {
          return fail(`Invalid ${payload.EVENT_TYPE} confirmation.`);
        }
        return pass({});
      }

      return fail('Unsupported interlock confirmation.');
    },
  };
}
