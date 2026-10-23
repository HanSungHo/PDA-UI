import { fail, pass } from '../utils/response.js';

/**
 * Remote IMP Batch screen — unique messages not covered by shared handlers.
 *
 * Shared messages handled elsewhere:
 *   LOTINFO       → move-out.handlers.js  (same store, same data shape)
 *   AREABAYINFO   → move-out.handlers.js
 *   BAYSTOCKERINFO→ move-out.handlers.js
 *   MEMORIZATION  → remote-cvd.handlers.js (bi-modal: IMP path when AREA==='IMP')
 *   RECIPEINFO    → remote-cvd.handlers.js (bi-modal: IMP path when CHAMBERYN field present)
 *
 * Handler convention:
 *   handler({ payload, store })  →  pass(msgBody)  |  fail(errorMessage)
 */
export function createRemoteImpBatchHandlers(store) {
  function pick(payload, ...keys) {
    for (const key of keys) {
      const v = payload[key] ?? payload[key.toLowerCase()];
      if (v !== undefined && v !== null) return String(v).trim();
    }
    return '';
  }

  return {
    // ── IMPBATCHREMOTESTART ───────────────────────────────────────────────────
    // Legacy: MessageFactoryUtil.impBatchRemoteStart(15 params)
    // Called by execute() after all validations pass.
    // Persists to store: sets STATUS='RUN', BATCHID on both LOTs, records history.
    IMPBATCHREMOTESTART: ({ payload }) => {
      const lot1 = pick(payload, 'LOTNAME1');
      const lot2 = pick(payload, 'LOTNAME2');
      const machine = pick(payload, 'MACHINENAME', 'EQPID');
      const recipe = pick(payload, 'RECIPENAME', 'RECIPE');
      const isCarry = pick(payload, 'ISCARRY') || 'N';
      const bay = pick(payload, 'BAY');
      const stocker = pick(payload, 'STOCKER');

      // Mirror frontend validations — legacy server also enforces these
      if (!machine) return fail('진행장비를 입력하세요.');
      if (!recipe) return fail('진행Rcp가 조회되지 않았습니다.');
      if (!lot1 || !lot2) return fail('진행할 LOT을 다시 조회 바랍니다.');
      if (lot1 === lot2) {
        return fail('동일 LOT으로 조회가 불가합니다.\nLOTNAME을 다시 확인해 주시기 바랍니다.');
      }
      if (isCarry === 'Y') {
        if (!bay) return fail('BAY를 선택하세요.');
        if (!stocker) return fail('STOCKER를 선택하세요.');
      }

      // Update LOT state in store and record execution history
      const result = store.executeImpBatchRemoteStart({
        LOTNAME1: lot1,
        LOTNAME2: lot2,
        MACHINENAME: machine,
        RECIPENAME: recipe,
        ISCARRY: isCarry,
        BAY: bay,
        STOCKER: stocker,
        EVENTUSER: pick(payload, 'EVENTUSER') || 'ENGINEER',
        PRODUCTNAME1: pick(payload, 'PRODUCTNAME1'),
        PRODUCTNAME2: pick(payload, 'PRODUCTNAME2'),
        OPERATION1: pick(payload, 'OPERATION1'),
        OPERATION2: pick(payload, 'OPERATION2'),
        JOBCODE1: pick(payload, 'JOBCODE1'),
        JOBCODE2: pick(payload, 'JOBCODE2'),
      });

      return pass({ BATCHID: result.batchId, RESULT: 'PASS' });
    },
  };
}
