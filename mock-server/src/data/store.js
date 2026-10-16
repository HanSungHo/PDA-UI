import {
  batchFixtures,
  bayFixtures,
  commentFixtures,
  diffFixtures,
  eenModifyFixtures,
  lotFixtures,
  remoteCvdFixtures,
  rcpFixtures,
<<<<<<< HEAD
  settingFixtures,
=======
  updateFixtures,
>>>>>>> 0fa81fb (fix(ATSOP26-2285): fix review comments)
  waferSelectFixtures,
  xmlFixtures,
} from './fixtures.js';

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
    lots: normalizeLots(),
    batches: clone(batchFixtures),
    comments: clone(commentFixtures),
    diff: clone(diffFixtures),
    rcp: clone(rcpFixtures),
    waferSelect: clone(waferSelectFixtures),
    xml: clone(xmlFixtures),
    bays: clone(bayFixtures.bays),
    stockersByBay: clone(bayFixtures.stockersByBay),
<<<<<<< HEAD
    setting: clone(settingFixtures),
    settingConfig: null,
    eenModify: clone(eenModifyFixtures),
<<<<<<< HEAD
    remoteCvd: clone(remoteCvdFixtures),
=======
=======
    update: { scenario: updateFixtures.defaultScenario, downloadCount: 0 },
>>>>>>> 0fa81fb (fix(ATSOP26-2285): fix review comments)
>>>>>>> 8cfd5f7 (fix(ATSOP26-2285): fix review comments)
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
    reset() {
      state = {
        lots: normalizeLots(),
        batches: clone(batchFixtures),
        comments: clone(commentFixtures),
        diff: clone(diffFixtures),
        rcp: clone(rcpFixtures),
        waferSelect: clone(waferSelectFixtures),
        xml: clone(xmlFixtures),
        bays: clone(bayFixtures.bays),
        stockersByBay: clone(bayFixtures.stockersByBay),
<<<<<<< HEAD
        setting: clone(settingFixtures),
        settingConfig: null,
        eenModify: clone(eenModifyFixtures),
<<<<<<< HEAD
        remoteCvd: clone(remoteCvdFixtures),
=======
=======
        update: { scenario: updateFixtures.defaultScenario, downloadCount: 0 },
>>>>>>> 0fa81fb (fix(ATSOP26-2285): fix review comments)
>>>>>>> 8cfd5f7 (fix(ATSOP26-2285): fix review comments)
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
  };
}
