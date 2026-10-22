import { fail, pass } from '../utils/response.js';

function indexedBody(prefix, values) {
  return Object.fromEntries(values.map((value, index) => [`${prefix}${index}`, value]));
}

export function createMoveOutHandlers(store) {
  return {
    LOTINFO: ({ payload }) => {
      const lot = store.getLot(payload.LOTID);
      if (lot?.TYPEVALUES) {
        lot.TYPEVALUES = lot.TYPEVALUES.map((item) => ({
          ...item,
          typeValue: item.typeValue || item.TYPEVALUE || '',
        }));
      }
      return lot ? pass(lot) : fail('LOT 정보를 찾을 수 없습니다.');
    },
    AREABAYINFO: ({ payload }) => {
      // activity_setting.xml requests BAYS for a selected AREA/FACILITY pair.
      if ('AREA' in payload && 'FACILITY' in payload) {
        if (payload.AREA === 'FAIL-BAY') return fail('BAY DATA Empty!');
        return pass({
          BAYS: store.getSettingBays(payload.AREA, payload.FACILITY).map((BAY) => ({ BAY })),
        });
      }

      return pass(indexedBody('BAY', store.getBays()));
    },
    BAYSTOCKERINFO: ({ payload }) => pass(indexedBody('STOCKER', store.getStockers(payload.BAY))),
    LOGINUSERCHECK: () => pass({ AREACHECK: 'Y' }),
    MOVEOUT: ({ payload }) => {
      if (String(payload.LOTID || '').includes('FAIL'))
        return fail(`${payload.LOTID} MOVE OUT failed.`);
      store.moveOutLot(payload.LOTID);
      return pass({ TANPI: '', SAMPLERESULT: '' });
    },
    FQCSAMPLING: () =>
      pass({ CYCLECOMMENT: '', RECIPECOMMENT: '', DELETECODE: '', UPDATECODE: '' }),
    SLOTINFO: () => pass({ WAFERLIST: '1,2,3', QUANTITY: '3', CHECKETCH: 'N' }),
    SLOTPARTICLE: ({ payload }) =>
      pass({ ITEMS: { ITEM: store.getLot(payload.LOTID)?.SLOTPARTICLE_ITEMS || [] } }),
    UPDATESKIPWAFER: ({ payload }) => {
      store.updateSkipWafer(payload.LOTID);
      return pass({ UPDATEFLAG: 'Y' });
    },
    PROBECARDSET: () => pass({}),
    DUMMYEQPINFO: ({ payload }) => pass(store.getDummyEqpInfo(payload.EQPID)),
    LOTLSATEVENT: ({ payload }) => pass(store.getLotLastEvent(payload.LOTNAME)),
    DUMMYEQPINPUT: ({ payload }) =>
      pass({
        LOTCOMMENT:
          payload.CATEGORY === 'COUNT'
            ? `COUNT:${payload.LOTLASTEVENT || ''}`
            : payload.LOTLASTEVENT || '',
        MSG: '',
      }),
  };
}
