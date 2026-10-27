import { fail, pass } from '../utils/response.js';

/**
 * Handlers for PR_EMPTY (Pump Ready Empty) interlock confirmation.
 *
 * The Android legacy client calls:
 *   MessageFactoryUtil.intlkpopupcheck wrapped in MessageSender.send(..., MessageName.SETGASUSAGE)
 * which posts to:
 *   POST /hifos/SetGasusage  with AIFMSG MSGNAME: INTLKPOPUPCHECK
 *
 * The prempty screen identifies itself by sending EVENT_TYPE = 'PR_EMPTY'.
 * This handler is invoked from recipe-interlock.handlers.js when that field is present.
 */
export function createPremptyHandlers(store) {
  /**
   * Handle INTLKPOPUPCHECK when EVENT_TYPE === 'PR_EMPTY'.
   *
   * Expected payload fields (from prempty-interlock.service.ts):
   *   MASTERTIMESTAMP  – original alarm timestamp (YYYY/MM/DD_HH:mm:ss)
   *   EVENT_TYPE       – always 'PR_EMPTY'
   *   NOTICE_TYPE      – 'POP-UP'
   *   IP               – device name / IP
   *   CLIENT_TYPE      – 'PDA'
   *   HOSTNAME         – device name
   *   TARGET_URL       – 'NULL'
   *   USER_CONFIRM     – 'Y'
   *   USER_CONFIRM_ID  – operator ID
   *   USER_CONFIRM_TIME – confirmation timestamp (YYYY/MM/DD_HH:mm:ss)
   *   EQPID            – equipment ID
   *   RECIPE           – 'NULL'
   *   LOTID            – 'NULL'
   *   SLOT             – 'NULL'
   */
  function handlePremptyCheck(payload) {
    const eqpId = String(payload.EQPID || '').toUpperCase();

    // Simulate a failure scenario for test/dev: send EQPID containing 'FAIL_EQP'
    if (eqpId === 'FAIL_EQP') {
      return fail('PR_EMPTY interlock confirmation failed.');
    }

    // Persist the record so tests can inspect what was submitted
    if (store && typeof store.addPremptyConfirmation === 'function') {
      store.addPremptyConfirmation(payload);
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
    /**
     * Exported so recipe-interlock.handlers.js can delegate to this
     * when it detects EVENT_TYPE === 'PR_EMPTY'.
     */
    handlePremptyCheck,
  };
}
