import type { BaseOption } from 'src/components/base/dropdown-list/base-dropdown-list.types';
import { removeScannerCharacter } from 'src/utils/barcode-style';
import { reactive, toRefs } from 'vue';

import { testResultInputService as service } from '../services/test-result-input.service';
import type { TestResultDevice } from '../types/test-result-input.types';

type Selection = 'eqpId' | 'inspType' | 'inspType2' | 'inspResult';
type Dialog = { title: string; message: string };
const options = (values: string[]): BaseOption[] =>
  values.map((value) => ({ label: value, value }));

export function useTestResultInput({
  device,
  focus,
}: {
  device: TestResultDevice;
  focus: (field: 'mask') => void | Promise<void>;
}) {
  const state = reactive({
    maskTag: '',
    pellicle: '',
    testDay: '',
    serialNo: '',
    serialNoExpected: '',
    fabInDate: '',
    eqpId: undefined as string | undefined,
    inspType: undefined as string | undefined,
    inspType2: undefined as string | undefined,
    inspResult: undefined as string | undefined,
    eqpOptions: [] as BaseOption[],
    inspTypeOptions: [] as BaseOption[],
    inspType2Options: [] as BaseOption[],
    inspResultOptions: [] as BaseOption[],
    inspText: '',
    holdText: '',
    maskLoaded: false,
    loading: false,
    dialog: undefined as Dialog | undefined,
  });

  function showError(message: string, title = '에  러') {
    state.dialog = { title, message };
  }

  function closeDialog() {
    state.dialog = undefined;
  }

  function getBarcodeReticleId(): string | undefined {
    if (state.maskTag.length <= 1) {
      state.maskTag = '';
      showError('조회하실 MASK TAG를 읽어주세요.', 'READING ERROR');
      return;
    }
    const maskTag = removeScannerCharacter(state.maskTag);
    state.maskTag = maskTag;
    return maskTag;
  }

  async function getMaskInfo() {
    if (state.loading || state.maskLoaded) return;
    state.maskTag = state.maskTag.toUpperCase();
    const maskTag = getBarcodeReticleId();
    if (maskTag === undefined) return;
    state.loading = true;
    try {
      const result = await service.inspMaskInfo(maskTag, device);
      if (!result.ok) {
        showError(result.message);
        return;
      }
      const info = result.data;
      state.serialNoExpected = info.serialNo;
      state.serialNo = info.serialNo.length < 5 ? info.serialNo : info.serialNo.slice(0, 5);
      state.pellicle = info.pellicle;
      state.testDay = info.testDay;
      state.fabInDate = info.fabInDate;
      state.eqpOptions = options(['ALL', ...info.eqpIds]);
      state.inspTypeOptions = options(info.inspTypes);
      state.inspType2Options = options(info.inspType2s);
      state.inspResultOptions = options(info.inspResults);
      state.maskLoaded = true;
    } finally {
      state.loading = false;
    }
  }

  function resetSelection(field: Selection) {
    state[field] = undefined;
  }

  function clearData() {
    state.maskTag = '';
    state.pellicle = '';
    state.testDay = '';
    state.serialNo = '';
    state.eqpId = undefined;
    state.inspType = undefined;
    state.inspType2 = undefined;
    state.inspResult = undefined;
    state.eqpOptions = [];
    state.inspTypeOptions = [];
    state.inspType2Options = [];
    state.inspResultOptions = [];
    state.inspText = '';
    state.holdText = '';
    state.maskLoaded = false;
    return focus('mask');
  }

  async function setInspResult() {
    const result = await service.inspMaskInsert(
      {
        reticleSeq: state.maskTag,
        eqpId: state.eqpId!,
        inspType: state.inspType!,
        inspType2: state.inspType2!,
        inspResult: state.inspResult!,
        inspText: state.inspText,
        holdText: state.holdText,
        fabInDate: state.fabInDate,
      },
      device,
    );
    if (!result.ok) {
      showError(result.message);
      return;
    }
    state.loading = false;
    await clearData();
    state.dialog = { title: '확  인', message: '검사결과 입력완료' };
  }

  async function inspMaskStatCheck() {
    const result = await service.inspMaskStatCheck(state.maskTag, device);
    if (!result.ok) {
      showError(result.message);
      return;
    }
    if (result.data.status === 'RUN' && result.data.maskTag !== 'RUN') {
      showError('MASK는 RUN 상태이므로 변경할 수 없습니다');
      return;
    }
    await setInspResult();
  }

  async function submit() {
    if (!state.maskLoaded || state.loading) return;
    if (!state.serialNo) showError('Serial No를 입력하세요.');
    else if (state.serialNoExpected !== state.serialNo) showError('올바른 Serial No를 입력하세요.');
    else if (state.eqpId === undefined) showError('검사 장비를 선택하세요.');
    else if (state.inspType === undefined) showError('검사 구분을 선택해주세요');
    else if (state.inspType2 === undefined) showError('검사 방법을 선택해주세요');
    else if (state.inspResult === undefined) showError('검사 결과를 선택해주세요');
    else if (
      state.inspResult === '사용불가' &&
      state.inspType === '입고 검사' &&
      state.holdText.replace(/ /g, '').length === 0
    )
      showError('Hold 사유를 입력하세요');
    else if (state.inspType !== '입고 검사' && state.fabInDate.replace(/ /g, '').length === 0)
      showError(
        '입고일이 설정되지 않은 MASK입니다.\n입고일을 설정하시거나 입고검사를 진행해 주시기 바랍니다.',
      );
    else {
      state.loading = true;
      try {
        await inspMaskStatCheck();
      } finally {
        state.loading = false;
      }
    }
  }

  return {
    ...toRefs(state),
    getBarcodeReticleId,
    getMaskInfo,
    inspMaskStatCheck,
    setInspResult,
    clearData,
    submit,
    resetSelection,
    closeDialog,
  };
}
