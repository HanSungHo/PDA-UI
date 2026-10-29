import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createMachinePortHandler,
  createMaskInfoHandler,
  createMessageRegistry,
  createSetGasUsageHandler,
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

describe('ambiguous SetGasusage mock message routing', () => {
  it('routes EQPSPC confirmations to EQP SPC and other events to Recipe Interlock', () => {
    const calls = [];
    const handler = createSetGasUsageHandler(
      (context) => calls.push(['eqp-spc', context.payload.EVENT_TYPE]),
      (context) => calls.push(['recipe-interlock', context.payload.EVENT_TYPE]),
    );

    handler({ payload: { EVENT_TYPE: 'EQPSPC' } });
    handler({ payload: { EVENT_TYPE: 'RECIPE' } });
    handler({ payload: {} });

    assert.deepEqual(calls, [
      ['eqp-spc', 'EQPSPC'],
      ['recipe-interlock', 'RECIPE'],
      ['recipe-interlock', undefined],
    ]);
  });

  it('builds the full registry without duplicate handler errors', () => {
    const registry = createMessageRegistry({ addRecipeInterlock: () => {} });

    const status = (payload) => JSON.parse(registry.handle('SetGasusage', payload).result).STATUS;

    assert.equal(status({ EVENT_TYPE: 'EQPSPC', USER_CONFIRM: 'Y' }), 'PASS');
    assert.equal(status({ EVENT_TYPE: 'EQPSPC', USER_CONFIRM: 'N' }), 'FAIL');
    assert.equal(status({ EVENT_TYPE: 'RECIPE', EQPID: 'EQP-01' }), 'PASS');
    assert.equal(status({ EVENT_TYPE: 'RECIPE', EQPID: 'FAIL_EQP' }), 'FAIL');
  });
});

describe('ambiguous MASKINFO mock message routing', () => {
  it('routes reticles with eSheet mask rows to eSheet and the rest to Move In Inline', () => {
    const calls = [];
    const store = {
      getESheetMaskInfo: (reticleId) => (reticleId === 'RT-ESHEET' ? [{}] : undefined),
    };
    const handler = createMaskInfoHandler(
      (context) => calls.push(['move-in-inline', context.payload.RETICLEID]),
      (context) => calls.push(['esheet', context.payload.RETICLEID]),
      store,
    );

    handler({ payload: { RETICLEID: 'RT-ESHEET' } });
    handler({ payload: { RETICLEID: 'MT001' } });

    assert.deepEqual(calls, [
      ['esheet', 'RT-ESHEET'],
      ['move-in-inline', 'MT001'],
    ]);
  });
});
