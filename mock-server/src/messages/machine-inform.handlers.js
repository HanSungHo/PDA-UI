import { fail, pass } from '../utils/response.js';

export function createMachineInformHandlers() {
  const key = (payload) =>
    `${payload.FACTORYNAME}|${payload.TYPE}|${String(payload.MACHINENAME || '').toUpperCase()}`;
  const valid = (payload) => ['MACHINE', 'PROCESS'].includes(payload.TYPE);
  return {
    GETMACHINEINFORM: ({ payload, store }) => {
      if (!valid(payload)) return fail('TYPE is invalid');
      return pass({ INFORM_CONTENT: store.getMachineInform(key(payload)) });
    },
    ADDMACHINEINFORM: ({ payload, store }) => {
      if (!valid(payload)) return fail('TYPE is invalid');
      store.setMachineInform(key(payload), String(payload.CONTENT ?? ''));
      return pass({ INFORM_CONTENT: store.getMachineInform(key(payload)) });
    },
  };
}
