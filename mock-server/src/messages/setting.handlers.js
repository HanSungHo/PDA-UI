import { fail, pass } from '../utils/response.js';

const CONFIG_FIELDS = ['FACILITY', 'AREA', 'BAY', 'DEVICENAME', 'IPADDR', 'USERID'];

function isBlank(value) {
  return typeof value !== 'string' || !value.trim();
}

function values(items) {
  return { ITEMS: items.map((VALUE) => ({ VALUE })) };
}

/** Legacy SettingActivity message contracts: CONFINFO, AREABAYINFO and CONFIG. */
export function createSettingHandlers(store) {
  return {
    CONFINFO: ({ payload }) => {
      if (payload.IDENTCODE === 'F') return pass(values(store.getSettingFacilities()));

      if (payload.IDENTCODE !== 'A') return fail('IDENTCODE is invalid.');
      if (payload.VALUE === 'FAIL-AREA') return fail('AREA DATA Empty!');
      return pass(values(store.getSettingAreas(payload.VALUE)));
    },
    CONFIG: ({ payload }) => {
      const missing = CONFIG_FIELDS.find((field) => isBlank(payload[field]));
      if (missing) return fail(`${missing} is required.`);
      if (payload.IPADDR === '0.0.0.0') return fail('CONFIG failed.');

      store.saveSettingConfig(
        Object.fromEntries(CONFIG_FIELDS.map((field) => [field, payload[field]])),
      );
      return pass({ CONFIG: 'OK' });
    },
  };
}
