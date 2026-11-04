import { fail, pass } from '../utils/response.js';

/**
 * Handlers for Remote XRF Recipe Set screen.
 * Messages: XRFITEMINFO, XRFEQPINFO, XRFCATEGORYINFO, XRFSAMPLEINFO, XRFPARAINFO, XRFRECIPEINFO
 *
 * All payloads sent as AIF XML (postAifMessage), parsed by server.
 * Response MSGBODY: { BAYS: { ITEM: [ { BAY: string, CONTEXT01?: string } ] } }
 * When only one result, server may return ITEM as a single object instead of array.
 *
 * Test helpers:
 *  - FACILITY='FAB1-FAIL' → FAIL on XRFITEMINFO
 *  - ITEM='ITEM-EMPTY'    → empty BAYS list
 *  - ITEM='ITEM-FAIL'     → FAIL on any sub-query
 *  - EQPID with 'THICK'   → CONTEXT01='Y' in XRFRECIPEINFO (shows thick field)
 */
export function createRemoteXrfRecipeHandlers(store) {
  return {
    XRFITEMINFO: ({ payload }) => {
      const facility = String(payload.FACILITY || '').toUpperCase();
      const area = String(payload.AREA || '').toUpperCase();

      if (facility.includes('FAIL')) {
        return fail('XRF ITEM 정보를 조회할 수 없습니다.');
      }

      const items = store.getXrfItems(facility, area);
      return pass({ BAYS: { ITEM: items } });
    },

    XRFEQPINFO: ({ payload }) => {
      const item = String(payload.ITEM || '');

      if (!item) return fail('ITEM 정보가 없습니다.');
      if (item.includes('FAIL')) return fail('XRF EQP 정보를 조회할 수 없습니다.');
      if (item === 'ITEM-EMPTY') return pass({ BAYS: { ITEM: [] } });

      const eqps = store.getXrfEqps(item);
      return pass({ BAYS: { ITEM: eqps } });
    },

    XRFCATEGORYINFO: ({ payload }) => {
      const item = String(payload.ITEM || '');
      const eqpId = String(payload.PRODEQP || payload.EQPID || '');

      if (!item || !eqpId) return fail('ITEM/PRODEQP 정보가 없습니다.');
      if (item.includes('FAIL') || eqpId.includes('FAIL')) {
        return fail('XRF CATEGORY 정보를 조회할 수 없습니다.');
      }

      const categories = store.getXrfCategories(item, eqpId);
      return pass({ BAYS: { ITEM: categories } });
    },

    XRFSAMPLEINFO: ({ payload }) => {
      const item = String(payload.ITEM || '');
      const eqpId = String(payload.PRODEQP || payload.EQPID || '');
      const category = String(payload.CATEGORY || '');

      if (!item || !eqpId || !category) return fail('필수 정보가 없습니다.');
      if (item.includes('FAIL') || eqpId.includes('FAIL')) {
        return fail('XRF SAMPLE 정보를 조회할 수 없습니다.');
      }

      const samples = store.getXrfSamples(item, eqpId, category);
      return pass({ BAYS: { ITEM: samples } });
    },

    XRFPARAINFO: ({ payload }) => {
      const item = String(payload.ITEM || '');
      const eqpId = String(payload.PRODEQP || payload.EQPID || '');
      const category = String(payload.CATEGORY || '');
      const sample = String(payload.SAMPLE || '');

      if (!item || !eqpId || !category || !sample) return fail('필수 정보가 없습니다.');
      if (item.includes('FAIL')) return fail('XRF PARA 정보를 조회할 수 없습니다.');

      const paras = store.getXrfParas(item, eqpId, category, sample);
      return pass({ BAYS: { ITEM: paras } });
    },

    XRFRECIPEINFO: ({ payload }) => {
      const item = String(payload.ITEM || '');
      const eqpId = String(payload.PRODEQP || payload.EQPID || '');
      const category = String(payload.CATEGORY || '');
      const sample = String(payload.SAMPLE || '');
      const para = String(payload.PARAMETER || payload.PARA || '');

      if (!item || !eqpId || !category || !sample || !para) return fail('필수 정보가 없습니다.');
      if (item.includes('FAIL')) return fail('XRF RECIPE 정보를 조회할 수 없습니다.');

      const recipe = store.getXrfRecipe(item, eqpId, category, sample, para);
      if (!recipe) return fail('조회된 RECIPE 정보가 없습니다.');

      return pass({ BAYS: { ITEM: [recipe] } });
    },
  };
}
