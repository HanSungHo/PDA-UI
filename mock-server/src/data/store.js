import { maskLocationFixtures } from './mask-location.fixtures.js';
import {
  activityBatchFixtures,
  batchFixtures,
  shelfIncomingFixtures,
  bayFixtures,
  commentFixtures,
  commentViewPreviewScenarios,
  diffFixtures,
  dispatchingFixtures,
  esheetFixtures,
  multiMaskLocationFixtures,
  eenModifyFixtures,
  edcFixtures,
  lotFixtures,
  remoteCvdFixtures,
  rcpFixtures,
  remoteMeasFixtures,
  settingFixtures,
  updateFixtures,
  waferSelectFixtures,
  xmlFixtures,
  impBatchFixtures,
  wetAutoFixtures,
  prChangeFixtures,
  remoteXrfRecipeFixtures,
} from './fixtures.js';
import { fail, pass } from '../utils/response.js';

const baseLot = lotFixtures['LOT-DEMO-01'];

function clone(value) {
  return structuredClone(value);
}

function normalizeLots() {
  return Object.fromEntries(
    Object.entries(lotFixtures).map(([lotId, lot]) => [
      lotId,
      { ...baseLot, ...lot, LOTID: lotId },
    ]),
  );
}

export function createStore() {
  let state = {
    maskLocations: clone(maskLocationFixtures),
    shelfIncoming: clone(shelfIncomingFixtures),
    lots: normalizeLots(),
    batches: clone(batchFixtures),
    comments: clone(commentFixtures),
    diff: clone(diffFixtures),
    dispatching: clone(dispatchingFixtures),
    esheet: clone(esheetFixtures),
    multiMaskLocation: clone(multiMaskLocationFixtures),
    edc: clone(edcFixtures),
    rcp: clone(rcpFixtures),
    remoteMeas: clone(remoteMeasFixtures),
    remoteMeasExecutions: [],
    waferSelect: clone(waferSelectFixtures),
    activityBatch: clone(activityBatchFixtures),
    xml: clone(xmlFixtures),
    bays: clone(bayFixtures.bays),
    stockersByBay: clone(bayFixtures.stockersByBay),
    setting: clone(settingFixtures),
    settingConfig: null,
    eenModify: clone(eenModifyFixtures),
    remoteCvd: clone(remoteCvdFixtures),
    impBatch: clone(impBatchFixtures),
    recipeInterlocks: [],
    prChange: clone(prChangeFixtures),
    machineInform: {},
    premptyConfirmations: [],
    gasRequests: [],
    wetAutoEquipment: clone(wetAutoFixtures.equipmentById),
    messageRequests: [],
    remoteXrfRecipe: clone(remoteXrfRecipeFixtures),
  };

  function remoteCvdEquipmentKey(equipmentId) {
    const key = String(equipmentId || '')
      .trim()
      .toUpperCase();
    return (
      Object.entries(state.remoteCvd.equipmentById).find(
        ([fixtureKey, equipment]) =>
          fixtureKey === key || String(equipment.MAINEQPID || '').toUpperCase() === key,
      )?.[0] || key
    );
  }

  return {
    getMaskLocation(reticleId) {
      return clone(state.maskLocations[reticleId] ?? null);
    },
    changeMaskLocation(payload) {
      const mask = state.maskLocations[payload.RETICLEID];
      const location = payload.LOCTYPE === 'ETC' ? payload.ETCDETAILLOC : payload.LOCATION;
      if (!mask || !location || location === 'BAD' || !payload.OPERATORID)
        return fail('입력된 정보를 확인하세요');
      const masks = Object.values(state.maskLocations).filter(
        (item) => item.SERIAL === mask.SERIAL && item.CURRLOC === mask.CURRLOC,
      );
      for (const item of masks) {
        item.CURRLOC = location;
        item.SUBLOCATION3 = payload.SUBLOCATION3 || '';
        if (payload.LOCTYPE === 'ETC') item.STATUS = payload.ETCSTATUS;
      }
      return pass({
        RETCILES: masks.map((item) => item.RETICLETAG).join(','),
        SCOUNT: String(masks.length),
      });
    },
    getShelfIncoming(shelfNo) {
      return clone(state.shelfIncoming.shelves[shelfNo] ?? null);
    },
    getShelfIncomingLot(lotId) {
      return clone(state.shelfIncoming.lots[lotId] ?? null);
    },
    transactShelfIncoming(payload, incoming) {
      const shelf = state.shelfIncoming.shelves[payload.SHELFNO];
      const lotIds = String((incoming ? payload.INSERTSHELFLOT : payload.DELETESHELFLOT) || '')
        .split('|')
        .filter(Boolean);
      if (!shelf || !payload.USERID || !lotIds.length) return fail('입력된 정보를 확인하세요');
      if (!incoming && payload.COMMANDTYPE !== (shelf.CATEGORY === 'S' ? 'SHELF OUT' : 'CART OUT'))
        return fail('입력된 정보를 확인하세요');
      const errors = [];
      for (const lotId of lotIds) {
        if (!state.shelfIncoming.lots[lotId] || lotId === 'LOT-PARTIAL') {
          errors.push(lotId);
          continue;
        }
        if (incoming) {
          if (!shelf.lots.includes(lotId)) shelf.lots.push(lotId);
        } else shelf.lots = shelf.lots.filter((value) => value !== lotId);
      }
      return pass({ ERRORLOT: errors.join('|') });
    },
    reset() {
      state = {
        maskLocations: clone(maskLocationFixtures),
        shelfIncoming: clone(shelfIncomingFixtures),
        lots: normalizeLots(),
        batches: clone(batchFixtures),
        comments: clone(commentFixtures),
        diff: clone(diffFixtures),
        dispatching: clone(dispatchingFixtures),
        esheet: clone(esheetFixtures),
        multiMaskLocation: clone(multiMaskLocationFixtures),
        edc: clone(edcFixtures),
        rcp: clone(rcpFixtures),
        remoteMeas: clone(remoteMeasFixtures),
        remoteMeasExecutions: [],
        activityBatch: clone(activityBatchFixtures),
        waferSelect: clone(waferSelectFixtures),
        xml: clone(xmlFixtures),
        bays: clone(bayFixtures.bays),
        stockersByBay: clone(bayFixtures.stockersByBay),
        setting: clone(settingFixtures),
        settingConfig: null,
        eenModify: clone(eenModifyFixtures),
        remoteCvd: clone(remoteCvdFixtures),
        impBatch: clone(impBatchFixtures),
        recipeInterlocks: [],
        prChange: clone(prChangeFixtures),
        machineInform: {},
        premptyConfirmations: [],
        gasRequests: [],
        wetAutoEquipment: clone(wetAutoFixtures.equipmentById),
        messageRequests: [],
        remoteXrfRecipe: clone(remoteXrfRecipeFixtures),
      };
    },
    recordMessageRequest(request) {
      state.messageRequests.push(clone(request));
      if (state.messageRequests.length > 500) state.messageRequests.shift();
    },
    getMessageRequests() {
      return clone(state.messageRequests);
    },
    getPrChangePump(pumpId) {
      return clone(
        state.prChange.pumps[
          String(pumpId || '')
            .trim()
            .toUpperCase()
        ],
      );
    },
    getPrChangePr(prId) {
      return clone(state.prChange.prs[String(prId || '').trim()]);
    },
    applyPrChange(pumpId, record) {
      const pump = state.prChange.pumps[String(pumpId || '').toUpperCase()];
      Object.assign(pump, {
        PRID: record.PRID,
        PRCOMP: record.PRCOMP,
        PRDESC: record.PRDESC,
        FLAG: '1',
      });
      state.prChange.changes.push(clone({ PUMPNAME: pump.PUMPNAME, ...record }));
    },
    getPrChanges() {
      return clone(state.prChange.changes);
    },
    addRecipeInterlock(record) {
      state.recipeInterlocks.push(clone(record));
    },
    getMachineInform(key) {
      return state.machineInform[key] ?? '';
    },
    setMachineInform(key, content) {
      state.machineInform[key] = content;
    },
    getRecipeInterlocks() {
      return clone(state.recipeInterlocks);
    },
    addPremptyConfirmation(record) {
      state.premptyConfirmations.push(clone(record));
    },
    getPremptyConfirmations() {
      return clone(state.premptyConfirmations);
    },
    addGasRequest(record) {
      state.gasRequests.push(clone(record));
    },
    getGasRequests() {
      return clone(state.gasRequests);
    },
    getLot(lotId) {
      return clone(
        state.lots[
          String(lotId || '')
            .trim()
            .toUpperCase()
        ],
      );
    },
    getWetAutoEquipment(equipmentId) {
      const key = String(equipmentId || '')
        .trim()
        .toUpperCase();
      return clone(state.wetAutoEquipment[key]);
    },
    shouldFailWetAutoStart(equipmentId) {
      return (
        String(equipmentId || '')
          .trim()
          .toUpperCase() === wetAutoFixtures.startFailureMachine
      );
    },
    getRemoteCvdEquipment(equipmentId) {
      const key = remoteCvdEquipmentKey(equipmentId);
      const equipment = state.remoteCvd.equipmentById[key];
      if (!equipment) return undefined;
      return clone(equipment);
    },
    getRemoteCvdRecipeInfo(equipmentId) {
      return clone(state.remoteCvd.recipeInfoByEquipment[remoteCvdEquipmentKey(equipmentId)]);
    },
    getRemoteCvdTeRcp(equipmentId) {
      return clone(
        state.remoteCvd.teRcpByEquipment[remoteCvdEquipmentKey(equipmentId)] || {
          TE_FLAG: 'N',
          TE_RCP: '',
          TE_ORDERS: '0',
        },
      );
    },
    getRemoteCvdMemorization(equipmentId) {
      return clone(
        state.remoteCvd.memorizationByEquipment[remoteCvdEquipmentKey(equipmentId)] || {},
      );
    },
    getRemoteCvdPort(machineName, portName) {
      const machine = String(machineName || '')
        .trim()
        .toUpperCase();
      const port = String(portName || '').trim();
      return clone(state.remoteCvd.portsByEquipment[machine]?.[port]);
    },
    clearRemoteCvdPort(machineName, portName) {
      const machine = String(machineName || '')
        .trim()
        .toUpperCase();
      const port = String(portName || '').trim();
      const current = state.remoteCvd.portsByEquipment[machine]?.[port];
      if (!current) return undefined;
      state.remoteCvd.portsByEquipment[machine][port] = {
        ...current,
        PORTSTATENAME: 'IDLE',
        PORTLOTNAME: '',
        ACKMSG: '',
      };
      return clone(state.remoteCvd.portsByEquipment[machine][port]);
    },
    recordRemoteCvdDoorOpen(request) {
      state.remoteCvd.doorOpenRequests.push(clone(request));
    },
    getRemoteCvdEtchCommRcp(equipmentId) {
      const key = String(equipmentId || '')
        .trim()
        .toUpperCase();
      const fixtureKey = key.includes('TE8500')
        ? 'TE8500'
        : key === 'CVD-EMPTY'
          ? 'EMPTY'
          : 'DEFAULT';
      return clone(state.remoteCvd.etchCommRcpByEquipment[fixtureKey]);
    },
    recordRemoteCvdEtchRcpDownload(request) {
      state.remoteCvd.etchRcpDownloads.push(clone(request));
      if (request.DOWN_VALUE === 'FAIL-DOWNLOAD') return 'D_FAIL';
      if (request.DOWN_VALUE === 'FAIL-VALIDATION') return 'V_FAIL';
      return 'OK';
    },
    startRemoteCvd(request) {
      const lotId = String(request.LOTNAME || '')
        .trim()
        .toUpperCase();
      const lot = state.lots[lotId];
      if (!lot) return undefined;
      state.lots[lotId] = {
        ...lot,
        STATUS: 'RUN',
        STATE: 'RUN',
        MACHINENAME: request.MACHINENAME || '',
        PORTNAME: request.PORTNAME || '',
        MACHINERECIPENAME: request.RECIPENAME || '',
      };
      const machine = String(request.MACHINENAME || '')
        .trim()
        .toUpperCase();
      const port = String(request.PORTNAME || '').trim();
      const currentPort = state.remoteCvd.portsByEquipment[machine]?.[port];
      if (currentPort) {
        state.remoteCvd.portsByEquipment[machine][port] = {
          ...currentPort,
          PORTSTATENAME: 'RUN',
          PORTLOTNAME: lotId,
        };
      }
      return clone(state.lots[lotId]);
    },
    updateLot(lotId, patch) {
      const key = String(lotId || '')
        .trim()
        .toUpperCase();
      state.lots[key] = { ...state.lots[key], ...patch };
      return clone(state.lots[key]);
    },
    getBays() {
      return clone(state.bays);
    },
    getStockers(bay) {
      return clone(state.stockersByBay[bay] || []);
    },
    getSettingFacilities() {
      return clone(state.setting.facilities);
    },
    getSettingAreas(facility) {
      return clone(state.setting.areasByFacility[String(facility || '')] || []);
    },
    getSettingBays(area, facility) {
      return clone(state.setting.baysByLocation[`${facility}:${area}`] || []);
    },
    saveSettingConfig(config) {
      state.settingConfig = clone(config);
      return clone(state.settingConfig);
    },
    getSettingConfig() {
      return clone(state.settingConfig);
    },
    getEENModifyTags(facility) {
      return clone(state.eenModify.tagsByFacility[String(facility || '').trim()] || []);
    },
    getEENModifyItem(eenId) {
      return clone(state.eenModify.itemsByEenId[String(eenId || '').trim()]);
    },
    updateEENModifyItem(eenId, changes) {
      const item = state.eenModify.itemsByEenId[String(eenId || '').trim()];
      if (!item) return false;
      Object.assign(item, clone(changes));
      return true;
    },
    getEENList(lotName) {
      const eenIds = state.eenModify.rowsByLot[String(lotName || '').trim()] || [];
      return eenIds
        .filter((eenId) => state.eenModify.itemsByEenId[eenId])
        .map((eenId) => {
          const item = state.eenModify.itemsByEenId[eenId];
          return {
            ...clone(state.eenModify.rows[eenId]),
            TAGCOMMENT: item.tagComment,
            ACTIONPOINT: item.actionPoint,
            TAGID: item.tagId,
          };
        });
    },
    insertEEN(payload) {
      const lotName = String(payload.LOTNAME || '').trim();
      const eenId = `EEN-${String(Object.keys(state.eenModify.rows).length + 1).padStart(4, '0')}`;
      state.eenModify.rows[eenId] = {
        EENID: eenId,
        PROCESSOPERATIONNAMEDESC: payload.PODESC || payload.OPERATION,
        FACTORYNAME: payload.FACILITY,
        PRODUCTSPECNAME: payload.PRODUCT,
        PROCESSFLOWNAME: payload.PROCESSFLOW,
        PROCESSOPERATIONNAME: payload.OPERATION,
        CREATETIME: '2026-10-30 09:00:00',
        CREATEUSER: payload.USERID,
        CONFIRMUSER: '',
        CONFIRMTIME: '',
        DESCRIPTION: payload.PODESC || '',
      };
      state.eenModify.itemsByEenId[eenId] = {
        actionPoint: payload.ACTIONPOINT,
        tagId: payload.TAGID,
        tagComment: payload.TAGCOMMENT,
        changeCause: '',
      };
      (state.eenModify.rowsByLot[lotName] ||= []).push(eenId);
      return eenId;
    },
    deleteEEN(lotName, eenId) {
      const lot = state.eenModify.rowsByLot[String(lotName || '').trim()];
      const index = lot ? lot.indexOf(String(eenId || '').trim()) : -1;
      if (index < 0) return false;
      lot.splice(index, 1);
      return true;
    },
    getBatch(batchId) {
      return clone(
        state.batches[
          String(batchId || '')
            .trim()
            .toUpperCase()
        ],
      );
    },
    getBatchByLot(lotId) {
      const key = String(lotId || '')
        .trim()
        .toUpperCase();
      return clone(
        Object.values(state.batches).find((batch) =>
          batch.items.some((item) => item.lotId === key),
        ),
      );
    },
    getActivityBatchChildren(batchId) {
      return clone(
        Object.values(state.batches).filter((batch) => batch.context.parentBatchId === batchId),
      );
    },
    getActivityBatchEquipment(eqpId) {
      const key = String(eqpId || '')
        .trim()
        .toUpperCase();
      return clone(state.activityBatch.equipmentByEqp[key]);
    },
    getActivityBatchLot(lotId) {
      const key = String(lotId || '')
        .trim()
        .toUpperCase();
      return clone(state.activityBatch.lots[key]);
    },
    getActivityBatchParentIds(eqpId, lotIds) {
      const key = String(eqpId || '')
        .trim()
        .toUpperCase();
      if (String(lotIds).includes('LOT-ACT-PARENTFAIL')) return { error: '모 BATCH 조회 실패' };
      if (String(lotIds).includes('LOT-ACT-NOPARENT')) return [];
      return clone(state.activityBatch.parentBatchIdsByEqp[key] || []);
    },
    getActivityBatchZone(batchId) {
      const key = String(batchId || '')
        .trim()
        .toUpperCase();
      return state.activityBatch.zonesByBatchId[key];
    },
    getActivityBatchCountView() {
      return state.activityBatch.batchCountView;
    },
    getActivityBatchPrecheck(eqpId) {
      return clone({
        BATCHMESSGE: '',
        CUMCOUNT: '',
        MAXCOUNT: '',
        UPDATEFLAG: '',
        UVFLAG: '',
        SAMPLECYCLE: '',
        REMOTE: '',
        ...state.activityBatch.precheckByEqp[eqpId],
      });
    },
    getActivityBatchCreateResult(eqpId) {
      return clone({
        INTERLOCKMSG: '',
        TTINTERLOCKMSG: '',
        NOTICEDOWN: '',
        ...state.activityBatch.createResultByEqp[eqpId],
      });
    },
    saveActivityBatch(payload, items) {
      const type = String(payload.TYPE || '');
      const batchId =
        String(payload.BATCHID || '')
          .trim()
          .toUpperCase() ||
        `BAT-MOCK-${String(state.activityBatch.nextBatchNumber++).padStart(4, '0')}`;

      if (type === 'D') {
        delete state.batches[batchId];
        return clone({ batchId, deleted: true });
      }

      const firstLot = items.find((item) => item.LOTID)?.LOTID;
      const lotInfo = (lotId) => state.activityBatch.lots[lotId] || state.lots[lotId] || {};
      const recipe = lotInfo(firstLot).STEPRECIPE || lotInfo(firstLot).WORKEDRECIPE || '';
      state.batches[batchId] = {
        context: {
          batchId,
          lotId: firstLot || '',
          eqpId: payload.EQPID || '',
          recipe,
          comment: '',
          transport: 'N',
          facility: payload.FACILITY,
          batchType: payload.BATCHTYPE,
          monitorWaferCount: payload.MWCOUNT,
          parentBatchId: payload.MBATCHID,
          childZone: payload.CHALIDZONE,
          operatorId: payload.OPERATORID,
          sampling: Object.fromEntries(
            ['CUMCOUNT', 'MAXCOUNT', 'UPDATEFLAG', 'UVFLAG', 'SAMPLECYCLE']
              .filter((key) => payload[key] !== undefined)
              .map((key) => [key, payload[key]]),
          ),
        },
        checkParameter: 'N',
        unreadWorkCommentQty: 0,
        items: items.map((item, index) => {
          const lot = lotInfo(item.LOTID);
          return {
            num: index,
            lotId: item.LOTID,
            commentQty: 0,
            status: item.LOTID ? lot.STATUS || 'RUN' : '',
            processStep: lot.PROCESSSTEP || '',
            product: lot.PRODUCT || '',
            quantity: lot.QUANTITY || '',
            errorMessage: '',
            operation: item.OPERATION,
            subOperation: item.SUBOPERATION,
            lotState: 'WIP',
            nwCommentQty: 0,
            operSequence: String(index + 1).padStart(3, '0'),
            opType: 'MVOU',
            bayName: '',
            stockerName: '',
            recipe,
            isdcol: item.ZONE,
            waferType: item.SLOTTYPE,
            processName: lot.PROCESSNAME || (item.SLOTTYPE === 'D/W' ? 'MW_TEST' : ''),
            viewCount: lot.VIEWCOUNT || '',
            // BatchActivity normalizes nonempty response values to Y on reload.
            ptin: item.PTIN === 'Y' ? 'Y' : '',
            ptspec: lot.PTSPEC || '',
            thin: item.THIN === 'Y' ? 'Y' : '',
            thspec: item.LOTID && item.SLOTTYPE !== 'D/W' ? 'Y' : '',
          };
        }),
      };
      return clone({ batchId });
    },
    moveOutLot(lotId) {
      const key = String(lotId || '')
        .trim()
        .toUpperCase();
      if (state.lots[key]) {
        state.lots[key] = { ...state.lots[key], STATUS: 'WAIT' };
      }
      for (const batch of Object.values(state.batches)) {
        const item = batch.items.find((row) => row.lotId === key);
        if (item) {
          item.status = 'WAIT';
          item.errorMessage = '';
        }
      }
    },
    updateSkipWafer(lotId) {
      const key = String(lotId || '')
        .trim()
        .toUpperCase();
      if (state.lots[key]) {
        state.lots[key] = { ...state.lots[key], CHECKSKIPWAFER: 'Y' };
      }
    },
    getComments(lotId) {
      const key = String(lotId || '')
        .trim()
        .toUpperCase();
      return clone(state.comments.filter((comment) => !key || comment.lotId === key));
    },
    getComment(lotId, commentNo) {
      const key = String(lotId || '')
        .trim()
        .toUpperCase();
      return clone(
        state.comments.find((comment) => comment.lotId === key && comment.no === String(commentNo)),
      );
    },
    getCommentViewPreviewScenario(scenario) {
      return clone(
        commentViewPreviewScenarios[scenario] ?? commentViewPreviewScenarios['current-writable'],
      );
    },
    markCommentRead(lotId, commentNo, reader) {
      const key = String(lotId || '')
        .trim()
        .toUpperCase();
      const comment = state.comments.find(
        (row) => row.lotId === key && row.no === String(commentNo),
      );
      if (comment) {
        comment.isCheck = true;
        comment.reader = reader || '';
        comment.readTime = '2026-09-25 09:30:00';
      }
      if (state.lots[key]) {
        const unreadCount = state.comments.filter(
          (row) => row.lotId === key && !row.isCheck,
        ).length;
        state.lots[key].NWCOMMENTQTY = String(unreadCount);
      }
    },

    getDiffLot(lotId) {
      return clone(
        state.diff.lots[
          String(lotId || '')
            .trim()
            .toUpperCase()
        ],
      );
    },
    getDispatching(machineName) {
      return clone(
        state.dispatching.machines[
          String(machineName || '')
            .trim()
            .toUpperCase()
        ],
      );
    },
    getESheetInfo(lotId) {
      return clone(
        state.esheet.infoByLot[
          String(lotId || '')
            .trim()
            .toUpperCase()
        ],
      );
    },
    getESheetFurnaceClassification(lotId) {
      const key = String(lotId || '')
        .trim()
        .toUpperCase();
      const result = state.esheet.furnaceClassificationByLot[key];
      if (result) return clone(result);
      return state.esheet.infoByLot[key] ? { CNT: '0' } : undefined;
    },
    getESheetWaferList(lotId) {
      return clone(
        state.esheet.waferListByLot[
          String(lotId || '')
            .trim()
            .toUpperCase()
        ],
      );
    },
    getESheetMaskInfo(reticleIds) {
      const ids = String(reticleIds || '')
        .split('|')
        .map((value) => value.trim().toUpperCase())
        .filter(Boolean);
      if (!ids.length) return undefined;
      const rows = ids.flatMap((id) => state.esheet.maskInfoByReticle[id] || []);
      return rows.length ? clone(rows) : undefined;
    },
    getESheetPcmReworkRecipe(lotId) {
      const key = String(lotId || '')
        .trim()
        .toUpperCase();
      const recipe =
        state.esheet.pcmReworkRecipeByLot[key] ||
        (state.esheet.infoByLot[key] ? state.esheet.pcmReworkRecipeByLot.WP00001 : undefined);
      return clone(recipe);
    },
    getESheetFutureActions(lotId, operation, subOperation) {
      const key = [lotId, operation, subOperation]
        .map((value) => String(value || '').trim())
        .join('|');
      const result = state.esheet.futureActionsByContext[key];
      if (result !== undefined) return clone(result);
      const knownLot =
        state.esheet.infoByLot[
          String(lotId || '')
            .trim()
            .toUpperCase()
        ];
      return knownLot && operation === 'P00002' && subOperation === '00' ? 'FUTURE HOLD' : '';
    },
    getESheetPhotoSample(lotId, location) {
      if (!String(lotId || '').trim() || !String(location || '').trim()) return undefined;
      return clone(state.esheet.photoSample);
    },
    getMaskStatuses() {
      return clone(state.multiMaskLocation.statuses);
    },
    getMaskLocationGroups(status) {
      return clone(state.multiMaskLocation.locationGroupsByStatus[String(status || '')] ?? []);
    },
    getMaskLocations(locationGroup) {
      return clone(state.multiMaskLocation.locationsByGroup[String(locationGroup || '')] ?? []);
    },
    getMaskInfo(reticleId) {
      const mask = state.multiMaskLocation.masksByReticle[String(reticleId || '').trim()];
      return mask ? clone(mask) : undefined;
    },
    changeMultiMaskLocation({ reticleId, status, location }) {
      const mask = state.multiMaskLocation.masksByReticle[String(reticleId || '').trim()];
      if (!mask || reticleId === 'RT-FAIL') return undefined;
      mask.STATUS = status;
      mask.CURRLOC = location;
      return clone(mask);
    },
    setDispatchingReservation(machineName, lotNames, reserve) {
      const machine =
        state.dispatching.machines[
          String(machineName || '')
            .trim()
            .toUpperCase()
        ];
      if (!machine) return false;
      const lots = new Set(lotNames);
      machine.rows.forEach((row) => {
        if (lots.has(row.LOTNAME)) row.RESERVE = reserve;
      });
      return true;
    },
    getDiffParameters(machineName) {
      return clone(
        state.diff.parametersByMachine[
          String(machineName || '')
            .trim()
            .toUpperCase()
        ] || [],
      );
    },
    setDiffParameterValues(machineName, eqpPara) {
      const key = String(machineName || '')
        .trim()
        .toUpperCase();
      const values = String(eqpPara || '').split('|');
      const rows = state.diff.parametersByMachine[key] || [];
      rows.forEach((row, index) => {
        row.DATA = values[index] || row.DATA || '';
      });
    },
    getRcpRecipe(lotId) {
      return clone(
        state.rcp.recipesByLot[
          String(lotId || '')
            .trim()
            .toUpperCase()
        ],
      );
    },
    getRcpInspection(lotId) {
      return clone(
        state.rcp.inspectionByLot[
          String(lotId || '')
            .trim()
            .toUpperCase()
        ],
      );
    },
    getDummyEqpInfo(eqpId) {
      const key = String(eqpId || '')
        .trim()
        .toUpperCase();
      return clone(state.waferSelect.dummyEqpInfoByEqp[key] || { EQPID: key });
    },
    getLotLastEvent(lotId) {
      const key = String(lotId || '')
        .trim()
        .toUpperCase();
      return clone(
        state.waferSelect.lotLastEventByLot[key] || {
          CREATECATEGORY: 'SLOT',
          LASTEVENTCOMMENT: '',
        },
      );
    },
    getXmlFixtures() {
      return clone(state.xml);
    },
    getRemoteMeasEqp(eqpId) {
      const key = String(eqpId || '')
        .trim()
        .toUpperCase();
      return clone(
        state.remoteMeas.equipments[key] || {
          MAINEQPID: `M${key}`,
          PROCEQPID: key,
          EQPAREA: 'DIFF',
          EQPTYPE: 'THICKNESS',
          PMMESSAGE: '',
          PORTNAME: 'PORT1,PORT2',
          RECIPENAME: 'RCP-MEAS-01',
        },
      );
    },
    getRemoteMeasPortStatus(eqpId, portName) {
      const eKey = String(eqpId || '')
        .trim()
        .toUpperCase();
      const pKey = String(portName || '')
        .trim()
        .toUpperCase();
      const lookup = `${eKey}:${pKey}`;
      return clone(
        state.remoteMeas.ports[lookup] || {
          PORTSTATENAME: 'READY',
          PORTLOTNAME: '',
          ACKMSG: '',
        },
      );
    },
    clearRemoteMeasPort(machineName, portName) {
      const eKey = String(machineName || '')
        .trim()
        .toUpperCase();
      const pKey = String(portName || '')
        .trim()
        .toUpperCase();
      const lookup = `${eKey}:${pKey}`;
      state.remoteMeas.ports[lookup] = {
        PORTSTATENAME: 'IDLE',
        PORTLOTNAME: '',
        ACKMSG: '',
      };
      return clone(state.remoteMeas.ports[lookup]);
    },
    recordRemoteMeasStart(payload) {
      const entry = {
        ...clone(payload),
        timestamp: new Date().toISOString(),
      };
      state.remoteMeasExecutions.push(entry);
      return clone(entry);
    },
    getRemoteMeasExecutions() {
      return clone(state.remoteMeasExecutions);
    },
    getUpdateScenario() {
      const name = state.update.scenario;
      return { name, ...clone(updateFixtures.scenarios[name]) };
    },
    setUpdateScenario(name) {
      if (!updateFixtures.scenarios[name]) return false;
      state.update.scenario = name;
      return true;
    },
    recordUpdateDownload() {
      state.update.downloadCount += 1;
    },
    getUpdateStats() {
      return {
        scenario: state.update.scenario,
        downloadCount: state.update.downloadCount,
        scenarios: Object.keys(updateFixtures.scenarios),
      };
    },
    getEdcData(lotId) {
      const key = String(lotId || '')
        .trim()
        .toUpperCase();
      return clone(state.edc[key]);
    },
    // Retrieve verification information based on the Recipe
    getMemorizationRule(recipe) {
      const key = String(recipe || '').trim();
      return clone(
        state.impBatch?.memorizationRules?.[key] || {
          status: 'PASS',
          POPUP: '',
        },
      );
    },

    // Execute IMP Batch launch: Update STATUS='RUN' for 2 LOTs and save the history
    executeImpBatchRemoteStart(payload) {
      const lotId1 = String(payload.LOTNAME1 || '')
        .trim()
        .toUpperCase();
      const lotId2 = String(payload.LOTNAME2 || '')
        .trim()
        .toUpperCase();
      const generatedBatchId = `IMP-BAT-${Date.now()}`;

      const updateData = {
        STATUS: 'RUN',
        BATCHID: generatedBatchId,
        WORKEDEQPID: payload.MACHINENAME || '',
        WORKEDRECIPE: payload.RECIPENAME || '',
        NEXTBAY: payload.ISCARRY === 'Y' ? payload.BAY || '' : '',
        NEXTSTOCKER: payload.ISCARRY === 'Y' ? payload.STOCKER || '' : '',
      };

      if (state.lots[lotId1]) {
        state.lots[lotId1] = { ...state.lots[lotId1], ...updateData };
      }
      if (state.lots[lotId2]) {
        state.lots[lotId2] = { ...state.lots[lotId2], ...updateData };
      }

      const historyItem = {
        batchId: generatedBatchId,
        ...clone(payload),
        executedAt: new Date().toISOString(),
      };

      if (!state.impBatch.executionHistory) {
        state.impBatch.executionHistory = [];
      }
      state.impBatch.executionHistory.push(historyItem);
      return clone(historyItem);
    },

    getImpBatchHistory() {
      return clone(state.impBatch?.executionHistory || []);
    },

    // ── Remote XRF Recipe Set ──────────────────────────────────────────────────
    getXrfItems(facility, area) {
      const key = `${String(facility || '').toUpperCase()}:${String(area || '').toUpperCase()}`;
      return clone(state.remoteXrfRecipe.itemsByFacilityArea[key] || []);
    },
    getXrfEqps(item) {
      const key = String(item || '').toUpperCase();
      return clone(state.remoteXrfRecipe.eqpsByItem[key] || []);
    },
    getXrfCategories(item, eqpId) {
      const key = `${String(item || '').toUpperCase()}:${String(eqpId || '').toUpperCase()}`;
      return clone(state.remoteXrfRecipe.categoriesByItemEqp[key] || []);
    },
    getXrfSamples(item, eqpId, category) {
      const key = `${String(item || '').toUpperCase()}:${String(eqpId || '').toUpperCase()}:${String(category || '').toUpperCase()}`;
      return clone(state.remoteXrfRecipe.samplesByItemEqpCategory[key] || []);
    },
    getXrfParas(item, eqpId, category, sample) {
      const key = `${String(item || '').toUpperCase()}:${String(eqpId || '').toUpperCase()}:${String(category || '').toUpperCase()}:${String(sample || '').toUpperCase()}`;
      return clone(state.remoteXrfRecipe.parasByKey[key] || []);
    },
    getXrfRecipe(item, eqpId, category, sample, para) {
      const key = `${String(item || '').toUpperCase()}:${String(eqpId || '').toUpperCase()}:${String(category || '').toUpperCase()}:${String(sample || '').toUpperCase()}:${String(para || '').toUpperCase()}`;
      return clone(state.remoteXrfRecipe.recipesByKey[key] || null);
    },
  };
}
