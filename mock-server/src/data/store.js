import {
  batchFixtures,
  bayFixtures,
  commentFixtures,
  diffFixtures,
  lotFixtures,
  rcpFixtures,
  waferSelectFixtures,
  xmlFixtures,
} from './fixtures.js';

const baseLot = lotFixtures['LOT-DEMO-01'];

function clone(value) {
  return structuredClone(value);
}

function normalizeLots() {
  return Object.fromEntries(
    Object.entries(lotFixtures).map(([lotId, lot]) => [
      lotId,
      { ...baseLot, ...lot, LOTID: lotId },
    ]),
  );
}

export function createStore() {
  let state = {
    lots: normalizeLots(),
    batches: clone(batchFixtures),
    comments: clone(commentFixtures),
    diff: clone(diffFixtures),
    rcp: clone(rcpFixtures),
    waferSelect: clone(waferSelectFixtures),
    xml: clone(xmlFixtures),
    bays: clone(bayFixtures.bays),
    stockersByBay: clone(bayFixtures.stockersByBay),
  };

  return {
    reset() {
      state = {
        lots: normalizeLots(),
        batches: clone(batchFixtures),
        comments: clone(commentFixtures),
        diff: clone(diffFixtures),
        rcp: clone(rcpFixtures),
        waferSelect: clone(waferSelectFixtures),
        xml: clone(xmlFixtures),
        bays: clone(bayFixtures.bays),
        stockersByBay: clone(bayFixtures.stockersByBay),
      };
    },
    getLot(lotId) {
      return clone(
        state.lots[
          String(lotId || '')
            .trim()
            .toUpperCase()
        ],
      );
    },
    updateLot(lotId, patch) {
      const key = String(lotId || '')
        .trim()
        .toUpperCase();
      state.lots[key] = { ...state.lots[key], ...patch };
      return clone(state.lots[key]);
    },
    getBays() {
      return clone(state.bays);
    },
    getStockers(bay) {
      return clone(state.stockersByBay[bay] || []);
    },
    getBatch(batchId) {
      return clone(
        state.batches[
          String(batchId || '')
            .trim()
            .toUpperCase()
        ],
      );
    },
    getBatchByLot(lotId) {
      const key = String(lotId || '')
        .trim()
        .toUpperCase();
      return clone(
        Object.values(state.batches).find((batch) =>
          batch.items.some((item) => item.lotId === key),
        ),
      );
    },
    moveOutLot(lotId) {
      const key = String(lotId || '')
        .trim()
        .toUpperCase();
      if (state.lots[key]) {
        state.lots[key] = { ...state.lots[key], STATUS: 'WAIT' };
      }
      for (const batch of Object.values(state.batches)) {
        const item = batch.items.find((row) => row.lotId === key);
        if (item) {
          item.status = 'WAIT';
          item.errorMessage = '';
        }
      }
    },
    updateSkipWafer(lotId) {
      const key = String(lotId || '')
        .trim()
        .toUpperCase();
      if (state.lots[key]) {
        state.lots[key] = { ...state.lots[key], CHECKSKIPWAFER: 'Y' };
      }
    },
    getComments(lotId) {
      const key = String(lotId || '')
        .trim()
        .toUpperCase();
      return clone(state.comments.filter((comment) => !key || comment.lotId === key));
    },
    getComment(lotId, commentNo) {
      const key = String(lotId || '')
        .trim()
        .toUpperCase();
      return clone(
        state.comments.find((comment) => comment.lotId === key && comment.no === String(commentNo)),
      );
    },
    markCommentRead(lotId, commentNo, reader) {
      const key = String(lotId || '')
        .trim()
        .toUpperCase();
      const comment = state.comments.find(
        (row) => row.lotId === key && row.no === String(commentNo),
      );
      if (comment) {
        comment.isCheck = true;
        comment.reader = reader || '';
        comment.readTime = '2026-09-25 09:30:00';
      }
    },
    getDiffLot(lotId) {
      return clone(
        state.diff.lots[
          String(lotId || '')
            .trim()
            .toUpperCase()
        ],
      );
    },
    getDiffParameters(machineName) {
      return clone(
        state.diff.parametersByMachine[
          String(machineName || '')
            .trim()
            .toUpperCase()
        ] || [],
      );
    },
    setDiffParameterValues(machineName, eqpPara) {
      const key = String(machineName || '')
        .trim()
        .toUpperCase();
      const values = String(eqpPara || '').split('|');
      const rows = state.diff.parametersByMachine[key] || [];
      rows.forEach((row, index) => {
        row.DATA = values[index] || row.DATA || '';
      });
    },
    getRcpRecipe(lotId) {
      return clone(
        state.rcp.recipesByLot[
          String(lotId || '')
            .trim()
            .toUpperCase()
        ],
      );
    },
    getRcpInspection(lotId) {
      return clone(
        state.rcp.inspectionByLot[
          String(lotId || '')
            .trim()
            .toUpperCase()
        ],
      );
    },
    getDummyEqpInfo(eqpId) {
      const key = String(eqpId || '')
        .trim()
        .toUpperCase();
      return clone(state.waferSelect.dummyEqpInfoByEqp[key] || { EQPID: key });
    },
    getLotLastEvent(lotId) {
      const key = String(lotId || '')
        .trim()
        .toUpperCase();
      return clone(
        state.waferSelect.lotLastEventByLot[key] || {
          CREATECATEGORY: 'SLOT',
          LASTEVENTCOMMENT: '',
        },
      );
    },
    getXmlFixtures() {
      return clone(state.xml);
    },
  };
}
