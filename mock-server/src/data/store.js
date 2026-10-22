import {
  activityBatchFixtures,
  batchFixtures,
  shelfIncomingFixtures,
  bayFixtures,
  commentFixtures,
  diffFixtures,
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
    shelfIncoming: clone(shelfIncomingFixtures),
    lots: normalizeLots(),
    batches: clone(batchFixtures),
    comments: clone(commentFixtures),
    diff: clone(diffFixtures),
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
        shelfIncoming: clone(shelfIncomingFixtures),
        lots: normalizeLots(),
        batches: clone(batchFixtures),
        comments: clone(commentFixtures),
        diff: clone(diffFixtures),
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
      };
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
  };
}
