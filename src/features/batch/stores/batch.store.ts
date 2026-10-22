import { defineStore } from 'pinia';
import { COMMON_FIELD as TEXT } from 'src/constants/common-strings';
import { DeviceInfo } from 'src/constants/deviceinfo';
import {
  checkBatchCreate,
  fetchBatchCount,
  fetchBatchListByLot,
  fetchBatchZone,
  fetchLotInfo,
  fetchMachineInfo,
  fetchParentBatchIds,
  submitBatch,
} from 'src/features/batch/services/batch.service';
import { computed, ref } from 'vue';

import type {
  BatchGridItem,
  BatchListByLotResponse,
  BatchLotInfoResponse,
  BatchSamplingFields,
  BatchSubmitItem,
  ParentBatchIdItem,
} from '../types/batch.types';

interface BatchActionResult {
  ok: boolean;
  message?: string;
  title?: string;
  focus?: 'lot' | 'machine';
}
interface BatchDialogHooks {
  alert?: (message: string, title: string) => Promise<void>;
  confirm?: (message: string, title?: string) => Promise<boolean>;
}
const MAX_BATCH_COUNT = 6;
function failure(
  message: string,
  title: string = TEXT.TXTDIALOGTITLE_ERROR,
  focus?: 'lot' | 'machine',
): BatchActionResult {
  return { ok: false, message, title, ...(focus ? { focus } : {}) };
}
function hasLot(row: BatchGridItem): boolean {
  return Boolean(row.LOTID);
}
function flag(value: string | undefined): string {
  return value ? 'Y' : 'N';
}
const emptyItem = (): BatchSubmitItem => ({
  ZONE: '',
  LOTID: '',
  OPERATION: '',
  SUBOPERATION: '',
  SLOTTYPE: '',
  PTIN: '',
  THIN: '',
});

export const useBatchStore = defineStore('batch', () => {
  const awaitingBatchsub = ref(false);
  const radioType = ref<'RUN' | 'M'>('RUN');
  const editMachine = ref(''),
    editLotNo = ref(''),
    txtBatId = ref(''),
    txtProductName = ref(''),
    txtStep = ref(''),
    txtCount = ref('');
  const monitorWaferCount = ref('');
  const checkBoxChild = ref(false),
    checkBoxChildBatch = ref(false);
  const parentBatchIds = ref<ParentBatchIdItem[]>([]),
    selectedParentBatchId = ref(''),
    selectedChildZone = ref('');
  const parentSelectionEnabled = ref(false);
  const viewFlagSnapshots = new Map<
    BatchGridItem,
    Pick<BatchGridItem, 'ISDCOL' | 'THIN' | 'PTIN'>
  >();
  const selectedGridRowIndex = ref<number | undefined>(0);
  const childCheckDisabled = ref(false),
    parentBatchLocked = ref(false),
    childZoneLocked = ref(false);
  const selectedRowIndex = ref(0),
    batchItemList = ref<BatchGridItem[]>([]);
  const pslotname = ref(''),
    psjaCount = ref('0');
  const relatedBatchEnabled = ref(false),
    relatedBatchLabel = ref('子');
  const m_lot_sProcessState = ref(''),
    m_lot_sProcessType = ref(''),
    m_lot_Recipe = ref('');
  const batchType = computed(() => (radioType.value === 'M' ? 'M' : 'R'));
  const monitorWaferCountDisabled = computed(() => radioType.value !== 'M');
  const zoneColumnVisible = computed(() => radioType.value === 'RUN');
  const footerActionText = computed(() => (txtBatId.value ? '변경' : '등록'));
  const btnDeleteBatchEnabled = computed(() => Boolean(txtBatId.value));
  const validBatchItems = computed(() => batchItemList.value.filter(hasLot));
  const parentBatchDisabled = computed(
    () => !parentSelectionEnabled.value || parentBatchLocked.value,
  );
  const childZoneDisabled = computed(() => !parentSelectionEnabled.value || childZoneLocked.value);
  const rowDeleteEnabled = computed(() => {
    const index = selectedRowIndex.value;
    if (index === MAX_BATCH_COUNT || !batchItemList.value[index]?.LOTID) return false;
    return index === MAX_BATCH_COUNT - 1 || index === batchItemList.value.length - 2;
  });

  function setGrid(): void {
    viewFlagSnapshots.clear();
    selectedGridRowIndex.value = selectedRowIndex.value;
    batchItemList.value = [{ NUM: String(selectedRowIndex.value) }];
  }
  function initializeBatchForm(): void {
    awaitingBatchsub.value = false;
    radioType.value = 'RUN';
    monitorWaferCount.value = '';
    editMachine.value = '';
    editLotNo.value = '';
    txtBatId.value = '';
    txtProductName.value = '';
    txtStep.value = '';
    txtCount.value = '';
    checkBoxChild.value = false;
    checkBoxChildBatch.value = false;
    parentBatchIds.value = [];
    selectedParentBatchId.value = '';
    selectedChildZone.value = '';
    parentSelectionEnabled.value = false;
    childCheckDisabled.value = false;
    parentBatchLocked.value = false;
    childZoneLocked.value = false;
    selectedRowIndex.value = 0;
    pslotname.value = '';
    psjaCount.value = '0';
    m_lot_sProcessState.value = '';
    m_lot_sProcessType.value = '';
    m_lot_Recipe.value = '';
    relatedBatchEnabled.value = false;
    relatedBatchLabel.value = '子';
    setGrid();
  }
  // btn_initialize and related-batch navigation do not call activityInit in Android.
  function resetGridForm(): void {
    editMachine.value = '';
    editLotNo.value = '';
    txtBatId.value = '';
    txtProductName.value = '';
    txtCount.value = '';
    txtStep.value = '';
    checkBoxChild.value = false;
    checkBoxChildBatch.value = false;
    parentSelectionEnabled.value = false;
    selectedParentBatchId.value = '';
    selectedChildZone.value = '';
    m_lot_sProcessState.value = '';
    selectedRowIndex.value = 0;
    setGrid();
  }
  function btnInitialize(): void {
    resetGridForm();
    pslotname.value = '';
    relatedBatchEnabled.value = false;
    relatedBatchLabel.value = '子';
  }
  function checkedRadioButton(type: 'RUN' | 'M'): void {
    radioType.value = type;
  }
  function setButtonStatus(): void {
    if (!checkBoxChild.value) parentSelectionEnabled.value = false;
  }
  function updateGrid(batchFlag: boolean): void {
    // Android toggles TextViews only; rebuilding from its JSONArray discards those edits.
    for (const [row, flags] of viewFlagSnapshots) Object.assign(row, flags);
    viewFlagSnapshots.clear();
    if (!batchFlag) selectedRowIndex.value++;
    if (
      batchItemList.value.length < MAX_BATCH_COUNT &&
      selectedRowIndex.value === batchItemList.value.length
    ) {
      batchItemList.value.push({ NUM: String(selectedRowIndex.value) });
    }
    selectedGridRowIndex.value =
      selectedRowIndex.value < MAX_BATCH_COUNT ? selectedRowIndex.value : undefined;
    setButtonStatus();
  }
  function selectBatchLot(key: string | number): void {
    const index = Number(key);
    if (!Number.isInteger(index) || index < 0 || index >= batchItemList.value.length) return;
    selectedGridRowIndex.value = index;
    selectedRowIndex.value = Number(batchItemList.value[index].NUM);
    const row = batchItemList.value[index];
    editLotNo.value = row.LOTID || '';
    txtProductName.value = row.PRODUCT || '';
    txtCount.value = row.VIEWCOUNT || '';
    // Keep the source concatenation, including PROCESSSTEP already formatted at insertion.
    txtStep.value = `${row.PROCESSSTEP || ''}(${row.OPERATION || ''}${row.SUBOPERATION || ''})`;
    setButtonStatus();
  }
  function toggleBatchCell(key: string | number, prop: string): void {
    const row = batchItemList.value[Number(key)];
    if (!row) return;
    const canToggle =
      prop === 'ISDCOL'
        ? row.LOTID !== 'D/W' && radioType.value === 'RUN'
        : prop === 'THIN'
          ? row.THSPEC === 'Y'
          : prop === 'PTIN' &&
            Boolean(row.LOTID) &&
            row.LOTID !== 'D/W' &&
            row.THSPEC === 'Y' &&
            row.PTSPEC === 'Y';
    if (!canToggle || (prop !== 'ISDCOL' && prop !== 'THIN' && prop !== 'PTIN')) return;
    if (!viewFlagSnapshots.has(row))
      viewFlagSnapshots.set(row, { ISDCOL: row.ISDCOL, THIN: row.THIN, PTIN: row.PTIN });
    if (row[prop] === 'N') row[prop] = 'Y';
    else if (row[prop] === 'Y') row[prop] = 'N';
  }
  function btnDeleteBatch(): void {
    if (!rowDeleteEnabled.value) return;
    batchItemList.value.splice(selectedRowIndex.value, 2);
    selectedRowIndex.value--;
    updateGrid(false);
    txtProductName.value = '';
    txtStep.value = '';
    txtCount.value = '';
    editLotNo.value = '';
  }
  async function getMachineInfo(): Promise<BatchActionResult> {
    try {
      const data = await fetchMachineInfo({
        facility: DeviceInfo.FACILITY,
        eqpId: editMachine.value,
      });
      editMachine.value = data.EQPID;
      return { ok: true, message: data.MSG, title: TEXT.TXTDIALOGTITLE_WARNING, focus: 'lot' };
    } catch (error) {
      editMachine.value = '';
      throw error;
    }
  }
  function clearLotFailure(message: string): BatchActionResult {
    editLotNo.value = '';
    return failure(message, TEXT.TXTDIALOGTITLE_ERROR, 'lot');
  }
  function lotCompatibility(lotId: string, info: BatchLotInfoResponse): BatchActionResult {
    if (!m_lot_sProcessState.value) m_lot_sProcessState.value = info.STATUS;
    else if (m_lot_sProcessState.value !== info.STATUS)
      return clearLotFailure(
        `[${lotId}] LOT의 상태는  [${info.STATUS}]\n이미구성된 LOT의 상태와 동일하지 않아\nBATCH를 구성할 수 없습니다.`,
      );
    if (!m_lot_sProcessType.value) {
      if (info.PROCESSNAME !== 'MW_TEST') m_lot_sProcessType.value = info.PROCESSOPERATIONTYPE;
    } else if (
      info.PROCESSNAME !== 'MW_TEST' &&
      m_lot_sProcessType.value !== info.PROCESSOPERATIONTYPE
    ) {
      return clearLotFailure(
        `[${lotId}] Lot의 공정은  [${info.PROCESSOPERATIONTYPE}] 이며,\n이전 입력한 Lot의 공정 Type과 달라 Batch 생성이 불가 합니다.`,
      );
    }
    if (!m_lot_Recipe.value) {
      if (info.PROCESSNAME !== 'MW_TEST') m_lot_Recipe.value = info.CHECKRECIPE;
    } else if (info.PROCESSNAME !== 'MW_TEST' && m_lot_Recipe.value !== info.CHECKRECIPE) {
      return clearLotFailure(
        `[${lotId}] Lot의 Recipe는  [${info.CHECKRECIPE}] 이며,\n이전 입력한 Lot의 Recipe와 달라 Batch 생성이 불가 합니다.`,
      );
    }
    return { ok: true };
  }
  function loadBatchList(data: BatchListByLotResponse): void {
    txtBatId.value = data.BATCHID;
    editMachine.value = data.EQPID;
    if (['1', '2', '3', '4', '5', '6'].includes(data.MWCOUNT))
      monitorWaferCount.value = data.MWCOUNT;
    checkedRadioButton(data.BATCHTYPE === 'R' ? 'RUN' : 'M');
    if (data.PARENTBATCHID) {
      parentBatchIds.value = [{ BATCHID: data.PARENTBATCHID }];
      selectedParentBatchId.value = data.PARENTBATCHID;
      parentBatchLocked.value = true;
      childCheckDisabled.value = true;
    } else childCheckDisabled.value = false;
    if (data.CHILDZONE) {
      childZoneLocked.value = true;
      if (['P01', 'P02', 'P03', 'P04', 'P05', 'P06'].includes(data.CHILDZONE))
        selectedChildZone.value = data.CHILDZONE;
    }
    batchItemList.value = data.BATCHITEMS.map((row, index) => ({
      NUM: String(index),
      ISDCOL: row.ISDCOL || '',
      LOTID: row.LOTID,
      QUANTITY: row.QUANTITY || '',
      PROCESSSTEP: row.PROCESSSTEP || '',
      OPERATION: row.OPERATION || '',
      SUBOPERATION: row.SUBOPERATION || '',
      VIEWCOUNT: row.VIEWCOUNT || '',
      WAFERTYPE: '',
      PRODUCT: row.PRODUCT || '',
      RECIPE: data.RECIPE,
      PTIN: flag(row.PTIN),
      PTSPEC: flag(row.PTSPEC),
      THIN: flag(row.THIN),
      THSPEC: flag(row.THSPEC),
      STATUS: row.STATUS || '',
    })).filter(hasLot);
    if (batchItemList.value.length < MAX_BATCH_COUNT)
      batchItemList.value.push({ NUM: String(batchItemList.value.length) });
    updateGrid(true);
  }
  async function getBatchListByLot(lotId: string): Promise<BatchActionResult> {
    const id = lotId || editLotNo.value;
    batchItemList.value = [];
    if (!lotId && (!id || id === 'D/W')) return failure('LOT NO를 입력하세요.');
    const data = await fetchBatchListByLot({ lotId: id, facility: DeviceInfo.FACILITY });
    loadBatchList(data);
    if (data.PARENTBATCHID && checkBoxChild.value) await parentBatchChanged(data.PARENTBATCHID);
    return { ok: true };
  }
  function setRelatedBatch(info: BatchLotInfoResponse): void {
    relatedBatchEnabled.value = Boolean(info.JALOT || info.MOLOT);
    if (!relatedBatchEnabled.value) return;
    psjaCount.value = '0';
    pslotname.value = '';
    if (info.JALOT) {
      relatedBatchLabel.value = '子';
      if (Number(info.JACOUNT) === 1) pslotname.value = info.JALOT;
      else psjaCount.value = info.JACOUNT;
    } else {
      relatedBatchLabel.value = '母';
      pslotname.value = info.MOLOT;
    }
  }
  async function getLotInfo(hooks: BatchDialogHooks = {}): Promise<BatchActionResult> {
    const lotId = editLotNo.value;
    let info: BatchLotInfoResponse;
    try {
      info = await fetchLotInfo({
        lotId,
        facility: DeviceInfo.FACILITY,
        zone: String(selectedRowIndex.value + 1),
        eqpId: editMachine.value,
        addedLotId: validBatchItems.value.map((row) => `'${row.LOTID}'`).join(','),
      });
    } catch (error) {
      editLotNo.value = '';
      throw error;
    }
    txtCount.value = info.VIEWCOUNT;
    relatedBatchEnabled.value = false;
    let search = false;
    if (txtBatId.value) {
      if (info.BATCHID && info.BATCHID !== txtBatId.value)
        return failure(`[${lotId}]은 [${info.BATCHID}]BATCH ID에 포함되어 있는 LOT입니다.`);
    } else if (info.BATCHID) {
      if (selectedRowIndex.value !== 0)
        return failure(`[${lotId}]은 [${info.BATCHID}]BATCH ID에 포함되어 있는 LOT입니다.`);
      if (
        !(await hooks.confirm?.(
          `[${lotId}]은 [${info.BATCHID}]BATCH ID에 포함되어 있는 LOT입니다.\n조회 하시겠습니까?`,
          TEXT.TXTDIALOGTITLE_INFORM,
        ))
      )
        return { ok: false };
      search = true;
    }
    if (!search) {
      for (const key of [
        'CHECKMACHINE',
        'CHECKOPERTION',
        'CHECKDEPOCOMMENT',
        'CHECKTHCIKNESSCOMMENT',
        'CHECKRECYCLECOMMENT',
      ] as const) {
        if (info[key]) return failure(info[key], TEXT.TXTDIALOGTITLE_OK);
      }
    }
    if (info.MAXBATCHMESSAGE) return failure(info.MAXBATCHMESSAGE, TEXT.TXTDIALOGTITLE_OK);
    if (info.CHECKQTIME) await hooks.alert?.(info.CHECKQTIME, TEXT.TXTDIALOGTITLE_OK);
    if (info.FQCSAMPLE) await hooks.alert?.(info.FQCSAMPLE, TEXT.TXTDIALOGTITLE_INFORM);
    const step = `${info.PROCESSSTEP}(${info.OPERATION}${info.SUBOPERATION})`;
    txtProductName.value = info.PRODUCT;
    txtStep.value = step;
    if (search) {
      // Android starts the batch-list request separately, then updates relation/input state.
      const loading = getBatchListByLot('');
      setRelatedBatch(info);
      editLotNo.value = '';
      const result = await loading;
      if (!result.ok) return result;
    } else {
      if (
        !checkBoxChildBatch.value &&
        info.LIMITZONE !== 'O' &&
        info.LIMITRECIPE === info.STEPRECIPE
      ) {
        return failure(
          `[${lotId}] Lot은 해당Zone [${info.LIMITZONE}]에서 Batch진행 할 수 없습니다. 다시 선택해 주세요.`,
        );
      }
      if (selectedRowIndex.value === MAX_BATCH_COUNT)
        return clearLotFailure('LOT을 입력할 ROW를 먼저 선택하세요.');
      if (validBatchItems.value.some((row) => row.LOTID === lotId))
        return clearLotFailure('이미 BATCH구성된 LOT입니다.');
      const result = lotCompatibility(lotId, info);
      if (!result.ok) return result;
      const dummy = info.PROCESSNAME === 'MW_TEST';
      batchItemList.value[selectedRowIndex.value] = {
        NUM: String(selectedRowIndex.value),
        ISDCOL: radioType.value === 'M' ? 'N' : 'Y',
        LOTID: lotId,
        PRODUCT: info.PRODUCT,
        QUANTITY: info.QUANTITY,
        PROCESSSTEP: step,
        OPERATION: info.OPERATION,
        SUBOPERATION: info.SUBOPERATION,
        N: 'N',
        RECIPE: info.STEPRECIPE,
        VIEWCOUNT: dummy ? info.VIEWCOUNT : '',
        WAFERTYPE: dummy ? 'D/W' : '',
        THIN: 'N',
        THSPEC: dummy ? 'N' : 'Y',
        PTIN: flag(info.PTIN),
        PTSPEC: flag(info.PTSPEC),
      };
      updateGrid(false);
    }
    editLotNo.value = '';
    return { ok: true, focus: 'lot' };
  }
  function clearChildSelection(): void {
    parentSelectionEnabled.value = false;
    selectedParentBatchId.value = '';
    selectedChildZone.value = '';
  }
  async function getParentBatchId(): Promise<BatchActionResult> {
    let lots = '';
    for (const row of batchItemList.value) {
      const id = row.LOTID || '',
        type = row.WAFERTYPE || '';
      if (id !== '' || type !== 'D/W') lots = lots ? `${lots},${id}` : id;
    }
    if (!editMachine.value) return failure('장비명 먼저 입력후 선택하세요');
    if (!lots || lots === 'null') {
      checkBoxChild.value = false;
      clearChildSelection();
      return failure('LOT 먼저 입력후 선택하세요');
    }
    try {
      const items = await fetchParentBatchIds({
        facility: DeviceInfo.FACILITY,
        eqpId: editMachine.value,
        checkLotId: lots,
      });
      if (items.length) {
        parentSelectionEnabled.value = true;
        parentBatchIds.value = items;
        selectedParentBatchId.value = items[0].BATCHID;
        parentBatchLocked.value = false;
        childZoneLocked.value = false;
        if (checkBoxChild.value) await parentBatchChanged(selectedParentBatchId.value);
      }
      return { ok: true };
    } catch (error) {
      checkBoxChild.value = false;
      clearChildSelection();
      throw error;
    }
  }
  async function checkBoxChildChanged(checked: boolean): Promise<BatchActionResult> {
    checkBoxChild.value = checked;
    if (!checked) {
      clearChildSelection();
      return { ok: true };
    }
    return getParentBatchId();
  }
  async function parentBatchChanged(batchId: string): Promise<void> {
    selectedParentBatchId.value = batchId;
    if (!batchId || !checkBoxChild.value) return;
    try {
      const result = await fetchBatchZone({ facility: DeviceInfo.FACILITY, batchId });
      if (['P01', 'P02', 'P03', 'P04', 'P05', 'P06'].includes(result.ZONE))
        selectedChildZone.value = result.ZONE;
    } catch (error) {
      checkBoxChild.value = false;
      clearChildSelection();
      throw error;
    }
  }
  async function applyBatchsubResult(
    result: { JALOTNAME: string },
    hooks: BatchDialogHooks = {},
  ): Promise<BatchActionResult> {
    if (!result.JALOTNAME) return { ok: false };
    resetGridForm();
    editLotNo.value = result.JALOTNAME;
    return getLotInfo(hooks);
  }
  async function searchRelatedBatch(
    hooks: BatchDialogHooks = {},
  ): Promise<BatchActionResult & { openBatchsub?: string }> {
    if (!relatedBatchEnabled.value) return { ok: false };
    const id = txtBatId.value,
      lotId = pslotname.value;
    if (lotId) {
      resetGridForm();
      editLotNo.value = lotId;
      return getLotInfo(hooks);
    }
    return Number(psjaCount.value) > 1 ? { ok: false, openBatchsub: id } : { ok: false };
  }
  function buildBatchItems(): BatchSubmitItem[] {
    const items = batchItemList.value.map((row) => ({
      ZONE:
        radioType.value === 'M' || row.LOTID === 'D/W' || row.WAFERTYPE === 'D/W'
          ? 'N'
          : row.ISDCOL || '',
      LOTID: row.LOTID || '',
      OPERATION: row.OPERATION || '',
      SUBOPERATION: row.SUBOPERATION || '',
      SLOTTYPE: row.WAFERTYPE || '',
      PTIN: row.PTIN || '',
      THIN: row.THIN || '',
    }));
    while (items.length < MAX_BATCH_COUNT) items.push(emptyItem());
    return items;
  }
  async function createBatch(
    items: BatchSubmitItem[],
    hooks: BatchDialogHooks = {},
    sampling?: BatchSamplingFields,
  ): Promise<BatchActionResult> {
    const child = checkBoxChild.value;
    const data = await submitBatch({
      type: txtBatId.value ? 'M' : 'C',
      facility: DeviceInfo.FACILITY,
      eqpId: editMachine.value,
      batchId: txtBatId.value,
      batchType: batchType.value,
      childCheck: child ? 'Y' : '',
      parentBatchId: child ? selectedParentBatchId.value : '',
      childZone: child ? selectedChildZone.value : '',
      operatorId: `${child ? '[Y]' : ''}${DeviceInfo.OPERATOR_ID}`,
      rowNo: String(MAX_BATCH_COUNT),
      monitorWaferCount:
        radioType.value === 'M'
          ? monitorWaferCount.value
          : String(batchItemList.value.filter((row) => row.WAFERTYPE !== 'D/W').length),
      items,
      ...(sampling ? { sampling } : {}),
    });
    for (const key of ['INTERLOCKMSG', 'TTINTERLOCKMSG', 'NOTICEDOWN'] as const)
      if (data[key]) await hooks.alert?.(data[key], TEXT.TXTDIALOGTITLE_WARNING);
    return { ok: true };
  }
  async function setBatchCheck(
    items: BatchSubmitItem[],
    hooks: BatchDialogHooks = {},
  ): Promise<BatchActionResult> {
    const data = await checkBatchCreate({
      facility: DeviceInfo.FACILITY,
      eqpId: editMachine.value,
      childCheck: checkBoxChild.value ? 'Y' : 'N',
      items,
    });
    if (
      data.BATCHMESSGE &&
      (await hooks.confirm?.(
        `${data.BATCHMESSGE}\n\n선택을 하시겠습니까?`,
        TEXT.TXTDIALOGTITLE_ERROR,
      ))
    )
      return { ok: false };
    const sampling: BatchSamplingFields | undefined = data.SAMPLECYCLE
      ? {
          CUMCOUNT: data.CUMCOUNT,
          MAXCOUNT: data.MAXCOUNT,
          UPDATEFLAG: data.UPDATEFLAG,
          UVFLAG: data.UVFLAG,
          SAMPLECYCLE: data.SAMPLECYCLE,
        }
      : undefined;
    if (data.REMOTE) await hooks.alert?.('Remote 장비 입니다.', TEXT.TXTDIALOGTITLE_INFORM);
    return createBatch(items, hooks, sampling);
  }
  async function setBatch(hooks: BatchDialogHooks = {}): Promise<BatchActionResult> {
    if (radioType.value === 'M') {
      if (!monitorWaferCount.value) return failure('MONITOR WAFER 갯수를 입력하세요.');
      if (Number(monitorWaferCount.value) > MAX_BATCH_COUNT)
        return failure('MONITOR WAFER 갯수는 6개를 넘을수 없습니다.');
    }
    if (!editMachine.value) return failure('장비를 입력하세요.');
    const items = buildBatchItems();
    if (checkBoxChild.value) {
      if (!selectedParentBatchId.value || !selectedChildZone.value)
        return failure('모 BATCH ID와 자 ZONE을 입력 하세요.', '필수 입력');
      return createBatch(items, hooks);
    }
    return setBatchCheck(items, hooks);
  }
  async function deleteBatch(hooks: BatchDialogHooks = {}): Promise<BatchActionResult> {
    if (!txtBatId.value) return failure('먼저 BATCH ID를 조회하세요.');
    if (
      !(await hooks.confirm?.(
        `[${txtBatId.value}] BATCH ID를 삭제 하시겠습니까?`,
        TEXT.TXTDIALOGTITLE_ERROR,
      ))
    )
      return { ok: false };
    await submitBatch({
      type: 'D',
      facility: DeviceInfo.FACILITY,
      eqpId: editMachine.value,
      batchId: txtBatId.value,
      batchType: '',
      childCheck: checkBoxChild.value ? 'Y' : '',
      parentBatchId: '',
      childZone: '',
      operatorId: DeviceInfo.OPERATOR_ID,
      rowNo: '6',
      monitorWaferCount: '',
      items: [],
    });
    return { ok: true };
  }
  async function getBatchCount(): Promise<BatchActionResult> {
    const data = await fetchBatchCount();
    return data.BATCHCOUNTVIEW
      ? { ok: true, message: data.BATCHCOUNTVIEW, title: 'BATCH COUNT 확인' }
      : failure('BATCHCOUNT 가 확인되지 않습니다.');
  }
  initializeBatchForm();
  return {
    awaitingBatchsub,
    batchItemList,
    batchType,
    btnBatchInput: setBatch,
    btnDeleteBatch,
    btnDeleteBatchEnabled,
    rowDeleteEnabled,
    checkBoxChild,
    checkBoxChildBatch,
    checkBoxChildChanged,
    checkedRadioButton,
    deleteBatch,
    editLotNo,
    editMachine,
    footerActionText,
    getBatchCount,
    getLotInfo,
    getMachineInfo,
    getBatchListByLot,
    initializeBatchForm,
    btnInitialize,
    monitorWaferCount,
    monitorWaferCountDisabled,
    parentBatchChanged,
    parentBatchIds,
    psjaCount,
    pslotname,
    radioType,
    selectedChildZone,
    selectedParentBatchId,
    selectedRowIndex,
    selectedGridRowIndex,
    setButtonStatus,
    txtBatId,
    txtCount,
    txtProductName,
    txtStep,
    validBatchItems,
    zoneColumnVisible,
    applyBatchsubResult,
    childCheckDisabled,
    parentBatchDisabled,
    childZoneDisabled,
    relatedBatchEnabled,
    relatedBatchLabel,
    searchRelatedBatch,
    selectBatchLot,
    toggleBatchCell,
    setBatch,
    setBatchCheck,
    createBatch,
    updateGrid,
    getParentBatchId,
    getZone: parentBatchChanged,
  };
});
