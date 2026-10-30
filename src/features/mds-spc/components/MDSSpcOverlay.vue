<template>
  <!--
    BaseModal stays open while the event is queued (its open state is fixed), so the alarm
    survives route changes like the Android activity. The device Back button dismisses it.
  -->
  <MDSSpcScreen
    :fields="event.fields"
    :title="event.title"
    :measure-options="measureOptions"
    :action-options="actionOptions"
    :selected-measure="selectedMeasure"
    :selected-action="selectedAction"
    :is-busy="isBusy"
    @update:selected-measure="selectedMeasure = selectedIndex($event)"
    @update:selected-action="selectedAction = selectedIndex($event)"
    @ok="setDataAndClose"
    @save="InsertDataFromSelection"
  />
  <BaseToast
    v-if="toastMessage"
    :key="toastKey"
    type="info"
    :description="toastMessage"
    :closable="false"
    :duration="2200"
  />
</template>

<script setup lang="ts">
import { App } from '@capacitor/app';
import { type BaseDropdownValue, type BaseOption, BaseToast } from 'src/components/base';
import { computed, onMounted, onUnmounted, ref } from 'vue';

import {
  CheckData,
  InsertData,
  type MDSSpcEvent,
  optionsForSpinner,
  releaseMDSSpcEvent,
  setData,
} from '../mds-spc.service';
import MDSSpcScreen from './MDSSpcScreen.vue';

const props = defineProps<{ event: MDSSpcEvent }>();
const measureOptions = ref<BaseOption[]>([]);
const actionOptions = ref<BaseOption[]>([]);
const selectedMeasure = ref<BaseDropdownValue>();
const selectedAction = ref<BaseDropdownValue>();
const isChoicesLoading = ref(false);
const isSaving = ref(false);
const isBusy = computed(() => isChoicesLoading.value || isSaving.value);
const toastMessage = ref('');
const toastKey = ref(0);
let acknowledged = false;
let previousFocus: HTMLElement | null = null;
let isUnmounted = false;
let backButtonListener: { remove: () => Promise<void> } | undefined;
let lastSaveClickTime = 0;

function selectedIndex(value: BaseDropdownValue): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

function showToast(message: string): void {
  toastMessage.value = message;
  toastKey.value += 1;
}

function closeWithoutConfirm(): void {
  if (acknowledged) return;
  acknowledged = true;
  releaseMDSSpcEvent(props.event.id);
}

async function loadChoices(): Promise<void> {
  if (!props.event.shouldCheckData) return;
  isChoicesLoading.value = true;
  try {
    const choices = await CheckData(props.event.fields);
    if (isUnmounted) return;
    measureOptions.value = optionsForSpinner(choices.measure);
    actionOptions.value = optionsForSpinner(choices.action);
    selectedMeasure.value = measureOptions.value[0]?.value;
    selectedAction.value = actionOptions.value[0]?.value;
  } finally {
    if (!isUnmounted) isChoicesLoading.value = false;
  }
}

async function InsertDataFromSelection(): Promise<void> {
  if (isBusy.value) return;

  const now = Date.now();
  if (now - lastSaveClickTime <= 1000) return;
  lastSaveClickTime = now;

  if (measureOptions.value.length === 1 && actionOptions.value.length === 1) {
    showToast('이미 입력된 Data 입니다.');
    return;
  }

  const measure =
    typeof selectedMeasure.value === 'number'
      ? (measureOptions.value[selectedMeasure.value]?.label ?? '')
      : '';
  const action =
    typeof selectedAction.value === 'number'
      ? (actionOptions.value[selectedAction.value]?.label ?? '')
      : '';

  if (measure.length === 0 || action.length === 0) {
    showToast('항목을 모두 선택해주세요.');
    return;
  }

  isSaving.value = true;
  try {
    await InsertData({ measure, action, fields: props.event.fields });
  } catch {
    // The legacy screen keeps the form open and does not show a save response.
  } finally {
    isSaving.value = false;
  }
}

function setDataAndClose(): void {
  if (acknowledged) return;
  acknowledged = true;
  void setData(props.event.fields).catch(() => undefined);
  releaseMDSSpcEvent(props.event.id);
}

onMounted(() => {
  previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  void App.addListener('backButton', closeWithoutConfirm)
    .then((listener) => {
      if (isUnmounted) void listener.remove();
      else backButtonListener = listener;
    })
    .catch(() => undefined);
  void loadChoices();
});

onUnmounted(() => {
  isUnmounted = true;
  void backButtonListener?.remove().catch(() => undefined);
  // The dialog is removed by the event queue (v-if), not hidden, so QDialog does not refocus.
  if (previousFocus?.isConnected) previousFocus.focus();
});
</script>
