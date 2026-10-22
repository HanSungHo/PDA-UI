<template>
  <q-dialog model-value persistent class="machine-select-overlay">
    <q-card
      class="machine-select-dialog"
      :class="{ 'has-exposure': hasExposureMachine }"
      aria-labelledby="machine-select-title"
    >
      <q-card-section class="machine-select-dialog-header">
        <h1 id="machine-select-title">장비선택</h1>
      </q-card-section>

      <q-card-section class="machine-select-dialog-body">
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
      </q-card-section>

      <q-card-actions align="right" class="machine-select-dialog-actions">
        <q-btn class="machine-select-cancel" flat no-caps label="취소" @click="finish" />
        <q-btn
          class="machine-select-ok"
          flat
          no-caps
          label="확인"
          :disable="isMachineResolving"
          @click="onOk"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <q-dialog :model-value="!!dialogMessage" persistent class="machine-select-alert-overlay">
    <q-card
      class="machine-select-alert"
      role="alertdialog"
      aria-labelledby="machine-select-error-title"
    >
      <q-card-section class="machine-select-alert-header">
        <h2 id="machine-select-error-title">에 러</h2>
      </q-card-section>
      <q-card-section class="machine-select-alert-body">
        <p>{{ dialogMessage }}</p>
      </q-card-section>
      <q-card-actions align="right" class="machine-select-alert-actions">
        <q-btn class="machine-select-alert-ok" flat no-caps label="확인" @click="closeError" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

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

<style>
.machine-select-overlay,
.machine-select-alert-overlay {
  font-family: var(--font-family-default, 'Noto Sans KR', sans-serif);
  color: #030712;
}

.machine-select-overlay .q-dialog__backdrop,
.machine-select-alert-overlay .q-dialog__backdrop {
  background: rgb(0 0 0 / 32%);
  backdrop-filter: blur(5px);
}

.machine-select-overlay .q-dialog__inner,
.machine-select-alert-overlay .q-dialog__inner {
  padding: 10px;
}

.machine-select-dialog,
.machine-select-alert {
  width: min(340px, calc(100vw - 20px));
  max-width: calc(100vw - 20px);
  overflow: hidden;
  border-radius: 4px;
  background: #fff;
  box-shadow:
    0 16px 24px rgb(0 0 0 / 14%),
    0 6px 30px rgb(0 0 0 / 12%),
    0 8px 10px rgb(0 0 0 / 20%);
}

.machine-select-dialog {
  height: 376px;
  max-height: calc(100dvh - 20px);
  display: flex;
  flex-direction: column;
}

.machine-select-dialog.has-exposure {
  height: auto;
  max-height: calc(100dvh - 20px);
}

.machine-select-dialog-header,
.machine-select-alert-header {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
  height: 44px;
  padding: 8px 12px;
}

.machine-select-dialog-header h1,
.machine-select-alert-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  line-height: 28px;
  text-align: center;
}

.machine-select-dialog-body {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  padding: 16px;
  background: #f9fafb;
}

.machine-select-section {
  display: flex;
  flex: none;
  flex-direction: column;
  gap: 8px;
}

.machine-select-section--exposure {
  padding-top: 8px;
  border-top: 1px solid #e5e7eb;
}

.machine-select-radio {
  align-self: flex-start;
  height: 44px;
  padding: 10px 0;
}

.machine-select-radio .q-radio__label {
  margin-left: 4px;
  color: #030712;
  font-size: 13px;
  font-weight: 500;
  line-height: 20px;
}

.machine-select-radio .q-radio__inner {
  color: #02b0a5;
}

.machine-select-field {
  flex: none;
  height: 56px;
}

.machine-select-field .q-field__control {
  height: 56px;
  padding: 0 16px;
  border-bottom: 1px solid #d1d5dc;
  border-radius: 4px 4px 0 0;
  background: #fff;
}

.machine-select-field.q-field--filled .q-field__control::before {
  border-bottom: 0;
  background: transparent;
}

.machine-select-field .q-field__label {
  top: 8px;
  color: #364153;
  font-size: 12px;
  line-height: 16px;
}

.machine-select-field.q-field--float .q-field__label {
  transform: none;
}

.machine-select-field .q-field__native {
  color: #030712;
  font-size: 16px;
  line-height: 24px;
}

.machine-select-radio--exposure .q-radio__label {
  color: #0040ff;
}

.machine-select-dialog-actions,
.machine-select-alert-actions {
  height: 64px;
  min-height: 64px;
  flex: none;
  gap: 8px;
  padding: 12px;
}

.machine-select-dialog-actions .q-btn,
.machine-select-alert-actions .q-btn {
  height: 40px;
  min-height: 40px;
  padding: 0 12px;
  border-radius: 4px;
  color: #02b0a5;
  font-size: 14px;
  font-weight: 700;
}

.machine-select-cancel {
  min-width: 50px;
}

.machine-select-ok,
.machine-select-alert-ok {
  min-width: 72px;
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
</style>
