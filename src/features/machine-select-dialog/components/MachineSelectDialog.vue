<template>
  <BaseModal
    class="machine-select-overlay"
    open
    title="장비선택"
    aria-label="장비선택"
    :width="408"
    :overlay-closable="false"
  >
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

    <template #footer>
      <BaseButton class="machine-select-cancel" variant="link" @click="finish">취소</BaseButton>
      <BaseButton
        class="machine-select-ok"
        variant="link"
        :disabled="isMachineResolving"
        @click="onOk"
      >
        확인
      </BaseButton>
    </template>
  </BaseModal>

  <BaseModal
    class="machine-select-alert"
    :open="!!dialogMessage"
    title="에 러"
    aria-label="에 러"
    :width="340"
    :overlay-closable="false"
  >
    <p class="machine-select-alert-message">{{ dialogMessage }}</p>
    <template #footer>
      <BaseButton class="machine-select-alert-ok" variant="link" @click="closeError">
        확인
      </BaseButton>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { BaseButton, BaseModal } from 'src/components/base';
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
.machine-select-alert-message {
  margin: 0;
  color: var(--text-text-error);
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  text-align: center;
  white-space: pre-line;
}
</style>
