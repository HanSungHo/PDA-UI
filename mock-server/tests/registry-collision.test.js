import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createMachinePortHandler,
  createMaskInfoHandler,
  createMessageRegistry,
} from '../src/messages/registry.js';

describe('ambiguous machine-port mock message routing', () => {
  it('routes status messages by EQPID and clear messages by MACHINENAME', () => {
    const calls = [];
    const store = {
      getRemoteCvdEquipment: (equipmentId) => (equipmentId.startsWith('CVD-') ? {} : undefined),
    };
    const remoteCvdHandler = (context) => calls.push(['cvd', context.payload]);
    const remoteMeasHandler = (context) => calls.push(['meas', context.payload]);

    const statusHandler = createMachinePortHandler(
      'MACHINEPORTSTATUS',
      remoteCvdHandler,
      remoteMeasHandler,
      store,
    );
    const clearHandler = createMachinePortHandler(
      'MACHINEPORTCLEAR',
      remoteCvdHandler,
      remoteMeasHandler,
      store,
    );

    statusHandler({ payload: { EQPID: 'CVD-MAIN-01', PORTNAME: '1' } });
    statusHandler({ payload: { EQPID: 'MMEQP-01', PORTNAME: 'PORT1' } });
    clearHandler({ payload: { MACHINENAME: 'CVD-MAIN-01', PORTNAME: '1' } });
    clearHandler({ payload: { MACHINENAME: 'MMEQP-01', PORTNAME: 'PORT1' } });

    assert.deepEqual(calls, [
      ['cvd', { EQPID: 'CVD-MAIN-01', PORTNAME: '1' }],
      ['meas', { EQPID: 'MMEQP-01', PORTNAME: 'PORT1' }],
      ['cvd', { MACHINENAME: 'CVD-MAIN-01', PORTNAME: '1' }],
      ['meas', { MACHINENAME: 'MMEQP-01', PORTNAME: 'PORT1' }],
    ]);
  });
});

describe('SetGasusage mock message routing', () => {
  it('builds the full registry without duplicate handler errors', () => {
    const registry = createMessageRegistry({
      addPremptyConfirmation: () => {},
      addRecipeInterlock: () => {},
    });

    const status = (payload) => JSON.parse(registry.handle('SetGasusage', payload).result).STATUS;

    assert.equal(status({ EVENT_TYPE: 'EQPSPC', USER_CONFIRM: 'Y' }), 'PASS');
    assert.equal(status({ EVENT_TYPE: 'EQPSPC', USER_CONFIRM: 'N' }), 'FAIL');
    assert.equal(status({ EVENT_TYPE: 'MDSSPC', USER_CONFIRM: 'Y' }), 'PASS');
    assert.equal(status({ EVENT_TYPE: 'RECIPE', EQPID: 'EQP-01' }), 'PASS');
    assert.equal(status({ EVENT_TYPE: 'RECIPE', EQPID: 'FAIL_EQP' }), 'FAIL');
    assert.equal(status({ EVENT_TYPE: 'PR_EMPTY', EQPID: 'EQP-PUMP-01' }), 'PASS');
  });
});

describe('ambiguous MASKINFO mock message routing', () => {
  it('routes ID_IDENT=T to eSheet or Move In Inline and the rest to Mask Location or eSheet', () => {
    const calls = [];
    const store = {
      getESheetMaskInfo: (reticleId) => (reticleId === 'RT-ESHEET' ? [{}] : undefined),
      getMaskLocation: (reticleId) => (reticleId === 'MASK01' ? {} : undefined),
    };
    const handler = createMaskInfoHandler(
      {
        moveInInline: (context) => calls.push(['move-in-inline', context.payload.RETICLEID]),
        esheet: (context) => calls.push(['esheet', context.payload.RETICLEID]),
        maskLocation: (context) => calls.push(['mask-location', context.payload.RETICLEID]),
      },
      store,
    );

    handler({ payload: { ID_IDENT: 'T', RETICLEID: 'RT-ESHEET' } });
    handler({ payload: { ID_IDENT: 'T', RETICLEID: 'MT001' } });
    // A Mask Location reticle with ID_IDENT=T still belongs to Move In Inline.
    handler({ payload: { ID_IDENT: 'T', RETICLEID: 'MASK01' } });
    handler({ payload: { RETICLEID: 'MASK01', FACILITY: 'GUMI' } });
    handler({ payload: { RETICLEID: 'RT-0001', FACILITY: 'GUMI' } });

    assert.deepEqual(calls, [
      ['esheet', 'RT-ESHEET'],
      ['move-in-inline', 'MT001'],
      ['move-in-inline', 'MASK01'],
      ['mask-location', 'MASK01'],
      ['esheet', 'RT-0001'],
    ]);
  });
});
