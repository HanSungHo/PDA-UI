import { fail, pass } from '../utils/response.js';
export function createMaskLocationHandlers(store) {
  return {
    MASKINFO: ({ payload }) => {
      const mask = store.getMaskLocation(payload.RETICLEID);
      return mask ? pass(mask) : fail('MASK 정보를 찾을 수 없습니다.');
    },
    MASKSTATUSINFO: () => pass({ STATUSES: { ITEM: [{ STATUS: 'READY' }, { STATUS: 'EMPTY' }] } }),
    MASKLOCGROUPINFO: ({ payload }) =>
      pass({ LOCGROUPS: { ITEM: payload.STATUS === 'EMPTY' ? [] : [{ LOCGROUP: 'SHELF' }] } }),
    MASKLOCATIONINFO: ({ payload }) =>
      pass({
        LOCATIONS: {
          ITEM:
            payload.LOCGROUP === 'SHELF'
              ? [{ LOCATION: 'SHELF01' }, { LOCATION: 'N2BOX01' }, { LOCATION: 'BAD' }]
              : [],
        },
      }),
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
    CHANGEMASKLOCATION: ({ payload }) => store.changeMaskLocation(payload),
  };
}
