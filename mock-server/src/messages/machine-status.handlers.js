import { fail, pass } from '../utils/response.js';

/**
 * BAY list for an AREABAYINFO request carrying AREA/FACILITY. The message name is shared with
 * Move Out, Setting and Lot Status By Bay, so move-out.handlers.js registers it and delegates here.
 * - Blank AREA and FACILITY (unconfigured device, Machine Status): default BAYs.
 * - Location known to Setting: that location's BAYs.
 * - Otherwise: the shared bay list (Lot Status By Bay on an unconfigured mock location).
 */
export function areaBays(store, payload) {
  const blank = !String(payload.AREA ?? '').trim() && !String(payload.FACILITY ?? '').trim();
  if (blank) return store.getMachineStatusBays(payload.AREA, payload.FACILITY);
  return store.hasSettingLocation(payload.AREA, payload.FACILITY)
    ? store.getSettingBays(payload.AREA, payload.FACILITY)
    : store.getBays();
}

/** Legacy MachineStatusActivity contract: BAYEQPINFO (AREABAYINFO is delegated from move-out.handlers.js). */
export function createMachineStatusHandlers(store) {
  return {
    BAYEQPINFO: ({ payload }) => {
      const bay = String(payload.BAYID || '');
      if (bay.includes('FAIL')) return fail('EQP DATA Empty!');
      return pass({
        EQPITEMS: { ITEM: store.getMachineStatusEqpItems(bay) },
      });
    },
  };
}
