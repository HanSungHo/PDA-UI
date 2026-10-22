import {
  getResponseErrorMessage,
  isResponseSuccessful,
  parseMessageBody,
} from 'src/services/message-response.helper';
import { barcodeStyleEqpId } from 'src/utils/barcode-style';
import { computed, ref } from 'vue';

import {
  sendShelfMessage,
  type ShelfDevice,
  type ShelfMessage,
} from '../services/shelf-incoming.service';

interface Context {
  device: ShelfDevice;
  facility: string;
  operatorId: string;
  focus: (field: 'shelf' | 'lot') => void;
}
export function useShelfIncoming(context: Context) {
  const shelfId = ref('');
  const lotId = ref('');
  const category = ref('');
  const searchShelf = ref('');
  const lots = ref<string[]>(Array.from({ length: 24 }, () => ''));
  const selected = ref<number[]>([]);
  const productSpecName = ref('');
  const operationName = ref('');
  const operationDesc = ref('');
  const loading = ref(false);
  const dialog = ref<{ title: string; message: string; focus?: 'shelf' | 'lot' } | null>(null);
  let pendingDialogFocus: 'shelf' | 'lot' | undefined;
  const hasLots = computed(() => lots.value.some(Boolean));
  const rows = computed(() =>
    Array.from({ length: 8 }, (_, row) => ({
      id: row,
      c0: lots.value[row] ?? '',
      c1: lots.value[8 + row] ?? '',
      c2: lots.value[16 + row] ?? '',
    })),
  );
  function show(message: string, title = '에  러', focus?: 'shelf' | 'lot') {
    dialog.value = { title, message, focus };
  }
  function closeDialog() {
    pendingDialogFocus = dialog.value?.focus;
    dialog.value = null;
  }
  function afterDialogClose() {
    const field = pendingDialogFocus;
    pendingDialogFocus = undefined;
    if (field) context.focus(field);
  }
  function clearShelfInfo() {
    category.value = '';
    searchShelf.value = '';
  }
  function clearLotInfo() {
    productSpecName.value = '';
    operationName.value = '';
    operationDesc.value = '';
    selected.value = [];
  }
  function clearAll() {
    shelfId.value = '';
    lotId.value = '';
    clearShelfInfo();
    clearLotInfo();
    lots.value = Array.from({ length: 24 }, () => '');
    if (dialog.value) dialog.value.focus = 'shelf';
    else context.focus('shelf');
  }
  async function request(name: ShelfMessage, fields: [string, string][]) {
    const response = await sendShelfMessage(name, fields, context.device);
    if (!isResponseSuccessful(response)) throw new Error(getResponseErrorMessage(response));
    return parseMessageBody(response);
  }
  async function searchShelfInfo(value = shelfId.value) {
    if (loading.value) return;
    clearShelfInfo();
    if (!value) {
      show('SHELF NO 를 입력하세요.', '에  러', 'shelf');
      return;
    }
    loading.value = true;
    try {
      const body = await request('SHELFCALL', [['SHELFNO', value]]);
      category.value = body.CATEGORY ?? '';
      searchShelf.value = value;
    } catch (error) {
      show(
        error instanceof Error ? error.message : 'SHELF 조회에 실패하였습니다.',
        '에  러',
        'shelf',
      );
    } finally {
      loading.value = false;
    }
  }
  async function setLotInfo(value = lotId.value) {
    if (loading.value) return;
    clearLotInfo();
    if (!value) {
      show('LOT NO를 입력하세요', '에  러', 'lot');
      return;
    }
    if (lots.value.includes(value)) {
      show('이미 같은  Lot이 선택 되었습니다.', '중 복', 'lot');
      return;
    }
    const index = lots.value.indexOf('');
    if (index < 0) {
      show('LOT 수량을 초과했습니다.', '에  러', 'lot');
      return;
    }
    loading.value = true;
    try {
      const body = await request('CHECKINSHELFLOT', [
        ['LOTID', value],
        ['FACILITY', context.facility],
      ]);
      if (body.MACHINENAME && body.LOTRESUSER)
        show(
          `${value} 은(는) ${body.MACHINENAME} 호기에 자동화 예약중인 LOT 입니다.\n${body.BAYNAME ?? ''} BAY로 이동 및 진행 상태 확인 하세요.`,
          '알  림',
          'lot',
        );
      productSpecName.value = body.PRODUCTSPECNAME ?? '';
      operationName.value = body.PROCESSOPERATIONNAME ?? '';
      operationDesc.value = body.OPERATIONDESCRIPTION ?? '';
      lots.value[index] = value;
    } catch {
      show('입고가 불가능한 LOT 입니다.', '에  러', 'lot');
    } finally {
      loading.value = false;
    }
  }
  function toggleCell(index: number) {
    if (loading.value) return;
    selected.value = selected.value.includes(index)
      ? selected.value.filter((item) => item !== index)
      : [...selected.value, index];
    context.focus('lot');
  }
  function deleteLotId() {
    if (loading.value) return;
    for (const index of selected.value) lots.value[index] = '';
    selected.value = [];
    context.focus('lot');
  }
  async function execute(command: 'SHELF IN' | 'CART IN' | 'SHELF OUT' | 'CART OUT') {
    if (loading.value) return;
    const incoming = command.endsWith(' IN');
    const insertLot = lots.value.filter(Boolean).join('|');
    if (!insertLot) {
      show('LOT을 입력하여 주세요.', '에  러', 'lot');
      return;
    }
    loading.value = true;
    try {
      const fields: [string, string][] = incoming
        ? [
            ['INSERTSHELFLOT', insertLot],
            ['SHELFNO', shelfId.value],
            ['USERID', context.operatorId],
          ]
        : [
            ['DELETESHELFLOT', insertLot],
            ['COMMANDTYPE', command],
            ['SHELFNO', shelfId.value],
            ['USERID', context.operatorId],
          ];
      const body = await request(incoming ? 'LOTINSHELF' : 'LOTOUTSHELF', fields);
      if (body.ERRORLOT) show(body.ERRORLOT);
      clearAll();
    } catch (error) {
      show(
        error instanceof Error ? error.message : '처리에 실패하였습니다.',
        '에  러',
        incoming ? undefined : 'lot',
      );
    } finally {
      loading.value = false;
    }
  }
  async function searchData(field: 'shelf' | 'lot') {
    if (loading.value) return;
    const focusText = field === 'shelf' ? shelfId.value : lotId.value;
    if (!focusText) {
      show('조회할 정보가 없습니다.', '에  러', 'shelf');
      return;
    }
    // The scanner appends a terminator character to the scanned value.
    const searchId = focusText.slice(0, -1);
    if (searchId.startsWith('EQP-$') || searchId.startsWith('eqp-$')) {
      const { isValid, parsedId } = barcodeStyleEqpId(focusText);
      if (!isValid) return;

      lots.value = Array.from({ length: 24 }, () => '');
      selected.value = [];
      shelfId.value = parsedId;
      lotId.value = '';
      await searchShelfInfo(shelfId.value);
      context.focus('lot');
    } else if (['SHELF IN', 'CART IN', 'SHELF OUT', 'CART OUT'].includes(searchId)) {
      if (!category.value) {
        show('Shelf No가 확인되지 않았습니다!', '에  러', 'shelf');
        return;
      }
      if (category.value === 'S' && searchId.includes('CART')) {
        show('SHELF를 선택 후 CART 기능을 시도하셨습니다.');
        return;
      }
      if (category.value === 'C' && searchId.includes('SHELF')) {
        show('CART를 선택 후 SHELF 기능을 시도하셨습니다.');
        return;
      }
      const pending = execute(searchId as 'SHELF IN' | 'CART IN' | 'SHELF OUT' | 'CART OUT');
      if (field === 'shelf') shelfId.value = shelfId.value.replace(focusText, '');
      else lotId.value = '';
      await pending;
    } else if (searchId.startsWith(' ')) {
      if (!category.value) {
        shelfId.value = '';
        lotId.value = '';
        show('Shelf No가 확인되지 않았습니다!', '에  러', 'shelf');
        return;
      }
      shelfId.value = searchShelf.value;
      lotId.value = searchId.slice(1);
      await setLotInfo(lotId.value);
      context.focus('lot');
    } else {
      show('입력된 정보를 확인하세요', '에  러', 'shelf');
    }
  }
  return {
    shelfId,
    lotId,
    category,
    searchShelf,
    lots,
    selected,
    productSpecName,
    operationName,
    operationDesc,
    loading,
    dialog,
    rows,
    hasLots,
    closeDialog,
    afterDialogClose,
    searchShelfInfo,
    setLotInfo,
    toggleCell,
    deleteLotId,
    execute,
    searchData,
  };
}
