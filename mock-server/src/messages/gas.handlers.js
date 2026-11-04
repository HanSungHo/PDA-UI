import { gasFixtures } from '../data/fixtures.js';
import { fail, pass } from '../utils/response.js';

function normalizeCabinet(value) {
  return String(value || '')
    .trim()
    .toUpperCase();
}

export function handleGetCabinetInfo(store, { payload }) {
  store.addGasRequest({ MSGNAME: 'GETCABINETINFO', ...payload });
  const cabinet = gasFixtures.cabinets[normalizeCabinet(payload.CABINETNAME)];
  return cabinet ? pass(cabinet) : fail(gasFixtures.errors.lookup);
}

// SETGASUSAGE is dispatched here from interlock-confirmation.handlers.js when the payload has
// CABINETNAME and no EVENT_TYPE, so the registry keeps a single owner for the message name.
export function handleSetGasUsage(store, { payload }) {
  store.addGasRequest({ MSGNAME: 'SETGASUSAGE', ...payload });
  const cabinet = normalizeCabinet(payload.CABINETNAME);
  if (!gasFixtures.cabinets[cabinet] || !payload.USERID || !payload.PRESSURE) {
    return fail(gasFixtures.errors.save);
  }
  return pass({ CABINETNAME: cabinet });
}

export function createGasHandlers(store) {
  return { GETCABINETINFO: (context) => handleGetCabinetInfo(store, context) };
}
