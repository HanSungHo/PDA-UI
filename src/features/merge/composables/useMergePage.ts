import { computed, nextTick, ref } from 'vue';
import { useRouter } from 'vue-router';

import { DeviceInfo } from '~/constants/deviceinfo';
import { ROUTE } from '~/constants/routes';

import {
  executeMergeLot,
  getMergeLot,
  type MergeLotInfo,
  type MergeLotRow,
} from '../services/merge.service';

const EMPTY_INFO: MergeLotInfo = {
  AREA: '',
  LOTHOLDSTATE: '',
  PROCESSOPERATIONNAME: '',
  OPERATIONDESCRIPTION: '',
  PRODUCTSPECNAME: '',
  PRODUCTQUANTITY: '',
  REWORKSTATE: '',
  PROCESSFLOWNAME: '',
  CHECKMFGGROUP2: '',
  CHILDLOT: '',
  items: [],
};

export function useMergePage() {
  const router = useRouter();
  const lotId = ref('');
  const lotInputRef = ref<{ focus: () => void; select: () => void } | null>(null);
  const gMainLotId = ref('');
  const info = ref<MergeLotInfo>({ ...EMPTY_INFO });
  const rows = ref<MergeLotRow[]>([]);
  const comment = ref('');
  const selectAll = ref(false);
  const selectedRowList = ref<number[]>([]);
  const busy = ref(false);
  const searching = ref(false);
  const dialog = ref({ open: false, title: '', message: '', confirm: false });
  let dialogResolve: ((confirmed: boolean) => void) | undefined;
  const allSelected = computed(
    () => rows.value.length > 0 && selectedRowList.value.length === rows.value.length,
  );

  function showDialog(title: string, message: string, confirm = false): Promise<boolean> {
    dialog.value = { open: true, title, message, confirm };
    return new Promise((resolve) => {
      dialogResolve = resolve;
    });
  }

  function closeDialog(confirmed: boolean): void {
    dialog.value.open = false;
    dialogResolve?.(confirmed);
    dialogResolve = undefined;
  }

  function clearData(): void {
    info.value = { ...EMPTY_INFO };
    rows.value = [];
    comment.value = '';
    gMainLotId.value = '';
    selectedRowList.value = [];
    selectAll.value = false;
  }

  async function getMergeLotInfo(): Promise<void> {
    if (busy.value) return;
    busy.value = true;
    searching.value = true;
    clearData();
    try {
      const searchedLot = lotId.value;
      if (!searchedLot) {
        await showDialog('에  러', 'LOT ID을 입력하세요');
        return;
      }
      const result = await getMergeLot(DeviceInfo.FACILITY, searchedLot);
      if (result.CHECKMFGGROUP2 === 'Y') {
        const confirmed = await showDialog(
          '경  고',
          '자동화 진행 이력이 확인되지 않습니다.\n진행 하시겠습니까?',
          true,
        );
        if (!confirmed) return;
      }
      gMainLotId.value = searchedLot;
      info.value = result;
      if (!result.items.length) {
        await showDialog('에  러', 'Merge할 Lot이 없습니다.');
        return;
      }
      if (result.CHILDLOT === 'Y') {
        await showDialog(
          '경  고',
          'Merge 대상이 Child Lot입니다.\n확인 후 Merge 진행하시길 바랍니다.',
        );
      }
      rows.value = result.items;
    } catch (error) {
      await showDialog('에  러', error instanceof Error ? error.message : 'GETMERGELOT failed.');
      gMainLotId.value = '';
      lotId.value = '';
      await nextTick();
      lotInputRef.value?.focus();
      lotInputRef.value?.select();
    } finally {
      busy.value = false;
      searching.value = false;
    }
  }

  // Android's keyboard/scanner Enter uses BarcodeStyle.lotId; the search button uses raw input.
  async function onLotEnter(): Promise<void> {
    const raw = lotId.value;
    if (!raw.startsWith(' ')) {
      lotId.value = '';
      clearData();
      await showDialog('READING ERROR', 'LOT#를 읽어주세요.');
      return;
    }
    let parsed = raw.slice(1);
    if (parsed.startsWith('$')) parsed = parsed.slice(1).trimStart();
    lotId.value = parsed.slice(0, -1).toUpperCase();
    if (lotId.value) await getMergeLotInfo();
    else clearData();
  }

  function selectLotList(index: number): void {
    const current = selectedRowList.value;
    selectedRowList.value = current.includes(index)
      ? current.filter((i) => i !== index)
      : [...current, index];
  }

  function selectAllRow(): void {
    if (!rows.value.length) return;
    selectAll.value = !selectAll.value;
    selectedRowList.value = selectAll.value ? rows.value.map((_, index) => index) : [];
  }

  function inquireLotInfo(): void {
    void router.push({ path: `/${ROUTE.lotStatus}`, query: { LOTID: lotId.value } });
  }

  async function executeMerge(): Promise<void> {
    if (busy.value) return;
    if (!selectedRowList.value.length) {
      await showDialog('에  러', 'Merge할 LOT을 선택해주세요.');
      return;
    }
    const arrMergeLot = selectedRowList.value
      .map((index) => {
        const row = rows.value[index];
        return `${row.LOTNAME} ${row.PRODUCTQUANTITY}`;
      })
      .join(',');
    if (!lotId.value) {
      await showDialog('에  러', 'LOT ID을 입력하세요');
      return;
    }
    busy.value = true;
    try {
      const result = await executeMergeLot({
        facility: DeviceInfo.FACILITY,
        lotName: gMainLotId.value,
        productSpec: info.value.PRODUCTSPECNAME,
        route: info.value.PROCESSFLOWNAME,
        operation: info.value.PROCESSOPERATIONNAME,
        qty: info.value.PRODUCTQUANTITY,
        operatorId: DeviceInfo.OPERATOR_ID,
        comment: comment.value,
        mergeLot: arrMergeLot,
      });
      if (result.FAILLOTNAME) await showDialog('에  러', result.FAILLOTNAME);
      if (result.SUCCESS === 'Y') {
        await showDialog('확  인', '작업을 수행하였습니다.');
        clearData();
        lotId.value = '';
        await nextTick();
        lotInputRef.value?.focus();
      }
    } catch (error) {
      await showDialog('에  러', error instanceof Error ? error.message : 'EXECUTEMERGE failed.');
      await nextTick();
      lotInputRef.value?.focus();
      lotInputRef.value?.select();
    } finally {
      busy.value = false;
    }
  }

  function close(): void {
    router.back();
  }

  return {
    lotId,
    lotInputRef,
    gMainLotId,
    info,
    rows,
    comment,
    selectedRowList,
    allSelected,
    busy,
    searching,
    dialog,
    closeDialog,
    clearData,
    getMergeLotInfo,
    onLotEnter,
    selectLotList,
    selectAllRow,
    inquireLotInfo,
    executeMerge,
    close,
  };
}
