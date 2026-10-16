import { DeviceInfo } from 'src/constants/device-info';
import { useMainStore } from 'src/features/main/stores/main.store';
import { barcodeStyleLotId } from 'src/utils/barcode-style';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { sampleReleaseService } from '../services/sample-release.service';

export function useSampleRelease() {
  const route = useRoute();
  const router = useRouter();
  const mainStore = useMainStore();

  const editLotNo = ref('');

  // Sample Release 공정정보
  const txtReleaseProduct = ref('');
  const txtReleaseRoute = ref('');
  const txtReleaseProcessname = ref('');
  const txtReleaseMachinename = ref('');

  // Sample Lot Area
  const txtSampleLotname = ref('');
  const txtSampleQty = ref('');
  const txtSampleProduct = ref('');
  const txtSampleProcessname = ref('');
  const txtSampleProcessnamedesc = ref('');
  const txtSampleRoute = ref('');

  // Main Lot Group 정보
  const txtMainLotname = ref('');
  const txtMainQty = ref('');
  const txtMainProduct = ref('');
  const txtMainRoute = ref('');
  const txtMainProcessname = ref('');
  const txtMainProcessdesc = ref('');
  const txtMainState = ref('');
  const txtMainComment = ref('');

  const loading = ref(false);

  // Dialog State
  const dialogOpen = ref(false);
  const dialogTitle = ref('');
  const dialogMessage = ref('');

  function showDialog(title: string, message: string) {
    dialogTitle.value = title;
    dialogMessage.value = message;
    dialogOpen.value = true;
  }

  function closeDialog() {
    dialogOpen.value = false;
  }

  // Execution button enabled rule:
  // if (sMainLotID != null && ((sSampleRoute != sMainRoute) || (sSampleOper != sMainOper) || (sMainLotState != "WAIT"))) -> false
  // else if (sMainLotID != null && (sSampleRoute == sMainRoute && sSampleOper == sMainOper) && (sMainLotState == "WAIT")) -> true
  const isExecutionEnabled = computed(() => {
    return Boolean(
      txtSampleRoute.value === txtMainRoute.value &&
      txtSampleProcessname.value === txtMainProcessname.value &&
      txtMainState.value === 'WAIT',
    );
  });

  function clearData(clearLot = false) {
    if (clearLot) {
      editLotNo.value = '';
    }

    // Sample Release 공정정보
    txtReleaseProduct.value = '';
    txtReleaseRoute.value = '';
    txtReleaseProcessname.value = '';
    txtReleaseMachinename.value = '';

    // Sample Lot Area
    txtSampleLotname.value = '';
    txtSampleQty.value = '';
    txtSampleProduct.value = '';
    txtSampleProcessname.value = '';
    txtSampleProcessnamedesc.value = '';
    txtSampleRoute.value = '';

    // Sample Group 정보
    txtMainLotname.value = '';
    txtMainQty.value = '';
    txtMainProduct.value = '';
    txtMainRoute.value = '';
    txtMainProcessname.value = '';
    txtMainProcessdesc.value = '';
    txtMainComment.value = '';
    txtMainState.value = '';
  }

  async function searchData(lotId: string) {
    const targetLotId = lotId.trim().toUpperCase();
    clearData(true);

    if (!targetLotId) {
      showDialog('ERROR', 'LOT ID을 입력하세요');
      return;
    }

    loading.value = true;
    try {
      const response = await sampleReleaseService.getSampleReleaseInfo(targetLotId);

      if (response.isSuccessFul && response.result.ITEMS && response.result.ITEMS.length > 0) {
        const messageBody = response.result.ITEMS[0];

        // Sample Release 공정정보
        txtReleaseProduct.value = messageBody.RPROD || '';
        txtReleaseRoute.value = messageBody.RPROCESS || '';
        txtReleaseProcessname.value = messageBody.ROPER || '';
        txtReleaseMachinename.value = messageBody.RMACHINENAME || '';

        // Sample Lot Area
        txtSampleLotname.value = messageBody.SLOTNAME || '';
        txtSampleQty.value = messageBody.SQTY || '';
        txtSampleProduct.value = messageBody.SPROD || '';
        txtSampleProcessname.value = messageBody.SOPER || '';
        txtSampleProcessnamedesc.value = messageBody.SOPERDESC || '';
        txtSampleRoute.value = messageBody.SPROCESS || '';

        // Main Lot Group 정보
        txtMainLotname.value = messageBody.MLOTNAME || '';
        txtMainQty.value = messageBody.MQTY || '';
        txtMainProduct.value = messageBody.MPROD || '';
        txtMainRoute.value = messageBody.MPROCESS || '';
        txtMainProcessname.value = messageBody.MOPER || '';
        txtMainProcessdesc.value = messageBody.MOPERDESC || '';
        txtMainState.value = messageBody.MPROCESSSTATE || '';
      } else {
        const errorMsg = response.errorMessage || 'LOT ID 조회 실패하였습니다.';
        showDialog('ERROR', errorMsg);
      }
    } catch {
      showDialog('ERROR', '서버 통신 중 오류가 발생하였습니다.');
    } finally {
      loading.value = false;
    }
  }

  function onLotNoInput(value: string | number | undefined) {
    editLotNo.value = String(value ?? '').toUpperCase();
  }

  function onLotNoEnter() {
    const rawValue = editLotNo.value;
    const { isValid, parsedId } = barcodeStyleLotId(rawValue);
    if (isValid && parsedId) {
      editLotNo.value = parsedId.toUpperCase();
      void searchData(editLotNo.value);
    } else {
      clearData(true);
    }
  }

  async function SampleRelease() {
    loading.value = true;
    try {
      const facility = mainStore.facility || DeviceInfo.FACILITY || 'FACILITY';
      const userId = mainStore.operatorId || DeviceInfo.OPERATOR_ID || 'OPERATOR_ID';

      const response = await sampleReleaseService.executeSampleRelease({
        facility,
        sampleLot: txtSampleLotname.value,
        machine: txtReleaseMachinename.value,
        sampleQty: txtSampleQty.value,
        route: txtReleaseRoute.value,
        operation: txtReleaseProcessname.value,
        userId,
        comment: txtMainComment.value,
        mainLotName: txtMainLotname.value,
        mainQty: txtMainQty.value,
      });

      if (response.isSuccessFul) {
        const successMsg = response.result.SUCESSMSG || '정상적으로 처리되었습니다.';
        showDialog('INFORM', successMsg);
        clearData(true);
      } else {
        const errorMsg = response.errorMessage || 'Sample Release 실행 실패';
        showDialog('ERROR', errorMsg);
      }
    } catch {
      showDialog('ERROR', '서버 통신 중 오류가 발생하였습니다.');
    } finally {
      loading.value = false;
    }
  }

  function execution() {
    if (!txtSampleLotname.value) {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
      showDialog('ERROR', 'Sample LotName이 확인되지 않습니다..');
      return;
    }

    if (!txtMainLotname.value) {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
      showDialog('ERROR', 'Main LotName이 확인되지 않습니다..');
      return;
    }

    void SampleRelease();
  }

  function onClose() {
    router.back();
  }

  onMounted(() => {
    const lotIdParam = (route.query.LOTID || route.query.lotId || '') as string;
    if (lotIdParam.trim()) {
      editLotNo.value = lotIdParam.trim().toUpperCase();
      void searchData(editLotNo.value);
    }
  });

  return {
    editLotNo,
    txtReleaseProduct,
    txtReleaseRoute,
    txtReleaseProcessname,
    txtReleaseMachinename,
    txtSampleLotname,
    txtSampleQty,
    txtSampleProduct,
    txtSampleProcessname,
    txtSampleProcessnamedesc,
    txtSampleRoute,
    txtMainLotname,
    txtMainQty,
    txtMainProduct,
    txtMainRoute,
    txtMainProcessname,
    txtMainProcessdesc,
    txtMainState,
    txtMainComment,
    isExecutionEnabled,
    loading,
    dialogOpen,
    dialogTitle,
    dialogMessage,
    showDialog,
    closeDialog,
    searchData,
    onLotNoInput,
    onLotNoEnter,
    execution,
    SampleRelease,
    clearData,
    onClose,
  };
}
