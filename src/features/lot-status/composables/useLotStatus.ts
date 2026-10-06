import { storeToRefs } from 'pinia';
import { ROUTE } from 'src/constants/routes';
import { useMainStore } from 'src/features/main/stores/main.store';
import { useWaferSelectStore } from 'src/features/move-out/stores/wafer-select.store';
import { okDialog } from 'src/services/ok-dialog.service';
import { barcodeStyleLotId } from 'src/utils/barcode-style';
import { computed, nextTick, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import {
  fetchLotStatus,
  fetchSlotParticle,
  type LotStatusBody,
} from '../services/lot-status.service';

const EMPTY = {
  txtJobResult: '',
  txtStatusResult: '',
  txtProductName: '',
  txtCurrentOperation: '',
  tOperation: '',
  txtRework: '',
  txtReworkCount: '',
  txtRwCd: '',
  txtHold: '',
  txtHoldCd: '',
  txtArea: '',
  txtQuantity: '',
  txtDueData: '',
  txtBay: '',
  txtOwner: '',
  txtStk: '',
  txtLotKinds: '',
  txtMachine: '',
  txtFacility: '',
};

function value(body: LotStatusBody, key: string): string {
  const raw = body[key];
  return typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean'
    ? String(raw)
    : '';
}

function formatDueDate(value: string): string {
  if (!value) return '';
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(value);
  if (!match) return '';
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

export function mapLotStatus(body: LotStatusBody): typeof EMPTY {
  const operation = value(body, 'OPERATION');
  const subOperation = value(body, 'SUBOPERATION');
  const nextOperation = value(body, 'NEXTOPERATION');
  const nextSubOperation = value(body, 'NEXTSUBOPERATION');
  const dueDate = value(body, 'DUEDATE');
  return {
    txtJobResult: value(body, 'JOBCODE'),
    txtStatusResult: value(body, 'HOLDCODE') === 'ONHOLD' ? 'HOLD' : value(body, 'STATUS'),
    txtProductName: value(body, 'PRODUCT'),
    txtCurrentOperation: `${value(body, 'PROCESSSTEP')}(${operation}${subOperation})`,
    tOperation: `${value(body, 'NEXTPROCESSSTEP')}(${nextOperation}${nextSubOperation})`,
    txtRework: value(body, 'REWORKINFO'),
    txtReworkCount: value(body, 'REWORKCOUNT'),
    txtRwCd: value(body, 'REWORKCODE'),
    txtHold: value(body, 'HOLDCODE') === 'ONHOLD' ? 'Y' : 'N',
    txtHoldCd: value(body, 'HOLDCODE'),
    txtArea: value(body, 'AREA'),
    txtQuantity: value(body, 'QUANTITY'),
    txtDueData: formatDueDate(dueDate),
    txtBay: value(body, 'BAY'),
    txtOwner: value(body, 'OWNER'),
    txtStk: value(body, 'STOCKER'),
    txtLotKinds: value(body, 'CATEGORY'),
    txtMachine: value(body, 'CURRENTEQPID'),
    txtFacility: value(body, 'FACILITY'),
  };
}

export function useLotStatus() {
  const router = useRouter();
  const waferSelectStore = useWaferSelectStore();
  const { facility } = storeToRefs(useMainStore());
  const editLotNo = ref('');
  const fields = reactive({ ...EMPTY });
  const loading = ref(false);
  const hasResult = ref(false);
  const searchHoldComment = ref('');
  const searchWaferList = ref('');
  const g_operation = ref('');
  const g_Lot = ref('');
  let lastButtonClick = 0;
  const statusKind = computed(() => {
    const status = fields.txtStatusResult;
    return status === 'RUN' || status === 'WAIT' || status === 'HOLD'
      ? status.toLowerCase()
      : status
        ? 'other'
        : '';
  });

  function clearData(): void {
    Object.assign(fields, EMPTY);
    hasResult.value = false;
    searchHoldComment.value = '';
    searchWaferList.value = '';
    g_operation.value = '';
    g_Lot.value = '';
  }

  async function searchData(lotId = editLotNo.value): Promise<void> {
    if (loading.value) return;
    document.getElementById('lot-status-lot')?.blur();
    clearData();
    if (!lotId) {
      void okDialog.show('에  러', 'LOT ID을 입력하세요', '확인');
      return;
    }
    loading.value = true;
    try {
      const body = await fetchLotStatus(lotId, facility.value);
      Object.assign(fields, mapLotStatus(body));
      g_Lot.value = editLotNo.value;
      g_operation.value = `${value(body, 'OPERATION')}-${value(body, 'SUBOPERATION')}`;
      searchHoldComment.value = value(body, 'HOLD_COMMENT');
      searchWaferList.value = value(body, 'WAFERLIST');
      hasResult.value = true;
    } catch (error) {
      void okDialog.show(
        '에  러',
        error instanceof Error ? error.message : 'LOTINFO failed.',
        '확인',
      );
    } finally {
      loading.value = false;
      await nextTick();
      const input = document.getElementById('lot-status-lot') as HTMLInputElement | null;
      input?.focus();
      input?.select();
    }
  }

  function updateLotNo(next: string): void {
    editLotNo.value = next.toUpperCase();
  }

  function handleLotEnter(): void {
    const { isValid, parsedId } = barcodeStyleLotId(editLotNo.value);
    if (!isValid) {
      editLotNo.value = '';
      clearData();
      return;
    }
    editLotNo.value = parsedId.toUpperCase();
    void searchData(editLotNo.value);
  }

  async function getSlotParticleInfo(): Promise<void> {
    try {
      const items = await fetchSlotParticle(facility.value, g_Lot.value, g_operation.value);
      const details = JSON.stringify(items)
        .replace(/},/g, '\n')
        .replace(/["{}[\]]/g, '')
        .replace(/,/g, '  ');
      void okDialog.show('HOLD Comment정보', `${searchHoldComment.value}\n${details}`, '확인');
    } catch (error) {
      void okDialog.show(
        '에  러',
        `${searchHoldComment.value}\n${error instanceof Error ? error.message : 'SLOTPARTICLE failed.'}`,
        '확인',
      );
    }
  }

  function showHoldCd(): void {
    if (searchHoldComment.value === 'SPC OUT HOLD') {
      void getSlotParticleInfo();
    } else if (searchHoldComment.value) {
      void okDialog.show('HOLD Comment정보', searchHoldComment.value, '확인');
    }
  }

  function showWafer(): void {
    if (!hasResult.value) {
      void okDialog.show('에  러', '조회된 정보가 없습니다.', '확인');
      return;
    }
    waferSelectStore.start({
      EDITABLE: 'N',
      LOTID: editLotNo.value,
      EXISTWAFERLIST: searchWaferList.value,
    });
    void router.push(`/${ROUTE.waferSelect}`);
  }

  function close(): void {
    void router.back();
  }

  // LotStatusActivity uses one OnSingleClickListener for all four buttons.
  function onSingleClick(action: 'search' | 'wafer' | 'hold' | 'close'): void {
    const now = Date.now();
    if (now - lastButtonClick <= 1000) return;
    lastButtonClick = now;

    switch (action) {
      case 'search':
        void searchData();
        break;
      case 'wafer':
        showWafer();
        break;
      case 'hold':
        showHoldCd();
        break;
      case 'close':
        close();
        break;
    }
  }

  return {
    editLotNo,
    fields,
    loading,
    hasResult,
    statusKind,
    searchHoldComment,
    searchWaferList,
    g_operation,
    g_Lot,
    clearData,
    searchData,
    updateLotNo,
    handleLotEnter,
    getSlotParticleInfo,
    showHoldCd,
    showWafer,
    close,
    onSingleClick,
  };
}
