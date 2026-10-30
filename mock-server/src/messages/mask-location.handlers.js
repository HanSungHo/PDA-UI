import { fail, pass } from '../utils/response.js';

function items(list, field) {
  return { ITEM: list.map((value) => ({ [field]: value })) };
}

/**
 * Mask Location and Multi Mask Location share these messages, as in Android. MASKLOCATIONINFO
 * arrives on the masklocgroupinfo route and CHANGEMASKLOCATION on the checkpellicle route;
 * hifos.routes.js dispatches both by MSGNAME.
 */
export function createMaskLocationHandlers(store) {
  return {
    MASKINFO: ({ payload }) => {
      const mask = store.getMaskLocation(payload.RETICLEID);
      return mask ? pass(mask) : fail('MASK 정보를 찾을 수 없습니다.');
    },
    MASKSTATUSINFO: () => pass({ STATUSES: items(store.getMaskStatuses(), 'STATUS') }),
    MASKLOCGROUPINFO: ({ payload }) =>
      pass({ LOCGROUPS: items(store.getMaskLocationGroups(payload.STATUS), 'LOCGROUP') }),
    MASKLOCATIONINFO: ({ payload }) =>
      pass({ LOCATIONS: items(store.getMaskLocations(payload.LOCGROUP), 'LOCATION') }),
    CHECKMASKPMS: ({ payload }) => {
      const mask = store.getMaskLocation(payload.RETICLEID);
      if (!mask) return fail('MASK 정보를 찾을 수 없습니다.');
      return pass({
        CHECKPSMSHELF:
          mask.CUSTOMER === 'Y' && !String(payload.PMSSHELF).startsWith('N2BOX') ? 'N' : 'Y',
      });
    },
    CHECKPELLICLE: ({ payload }) => {
      if (!store.getMaskLocation(payload.RETICLEID)) return fail('MASK 정보를 찾을 수 없습니다.');
      return pass({ CHECKPELLICLE: payload.MACHINENAME === 'EQP01' ? 'Y' : 'N' });
    },
    CHANGEMASKLOCATION: ({ payload }) => {
      // MultiMaskLocationActivity sends LOCTYPE=MULTI; MaskLocationActivity sends its own types.
      if (payload.LOCTYPE !== 'MULTI') return store.changeMaskLocation(payload);
      const mask = store.changeMultiMaskLocation({
        reticleId: payload.RETICLEID,
        status: payload.ETCSTATUS,
        location: payload.ETCLOCATION,
      });
      return mask
        ? pass({ RETCILES: mask.RETICLETAG, SCOUNT: '1' })
        : fail(`${payload.RETICLEID} 위치 변경에 실패하였습니다.`);
    },
  };
}
