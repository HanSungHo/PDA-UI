import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createInterlockConfirmationHandlers } from '../src/messages/interlock-confirmation.handlers.js';
import { createMDSSpcHandlers } from '../src/messages/mds-spc.handlers.js';
import { createRecipeInterlockHandlers } from '../src/messages/recipe-interlock.handlers.js';

describe('MDS SPC mock handlers', () => {
  it('provides a DESCRIPTION option list through MDSCONTENT', () => {
    const response = createMDSSpcHandlers().MDSCONTENT({ payload: {} });
    const result = JSON.parse(response.result);

    assert.equal(response.statusCode, 200);
    assert.equal(result.STATUS, 'PASS');
    assert.equal(result.MSGBODY.DESCRIPTION.split('|').length, 13);
  });

  it('accepts MDSINSERT and returns no screen-specific success behavior', () => {
    const response = createMDSSpcHandlers().MDSINSERT({
      payload: { INSPECT_COMMENT: 'Inspection', ACT_COMMENT: 'Action' },
    });
    const result = JSON.parse(response.result);

    assert.equal(response.statusCode, 200);
    assert.equal(result.STATUS, 'PASS');
    assert.deepEqual(result.MSGBODY, { RESULT: 'OK' });
  });

  it('accepts MDSSPC confirmation on the legacy SetGasusage message', () => {
    const response = createInterlockConfirmationHandlers({}).SETGASUSAGE({
      payload: { EVENT_TYPE: 'MDSSPC', USER_CONFIRM: 'Y' },
    });

    assert.equal(JSON.parse(response.result).STATUS, 'PASS');
  });

  it('preserves EQPSPC confirmation handling on SetGasusage', () => {
    const response = createInterlockConfirmationHandlers({}).SETGASUSAGE({
      payload: { EVENT_TYPE: 'EQPSPC', USER_CONFIRM: 'Y' },
    });

    assert.equal(JSON.parse(response.result).STATUS, 'PASS');
    assert.deepEqual(JSON.parse(response.result).MSGBODY, {});
  });

  it('preserves the Recipe interlock response and store update', () => {
    const addedPayload = [];
    const store = { addRecipeInterlock: (payload) => addedPayload.push(payload) };
    const payload = { EVENT_TYPE: 'RECIPE', USER_CONFIRM: 'Y', EQPID: 'EQP-01' };
    const result = createInterlockConfirmationHandlers(store).SETGASUSAGE({ payload });

    assert.equal(JSON.parse(result.result).STATUS, 'PASS');
    assert.deepEqual(addedPayload, [payload]);
  });

  it('delegates PR_EMPTY confirmation on SetGasusage to the prempty handler', () => {
    const confirmations = [];
    const store = { addPremptyConfirmation: (payload) => confirmations.push(payload) };
    const payload = { EVENT_TYPE: 'PR_EMPTY', USER_CONFIRM: 'Y', EQPID: 'EQP-PUMP-01' };
    const response = createInterlockConfirmationHandlers(store).SETGASUSAGE({ payload });

    assert.equal(JSON.parse(response.result).STATUS, 'PASS');
    assert.deepEqual(confirmations, [payload]);
  });

  it('keeps Recipe interlock message handling available on its original message name', () => {
    const payload = { EVENT_TYPE: 'RECIPE', USER_CONFIRM: 'Y', EQPID: 'EQP-01' };
    const response = createRecipeInterlockHandlers({}).INTLKPOPUPCHECK({ payload });

    assert.equal(JSON.parse(response.result).STATUS, 'PASS');
  });
});
