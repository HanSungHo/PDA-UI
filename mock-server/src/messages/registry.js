import { createMaskLocationHandlers } from './mask-location.handlers.js';
import { createTestResultInputHandlers } from './test-result-input.handlers.js';
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
import { createEtchInspectionHandlers } from './etch-inspection.handlers.js';
import { mergeFixtures, photoMachineFixtures, splitCustomerByProduct } from '../data/fixtures.js';
import { createMergeHandlers } from './merge.handlers.js';
import { createSplitHandlers } from './split.handlers.js';
import { createReworkHandlers } from './rework.handlers.js';
import { createInputScopeDataHandlers } from './input-scope-data.handlers.js';
import { createBackupBayHandlers } from './backup-bay.handlers.js';
import { createRemoteFurnaceHandlers } from './remote-furnace.handlers.js';
import { createLegacyScreenHandlers } from './legacy-screens.handlers.js';
import { createMoveInHandlers } from './move-in.handlers.js';
import { createRemoteMachineSelectHandlers } from './remote-machine-select.handlers.js';
import { createInterlockConfirmationHandlers } from './interlock-confirmation.handlers.js';
import { createMDSSpcHandlers } from './mds-spc.handlers.js';
import { createMoveOutHandlers } from './move-out.handlers.js';
import { createPrChangeHandlers } from './pr-change.handlers.js';
import { createLotStatusByBayHandlers } from './lot-status-by-bay.handlers.js';
import { createMachineInformHandlers } from './machine-inform.handlers.js';
import { createManualAbortBatchHandlers } from './manual-abort-batch.handlers.js';
import { createMoveInInlineHandlers } from './move-in-inline.handlers.js';
import { createRcpInquireHandlers } from './rcp-inquire.handlers.js';
import { createRemoteMeasHandlers } from './remote-meas.handlers.js';
import { createRemoteMeasMainHandlers } from './remote-meas-main.handlers.js';
import { createRemoteCvdHandlers } from './remote-cvd.handlers.js';
import { createRemoteImpBatchHandlers } from './remote-imp-batch.handlers.js';
import { createSettingHandlers } from './setting.handlers.js';
import { createSampleReleaseHandlers } from './sample-release.handlers.js';
import { createShelfIncomingHandlers } from './shelf-incoming.handlers.js';
import { createSideDummyHandlers } from './side-dummy.handlers.js';
import { createRecipeInterlockHandlers } from './recipe-interlock.handlers.js';
import { createWetAutoHandlers } from './wet-auto.handlers.js';
import { createMachineStatusDetailHandlers } from './machine-status-detail.handlers.js';
import { createGasHandlers } from './gas.handlers.js';
import { createMachineStatusHandlers } from './machine-status.handlers.js';
import { createWafercodecheckHandlers } from './wafer-code-check.handlers.js';
import { createReTransferHandlers } from './re-transfer.handlers.js';
import { createRemoteXrfRecipeHandlers } from './remote-xrf-recipe.handlers.js';
import { createTestTuningHandlers } from './test-tuning.handlers.js';
import { createRemoteAegisHandlers } from './remote-aegis.handlers.js';

export function normalizeMessageName(messageName) {
  return String(messageName || '')
    .trim()
    .toUpperCase();
}

const isPhotoMachine = (id) =>
  Boolean(
    photoMachineFixtures[
      String(id || '')
        .trim()
        .toUpperCase()
    ],
  );

export function createMachinePortHandler(messageName, remoteCvdHandler, remoteMeasHandler, store) {
  return (context) => {
    const equipmentId =
      normalizeMessageName(messageName) === 'MACHINEPORTSTATUS'
        ? context.payload.EQPID
        : context.payload.MACHINENAME;
    return store.getRemoteCvdEquipment(equipmentId) || isPhotoMachine(equipmentId)
      ? remoteCvdHandler(context)
      : remoteMeasHandler(context);
  };
}

// Four screens send MASKINFO with RETICLEID. eSheet and Move In Inline send ID_IDENT=T: reticles
// with eSheet mask rows go to eSheet, the rest to Move In Inline. Mask Location and Multi Mask
// Location omit ID_IDENT: Mask Location reticles go to its handler, the rest (Multi Mask Location)
// to eSheet, which answers with the single-mask fields.
export function createMaskInfoHandler({ moveInInline, esheet, maskLocation }, store) {
  return (context) => {
    const { ID_IDENT: idIdent, RETICLEID: reticleId } = context.payload;
    if (idIdent === 'T')
      return store.getESheetMaskInfo(reticleId) ? esheet(context) : moveInInline(context);
    return maskLocation && store.getMaskLocation(reticleId)
      ? maskLocation(context)
      : esheet(context);
  };
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
      const useCvd =
        store.getRemoteCvdEquipment(equipment) ||
        (name === 'MACHINEPORTSTATUS' && isPhotoMachine(equipment));
      return (useCvd ? cvd[name] : meas[name])(context);
    };
  }
  const interlock = createRecipeInterlockHandlers(store);
  // SETGASUSAGE belongs to the gas handler; the XML alias dispatches INTLKPOPUPCHECK.
  delete interlock.SETGASUSAGE;

  const moveInInline = createMoveInInlineHandlers();
  const esheet = createESheetHandlers(store);
  const maskLocation = createMaskLocationHandlers(store);

  for (const group of [
    createAutoMergeHandlers(),
    createMoveOutHandlers(store),
    createPrChangeHandlers(),
    createLotStatusByBayHandlers(store),
    createMachineInformHandlers(),
    moveInInline,
    createBatchHandlers(store),
    createChatListHandlers(),
    createActivityMainHandlers(store),
    createCommentHandlers(store),
    createDiffInstParameterHandlers(store),
    createDispatchingHandlers(store),
    createESheetEdcHandlers(store),
    esheet,
    createEtchConditionHandlers(),
    createEtchInspectionHandlers(),
    createMergeHandlers(mergeFixtures),
    createSplitHandlers({ customerByProduct: splitCustomerByProduct }),
    createReworkHandlers(),
    createInputScopeDataHandlers(),
    createMoveInHandlers(),
    createRemoteFurnaceHandlers(),
    createLegacyScreenHandlers(),
    createBackupBayHandlers(),
    createRemoteMachineSelectHandlers(),
    createManualAbortBatchHandlers(),
    createMDSSpcHandlers(),
    createInterlockConfirmationHandlers(store),
    createRcpInquireHandlers(store),
    createRemoteCvdHandlers(store),
    createSettingHandlers(store),
    createRemoteMeasHandlers(store),
    createRemoteMeasMainHandlers(),
    createEENModifyHandlers(store),
    createSampleReleaseHandlers(),
    createShelfIncomingHandlers(store),
    createSideDummyHandlers(),
    createWetAutoHandlers(store),
    createRemoteImpBatchHandlers(store),
    createRecipeInterlockHandlers(store),
    createMachineStatusDetailHandlers(),
    createMachineStatusHandlers(store),
    maskLocation,
    createWafercodecheckHandlers(),
    createTestResultInputHandlers(),
    createReTransferHandlers(),
    createGasHandlers(store),
    createRemoteXrfRecipeHandlers(store),
    createTestTuningHandlers(store),
    createRemoteAegisHandlers(store),
  ]) {
    for (const [name, handler] of Object.entries(group)) {
      const key = normalizeMessageName(name);
      // MASKINFO is shared by four screens and routed below.
      if (key === 'MASKINFO') continue;
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
        throw new Error(`Duplicate mock message handler: ${key}`);
      }
      handlers.set(key, handler);
    }
  }
  handlers.set(
    'MASKINFO',
    createMaskInfoHandler(
      {
        moveInInline: moveInInline.MASKINFO,
        esheet: esheet.MASKINFO,
        maskLocation: maskLocation.MASKINFO,
      },
      store,
    ),
  );

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
