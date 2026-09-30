import { defineStore } from 'pinia';
import { COMMON_FIELD } from 'src/constants/common-strings';
import { DeviceInfo } from 'src/constants/device-info';
import { barcodeStyleLotId } from 'src/utils/barcode-style';
import { computed, ref } from 'vue';

import { inputScopeDataService } from '~/features/input-scope-data/services/input-scope-data.service';
import type {
  InputScopeDataPayload,
  ScopeDataResult,
  ScopeLotMasterInfo,
  WaferSlotItem,
} from '~/features/input-scope-data/types/input-scope-data.types';

export const useInputScopeDataStore = defineStore('inputScopeData', () => {
  const lotId = ref('');
  const isLotLocked = ref(false);
  const sideRinse = ref('');
  const weeWidth = ref('');
  const logo = ref('');
  const selectedFaultCategory = ref('');
  const faultCategoryOptions = ref<string[]>([]);
  const slots = ref<WaferSlotItem[]>(inputScopeDataService.build25WaferSlots([]));
  const masterInfo = ref<ScopeLotMasterInfo | null>(null);

  const isLoading = ref(false);
  const isSaving = ref(false);

  const alertState = ref({
    visible: false,
    title: '',
    message: '',
    isError: false,
  });

  const confirmState = ref<{
    visible: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    onConfirm: () => {},
    onCancel: () => {},
  });

  const selectedWaferString = computed(() => {
    return slots.value
      .filter((s) => s.isSelected)
      .map((s) => s.slotNumber)
      .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
      .join(',');
  });

  const selectedCount = computed(() => {
    return slots.value.filter((s) => s.isSelected).length;
  });

  const maxCount = 25;

  function showAlert(title: string, message: string, isError = false) {
    alertState.value = {
      visible: true,
      title,
      message,
      isError,
    };
  }

  function closeAlert() {
    alertState.value.visible = false;
  }

  function showConfirm(
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel: () => void = () => {},
  ) {
    confirmState.value = {
      visible: true,
      title,
      message,
      onConfirm,
      onCancel,
    };
  }

  function closeConfirm() {
    confirmState.value.visible = false;
  }

  function resetWaferSelection() {
    slots.value.forEach((slot) => {
      slot.isSelected = false;
    });
  }

  function clearData() {
    masterInfo.value = null;
    sideRinse.value = '';
    weeWidth.value = '';
    logo.value = '';
    selectedFaultCategory.value = '';
    faultCategoryOptions.value = [];
    slots.value = inputScopeDataService.build25WaferSlots([]);
  }

  function resetForm() {
    lotId.value = '';
    isLotLocked.value = false;
    clearData();
  }

  async function fetchSlotInfo(targetLotId: string) {
    const slotRes = await inputScopeDataService.getSlotInfo(targetLotId);
    if (!slotRes.success) {
      showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, slotRes.errorMessage || '', true);
      isLoading.value = false;
      return;
    }

    const availableSlots = inputScopeDataService.parseWaferSlotNumbers(slotRes.waferList || '');
    slots.value = inputScopeDataService.build25WaferSlots(availableSlots, []);
    isLoading.value = false;
  }

  async function proceedWithLotInfo(data: ScopeLotMasterInfo, targetLotId: string) {
    masterInfo.value = data;
    faultCategoryOptions.value = data.faultCategories || [];
    if (data.faultCategories && data.faultCategories.length > 0 && !selectedFaultCategory.value) {
      selectedFaultCategory.value = data.faultCategories[0];
    }
    await fetchSlotInfo(targetLotId);
  }

  async function fetchScopeLotInfo(targetLotId: string) {
    if (!targetLotId.trim()) return;

    isLoading.value = true;
    const res = await inputScopeDataService.getScopeLotInfo(targetLotId.trim());

    if (!res.success || !res.data) {
      showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, res.errorMessage || '', true);
      clearData();
      isLoading.value = false;
      return;
    }

    const lotData = res.data;

    if (lotData.isExist) {
      showConfirm(
        COMMON_FIELD.TXTDIALOGTITLE_WARNING,
        '이전에 이미 입력한 데이터가 있습니다.\n기존 데이터를 삭제하고 다시 입력하시겠습니까?',
        () => {
          closeConfirm();
          void proceedWithLotInfo(lotData, targetLotId.trim());
        },
        () => {
          closeConfirm();
          isLoading.value = false;
        },
      );
    } else {
      await proceedWithLotInfo(lotData, targetLotId.trim());
    }
  }

  async function handleLotBarcodeEnter(rawInput?: string) {
    const inputToUse = rawInput !== undefined ? rawInput : lotId.value;
    const parsed = barcodeStyleLotId(inputToUse || '');

    if (!parsed.isValid) {
      // barcodeStyleLotId already shows READING ERROR dialog via okDialog service
      lotId.value = '';
      clearData();
      return;
    }

    lotId.value = parsed.parsedId;
    await fetchScopeLotInfo(lotId.value);
  }

  async function handleLotSearch(rawInput?: string) {
    const inputToUse = rawInput !== undefined ? rawInput : lotId.value;

    if (!inputToUse || !inputToUse.trim()) {
      showAlert('READING ERROR', 'LOT#를 읽어주세요.', true);
      lotId.value = '';
      clearData();
      return;
    }

    if (inputToUse.startsWith(' ')) {
      // Barcode scan path: delegate to shared util (shows READING ERROR dialog on failure)
      const parsed = barcodeStyleLotId(inputToUse);
      if (!parsed.isValid) {
        lotId.value = '';
        clearData();
        return;
      }
      lotId.value = parsed.parsedId;
    } else {
      lotId.value = inputToUse.trim();
    }

    await fetchScopeLotInfo(lotId.value);
  }

  async function initLot(initialLotId?: string) {
    if (initialLotId && initialLotId.trim()) {
      lotId.value = initialLotId.trim();
      isLotLocked.value = true;
      await fetchScopeLotInfo(lotId.value);
    } else {
      resetForm();
    }
  }

  function toggleSlot(slotNumber: string) {
    const targetSlot = slots.value.find((s) => s.slotNumber === slotNumber);
    if (!targetSlot || !targetSlot.isPresent) {
      return;
    }

    if (targetSlot.isSelected) {
      targetSlot.isSelected = false;
    } else {
      if (selectedCount.value >= maxCount) {
        showAlert(
          COMMON_FIELD.TXTDIALOGTITLE_ERROR,
          '선택한 WAFER개수가 지정된 개수를 초과하였습니다.',
          true,
        );
        return;
      }
      targetSlot.isSelected = true;
    }
  }

  async function submitScopeData(): Promise<ScopeDataResult | null> {
    isSaving.value = true;

    const payload: InputScopeDataPayload = {
      factoryName: masterInfo.value?.factoryName || 'FAB1',
      lotId: masterInfo.value?.lotName || lotId.value,
      processOperationName: masterInfo.value?.processOperationName || '',
      machineName: masterInfo.value?.machineName || '',
      layerId: masterInfo.value?.layerId || '',
      sideRinse: sideRinse.value,
      weeWidth: weeWidth.value,
      logo: logo.value,
      slotList: selectedWaferString.value,
      faultCategory: selectedFaultCategory.value,
      inputUser: DeviceInfo.OPERATOR_ID,
    };

    const res = await inputScopeDataService.inputScopeData(payload);
    isSaving.value = false;

    if (!res.success) {
      showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, res.errorMessage || '', true);
      return null;
    }

    return {
      lotId: lotId.value,
      logo: logo.value,
      waferList: selectedWaferString.value,
    };
  }

  return {
    lotId,
    isLotLocked,
    sideRinse,
    weeWidth,
    logo,
    selectedFaultCategory,
    faultCategoryOptions,
    slots,
    masterInfo,
    isLoading,
    isSaving,
    alertState,
    confirmState,
    selectedWaferString,
    selectedCount,
    maxCount,
    showAlert,
    closeAlert,
    showConfirm,
    closeConfirm,
    resetWaferSelection,
    clearData,
    resetForm,
    initLot,
    handleLotSearch,
    handleLotBarcodeEnter,
    fetchScopeLotInfo,
    fetchSlotInfo,
    toggleSlot,
    submitScopeData,
  };
});
