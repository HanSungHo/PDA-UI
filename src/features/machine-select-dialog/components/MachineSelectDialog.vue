<template>
  <div class="machine-select-scrim" role="presentation">
    <section
      class="machine-select-dialog"
      :class="{ 'has-exposure': hasExposureMachine }"
      role="dialog"
      aria-modal="true"
      aria-labelledby="machine-select-title"
    >
      <header>
        <h1 id="machine-select-title">장비선택</h1>
      </header>

      <div class="machine-select-dialog-body">
        <MachineSelectSection
          radio-label="시작장비"
          :recipe="formatField(machineSelect.startRecipe)"
          :selected="selectedMachineRadio === 'START'"
          :select-machine="machineSelect.startSelectMachine"
          :standard-machine="formatField(machineSelect.startStandardMachine)"
          @enter="getRealEqp(machineSelect.startSelectMachine, 'START')"
          @select="checkedRadioButton('START')"
          @update:select-machine="setSelectMachine('START', $event)"
        />

        <MachineSelectSection
          v-if="hasExposureMachine"
          exposure
          radio-label="노광장비"
          :recipe="formatField(machineSelect.exposureRecipe)"
          :selected="selectedMachineRadio === 'EXPOSURE'"
          :select-machine="machineSelect.exposureSelectMachine"
          :standard-machine="formatField(machineSelect.exposureStandardMachine)"
          @enter="getRealEqp(machineSelect.exposureSelectMachine, 'EXPOSURE')"
          @select="checkedRadioButton('EXPOSURE')"
          @update:select-machine="setSelectMachine('EXPOSURE', $event)"
        />
      </div>

      <footer>
        <BaseButton class="machine-select-cancel" variant="tertiary" @click="finish">
          취소
        </BaseButton>
        <BaseButton class="machine-select-ok" :disabled="isMachineResolving" @click="onOk">
          확인
        </BaseButton>
      </footer>
    </section>
  </div>

  <div v-if="dialogMessage" class="machine-select-alert-scrim" role="presentation">
    <section class="machine-select-alert" role="alertdialog" aria-modal="true">
      <header>
        <h2>에 러</h2>
      </header>
      <div class="machine-select-alert-body">
        <p>{{ dialogMessage }}</p>
      </div>
      <footer>
        <BaseButton class="machine-select-alert-ok" @click="closeError">확인</BaseButton>
      </footer>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import BaseButton from '../../../components/base/button/BaseButton.vue';
import {
  fetchMachineSelectRealEqp,
  fetchMachineSelectRecipeInfo,
} from '../services/machine-select-dialog.service';
import type {
  MachineSelectParams,
  MachineSelectResult,
  RadioType,
} from '../types/machine-select-dialog.types';
import MachineSelectSection from './MachineSelectSection.vue';

const props = defineProps<{
  params: MachineSelectParams;
}>();

const emit = defineEmits<{
  cancel: [];
  confirm: [result: MachineSelectResult];
}>();

const machineSelect = ref({
  startStandardMachine: '',
  startSelectMachine: '',
  startResolvedMachine: '',
  startRecipe: '',
  exposureStandardMachine: '',
  exposureSelectMachine: '',
  exposureResolvedMachine: '',
  exposureRecipe: '',
});
const selectedMachineRadio = ref<RadioType>('START');
const isMachineResolving = ref(false);
const dialogMessage = ref('');

const hasExposureMachine = computed(
  () => props.params.isExposure === 'Y' && props.params.identCodeList !== 'E',
);

watch(() => props.params, setParam, { immediate: true });

function onOk() {
  if (hasExposureMachine.value) {
    if (!machineSelect.value.startResolvedMachine) {
      showError('Normal장비를 입력하세요.');
      return;
    }

    if (!machineSelect.value.exposureResolvedMachine) {
      showError('Exposure장비를 입력하세요.');
      return;
    }

    finishWithResult({
      EQPGROUP: `${machineSelect.value.startStandardMachine}|${machineSelect.value.exposureStandardMachine}`,
      EQPID: `${machineSelect.value.startResolvedMachine}|${machineSelect.value.exposureResolvedMachine}`,
      RECIPE: `${machineSelect.value.startRecipe}|${machineSelect.value.exposureRecipe}`,
    });
    return;
  }

  if (!machineSelect.value.startResolvedMachine) {
    showError('장비를 입력하세요.');
    return;
  }

  finishWithResult({
    EQPGROUP: machineSelect.value.startStandardMachine,
    EQPID: machineSelect.value.startResolvedMachine,
    RECIPE: machineSelect.value.startRecipe,
  });
}

function checkedRadioButton(radioType: RadioType) {
  selectedMachineRadio.value = radioType;
}

function setParam() {
  machineSelect.value.startStandardMachine = props.params.eqpGroup;
  machineSelect.value.startSelectMachine = '';
  machineSelect.value.startResolvedMachine = '';
  machineSelect.value.startRecipe = '';
  machineSelect.value.exposureStandardMachine = hasExposureMachine.value
    ? props.params.expEqpGroup
    : '';
  machineSelect.value.exposureSelectMachine = '';
  machineSelect.value.exposureResolvedMachine = '';
  machineSelect.value.exposureRecipe = '';
  checkedRadioButton('START');
}

async function getRealEqp(eqpId: string, radioType = selectedMachineRadio.value): Promise<boolean> {
  const standardMachine =
    radioType === 'START'
      ? machineSelect.value.startStandardMachine
      : machineSelect.value.exposureStandardMachine;

  if (!eqpId.trim()) {
    showError('장비를 입력하세요.');
    return false;
  }

  const selectedEqpId = barcodeStyleEqpId(eqpId);
  if (!selectedEqpId) {
    showError('진행할 장비를 읽어주세요.');
    return false;
  }

  if (!validateEquipment(standardMachine, selectedEqpId)) {
    showError(`[${selectedEqpId}]장비가 기준장비에 존재하지 않습니다.`);
    return false;
  }

  isMachineResolving.value = true;
  try {
    const result = await fetchMachineSelectRealEqp({
      facility: props.params.facility,
      eqpId: selectedEqpId,
    });

    if (!result.ok) {
      showError(result.message || '');
      return false;
    }

    const realEqpId = result.eqpId || selectedEqpId;
    if (radioType === 'START') {
      machineSelect.value.startSelectMachine = realEqpId;
      machineSelect.value.startResolvedMachine = realEqpId;
    } else {
      machineSelect.value.exposureSelectMachine = realEqpId;
      machineSelect.value.exposureResolvedMachine = realEqpId;
    }

    return await getRecipeInfo(realEqpId, radioType);
  } finally {
    isMachineResolving.value = false;
  }
}

async function getRecipeInfo(eqpId: string, radioType = selectedMachineRadio.value) {
  const result = await fetchMachineSelectRecipeInfo({
    lotId: props.params.lotId,
    operation: props.params.operation,
    subOperation: radioType === 'EXPOSURE' ? 'E' : props.params.subOperation,
    product: props.params.product,
    eqpId,
    facility: props.params.facility,
  });

  if (!result.ok) {
    showError(result.message || '');
    return false;
  }

  if (hasExposureMachine.value) {
    if (radioType === 'START') {
      machineSelect.value.startRecipe = result.recipe || '';
      checkedRadioButton('EXPOSURE');
    } else {
      machineSelect.value.exposureRecipe = result.recipe || '';
    }
    return true;
  }

  machineSelect.value.startRecipe = result.recipe || '';
  return true;
}

function setSelectMachine(radioType: RadioType, value: string) {
  if (radioType === 'START') {
    machineSelect.value.startSelectMachine = value;
    machineSelect.value.startResolvedMachine = '';
    machineSelect.value.startRecipe = '';
    return;
  }

  machineSelect.value.exposureSelectMachine = value;
  machineSelect.value.exposureResolvedMachine = '';
  machineSelect.value.exposureRecipe = '';
}

function barcodeStyleEqpId(eqpId: string): string {
  const machineName = eqpId.trim().toUpperCase();
  if (!machineName.startsWith('EQP-')) {
    return '';
  }

  const barcodeBody = machineName.replace(/^EQP-/, '');
  return barcodeBody ? barcodeBody.substring(0, barcodeBody.length - 1) : barcodeBody;
}

function validateEquipment(eqpListString: string, machineName: string): boolean {
  if (!machineName) {
    return false;
  }

  if (eqpListString && !eqpListString.includes('-')) {
    return true;
  }

  const machineNameSeparator = machineName.lastIndexOf('-');
  if (machineNameSeparator < 0) {
    return false;
  }

  const preMachineName = machineName.substring(0, machineNameSeparator);
  const machineNumber = machineName.substring(machineNameSeparator + 1);
  let machineList = '';

  for (const eqpGroup of eqpListString.split('|')) {
    if (!eqpGroup.includes(preMachineName)) {
      continue;
    }

    let tmpMachineList = eqpGroup.substring(
      eqpGroup.indexOf(preMachineName) + preMachineName.length,
    );
    tmpMachineList = tmpMachineList.substring(1);

    if (tmpMachineList.includes(preMachineName) && validateEquipment(tmpMachineList, machineName)) {
      return true;
    }

    if (tmpMachineList.includes('-')) {
      tmpMachineList = tmpMachineList.substring(0, tmpMachineList.indexOf('-'));
      tmpMachineList = tmpMachineList.substring(0, tmpMachineList.lastIndexOf(','));
    }

    machineList = machineList ? `${machineList},${tmpMachineList}` : tmpMachineList;
  }

  if (!machineList) {
    return false;
  }

  return machineList
    .split(',')
    .some((machineNumberGroup) => validateMachineNumberGroup(machineNumberGroup, machineNumber));
}

function validateMachineNumberGroup(machineNumberGroup: string, machineNumber: string): boolean {
  if (machineNumberGroup.includes('~')) {
    const [start, end] = machineNumberGroup.split('~');
    return isMachineNumberInRange(machineNumber, start, end);
  }

  const machineNumberValue = toNumber(machineNumber);
  const groupValue = toNumber(machineNumberGroup);

  if (machineNumberValue === undefined && groupValue === undefined) {
    return machineNumber.charCodeAt(0) === machineNumberGroup.charCodeAt(0);
  }

  return machineNumberValue !== undefined && machineNumberValue === groupValue;
}

function isMachineNumberInRange(machineNumber: string, start: string, end?: string): boolean {
  if (!end) {
    return false;
  }

  const machineNumberValue = toNumber(machineNumber);
  const startValue = toNumber(start);
  const endValue = toNumber(end);

  if (machineNumberValue === undefined && startValue === undefined) {
    const valueChar = machineNumber.charCodeAt(0);
    return valueChar >= start.charCodeAt(0) && valueChar <= end.charCodeAt(0);
  }

  return (
    machineNumberValue !== undefined &&
    startValue !== undefined &&
    endValue !== undefined &&
    machineNumberValue >= startValue &&
    machineNumberValue <= endValue
  );
}

function toNumber(value: string): number | undefined {
  const numericValue = value.replace(/\D/g, '');
  return numericValue ? Number(numericValue) : undefined;
}

function finishWithResult(result: MachineSelectResult) {
  emit('confirm', result);
}

function finish() {
  emit('cancel');
}

function showError(message: string) {
  dialogMessage.value = message;
}

function closeError() {
  dialogMessage.value = '';
}

function formatField(value: string): string {
  return value.trim();
}
</script>

<style scoped>
.machine-select-scrim,
.machine-select-alert-scrim {
  --machine-select-shell-width: min(100vw, 360px);
  --machine-select-accent: #02b0a5;
  --machine-select-border: #d1d5dc;

  color: #030712;
  font-family: var(--family-font-family-default, 'Noto Sans KR', sans-serif);
}

.machine-select-scrim,
.machine-select-alert-scrim {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 50%;
  z-index: 20;
  display: flex;
  width: var(--machine-select-shell-width);
  align-items: center;
  justify-content: center;
  background: rgb(22 22 26 / 50%);
  backdrop-filter: blur(5px);
  transform: translateX(-50%);
}

.machine-select-alert-scrim {
  z-index: 30;
}

.machine-select-dialog,
.machine-select-alert {
  display: flex;
  width: min(340px, calc(var(--machine-select-shell-width) - 20px));
  overflow: hidden;
  flex-direction: column;
  border: 1px solid #f3f4f6;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 1px 2px 10px rgb(113 164 244 / 30%);
}

.machine-select-dialog {
  height: 412px;
  max-height: calc(100dvh - 32px);
}

.machine-select-dialog.has-exposure {
  height: auto;
  min-height: 412px;
}

.machine-select-dialog header,
.machine-select-alert header {
  height: 44px;
  flex: none;
  padding: 8px 12px;
  border-bottom: 1px solid #f3f4f6;
  background: rgb(2 176 165 / 20%);
}

.machine-select-dialog h1,
.machine-select-alert h2 {
  margin: 0;
  color: #030712;
  font-size: 18px;
  font-weight: 700;
  line-height: 28px;
  letter-spacing: 0;
}

.machine-select-dialog-body {
  display: flex;
  height: 304px;
  flex: none;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  overflow: auto;
  background: #f9fafb;
}

.machine-select-dialog.has-exposure .machine-select-dialog-body {
  height: auto;
  max-height: calc(100dvh - 140px);
}

:deep(.machine-select-section) {
  display: flex;
  width: 100%;
  flex: none;
  flex-direction: column;
  gap: 8px;
}

:deep(.machine-select-section--exposure) {
  padding-top: 8px;
  border-top: 1px solid #e5e7eb;
}

:deep(.machine-select-radio) {
  --ds-radio-border-color: var(--machine-select-accent);
  --ds-radio-checked-color: var(--machine-select-accent);

  display: flex;
  width: max-content;
  height: 44px;
  flex: none;
  align-items: center;
  padding: 12px 0;
}

:deep(.machine-select-radio .ds-radio__row) {
  height: 20px;
  gap: 8px;
}

:deep(.machine-select-radio .ds-radio__label),
:deep(.machine-select-field .ds-field-shell__label),
:deep(.machine-select-field .ds-field__label) {
  color: #030712;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
}

:deep(.machine-select-radio--exposure .ds-radio__label),
:deep(.machine-select-field--exposure .ds-field-shell__label),
:deep(.machine-select-field--exposure .ds-field__label) {
  color: #0040ff;
}

:deep(.machine-select-radio .ant-radio-wrapper),
:deep(.machine-select-radio .ant-radio) {
  margin: 0;
}

:deep(.machine-select-field) {
  --ds-input-control-height: 40px;
  --ds-input-radius: 8px;

  height: 68px;
  flex: none;
  gap: 8px;
}

:deep(.machine-select-field .ds-input__control) {
  height: 40px;
  min-height: 40px;
  padding: 8px 12px;
  border-color: var(--machine-select-border);
  border-radius: 8px;
  background: #ffffff;
}

:deep(.machine-select-field .ds-input__native) {
  color: #364153;
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
}

.machine-select-dialog footer,
.machine-select-alert footer {
  display: flex;
  height: 64px;
  flex: none;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px;
  border-top: 1px solid #f3f4f6;
}

.machine-select-cancel,
.machine-select-ok,
.machine-select-alert button {
  height: 40px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 700;
}

.machine-select-cancel {
  width: 50px;
  border: 1px solid var(--machine-select-accent);
  background: #ffffff;
  color: var(--machine-select-accent);
}

.machine-select-ok,
.machine-select-alert-ok {
  width: 72px;
  border: 1px solid var(--machine-select-accent);
  background: var(--machine-select-accent);
  color: #f0fdfc;
}

.machine-select-alert-body {
  display: flex;
  min-height: 104px;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: #f9fafb;
  color: #dc2627;
  font-size: 14px;
  font-weight: 500;
  text-align: center;
}

.machine-select-alert-body p {
  margin: 0;
}

.machine-select-cancel :deep(.ds-btn__label),
.machine-select-ok :deep(.ds-btn__label),
.machine-select-alert-ok :deep(.ds-btn__label) {
  min-width: max-content;
  overflow: visible;
  text-overflow: clip;
}
</style>
