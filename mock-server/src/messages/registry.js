import { createMaskLocationHandlers } from './mask-location.handlers.js';
import { createActivityMainHandlers } from './activity-main.handlers.js';
import { createBatchHandlers } from './batch.handlers.js';
import { createAutoMergeHandlers } from './auto-merge.handlers.js';
import { createChatListHandlers } from './chat-list.handlers.js';
import { createCommentHandlers } from './comment.handlers.js';
import { createDiffInstParameterHandlers } from './diff-inst-parameter.handlers.js';
import { createDispatchingHandlers } from './dispatching.handlers.js';
import { createEENModifyHandlers } from './een-modify.handlers.js';
import { createESheetEdcHandlers } from './esheet-edc.handlers.js';
import { createESheetHandlers } from './esheet.handlers.js';
import { createEtchConditionHandlers } from './etch-condition.handlers.js';
import { createInterlockConfirmationHandlers } from './interlock-confirmation.handlers.js';
import { createMDSSpcHandlers } from './mds-spc.handlers.js';
import { createMoveOutHandlers } from './move-out.handlers.js';
import { createMachineInformHandlers } from './machine-inform.handlers.js';
import { createMoveInInlineHandlers } from './move-in-inline.handlers.js';
import { createRcpInquireHandlers } from './rcp-inquire.handlers.js';
import { createRemoteMeasHandlers } from './remote-meas.handlers.js';
import { createRemoteCvdHandlers } from './remote-cvd.handlers.js';
import { createRemoteImpBatchHandlers } from './remote-imp-batch.handlers.js';
import { createSettingHandlers } from './setting.handlers.js';
import { createSampleReleaseHandlers } from './sample-release.handlers.js';
import { createShelfIncomingHandlers } from './shelf-incoming.handlers.js';
import { createSideDummyHandlers } from './side-dummy.handlers.js';
import { createRecipeInterlockHandlers } from './recipe-interlock.handlers.js';
import { createWafercodecheckHandlers } from './wafer-code-check.handlers.js';

export function normalizeMessageName(messageName) {
  return String(messageName || '')
    .trim()
    .toUpperCase();
}

export function createMachinePortHandler(messageName, remoteCvdHandler, remoteMeasHandler, store) {
  return (context) => {
    const equipmentId =
      normalizeMessageName(messageName) === 'MACHINEPORTSTATUS'
        ? context.payload.EQPID
        : context.payload.MACHINENAME;
    return store.getRemoteCvdEquipment(equipmentId)
      ? remoteCvdHandler(context)
      : remoteMeasHandler(context);
  };
}

// Move In Inline and eSheet both send MASKINFO with RETICLEID; reticles with eSheet mask rows
// go to eSheet, the rest to Move In Inline.
export function createMaskInfoHandler(moveInInlineHandler, esheetHandler, store) {
  return (context) =>
    store.getESheetMaskInfo(context.payload.RETICLEID)
      ? esheetHandler(context)
      : moveInInlineHandler(context);
}

export function createMessageRegistry(store) {
  const handlers = new Map();
  // CVD and measurement expose the same two protocol messages.
  const cvd = createRemoteCvdHandlers(store);
  const meas = createRemoteMeasHandlers(store);
  const remote = { ...cvd, ...meas };
  for (const name of ['MACHINEPORTSTATUS', 'MACHINEPORTCLEAR']) {
    remote[name] = (context) => {
      const equipment = context.payload.EQPID || context.payload.MACHINENAME;
      return (store.getRemoteCvdEquipment(equipment) ? cvd[name] : meas[name])(context);
    };
  }
  const interlock = createRecipeInterlockHandlers(store);
  // SETGASUSAGE belongs to the gas handler; the XML alias dispatches INTLKPOPUPCHECK.
  delete interlock.SETGASUSAGE;

  for (const group of [
    createAutoMergeHandlers(),
    createMoveOutHandlers(store),
    createMachineInformHandlers(),
    createMoveInInlineHandlers(),
    createBatchHandlers(store),
    createChatListHandlers(),
    createActivityMainHandlers(store),
    createCommentHandlers(store),
    createDiffInstParameterHandlers(store),
    createDispatchingHandlers(store),
    createESheetEdcHandlers(store),
    createESheetHandlers(store),
    createEtchConditionHandlers(),
    createMDSSpcHandlers(),
    createInterlockConfirmationHandlers(store),
    createRcpInquireHandlers(store),
    createRemoteCvdHandlers(store),
    createSettingHandlers(store),
    createRemoteMeasHandlers(store),
    createEENModifyHandlers(store),
    createSampleReleaseHandlers(),
    createShelfIncomingHandlers(store),
    createSideDummyHandlers(),
    createRemoteImpBatchHandlers(store),
    createRecipeInterlockHandlers(store),
    createMaskLocationHandlers(store),
    createWafercodecheckHandlers(),
  ]) {
    for (const [name, handler] of Object.entries(group)) {
      const key = normalizeMessageName(name);
      if (handlers.has(key)) {
        if (key === 'MACHINEPORTSTATUS' || key === 'MACHINEPORTCLEAR') {
          const remoteCvdHandler = handlers.get(key);
          const remoteMeasHandler = handler;
          handlers.set(
            key,
            createMachinePortHandler(key, remoteCvdHandler, remoteMeasHandler, store),
          );
          continue;
        }
        if (key === 'MASKINFO') {
          handlers.set(key, createMaskInfoHandler(handlers.get(key), handler, store));
          continue;
        }
        throw new Error(`Duplicate mock message handler: ${key}`);
      }
      handlers.set(key, handler);
    }
  }

  return {
    has(messageName) {
      return handlers.has(normalizeMessageName(messageName));
    },
    handle(messageName, payload = {}) {
      const key = normalizeMessageName(messageName);
      const handler = handlers.get(key);
      if (!handler) return undefined;
      return handler({ payload, store });
    },
  };
}
