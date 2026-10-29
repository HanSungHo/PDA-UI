<template>
  <BaseScreen
    class="machine-inform"
    title="장비 INFORM"
    ok-label="변경"
    :ok-loading="saving"
    :ok-disabled="loading"
    @ok="setMachineInform"
    @cancel="close"
  >
    <section class="ds-screen__card" aria-label="장비 검색">
      <div class="ds-screen__card-row">
        <BaseInput
          :model-value="machineName"
          class="machine-inform__input"
          label="장비"
          :disabled="saving"
          @keyup.enter="onEditorListener"
          @update:model-value="onMachineNameInput"
        >
          <template #append><QIcon name="sym_o_search" size="18px" /></template>
        </BaseInput>
        <BaseButton
          class="machine-inform__search-button"
          variant="secondary"
          :loading="loading"
          :disabled="saving"
          @click="getMachineInform('DEFAULT')"
          >조회</BaseButton
        >
      </div>
      <BaseRadioGroup
        :model-value="informType"
        :options="informTypeOptions"
        :disabled="saving"
        layout="horizontal"
        name="machine-inform-type"
        aria-label="조회 유형"
        @update:model-value="selectInformType"
      />
    </section>

    <div class="ds-screen__card machine-inform__content" @click="focusContent">
      <div
        v-if="loading && !informContent"
        class="machine-inform__loading"
        role="status"
        aria-label="조회 중"
      >
        <BaseLoading size="medium" />
      </div>
      <BaseEmptyState
        v-else-if="hasLoaded && !informContent && !editing"
        class="machine-inform__empty"
        title="EMPTY"
        message="해당 결과가 없습니다"
        icon-variant="filled"
      />
      <textarea
        ref="contentField"
        v-model="informContent"
        class="machine-inform__textarea"
        aria-label="INFORM 내용"
        :aria-busy="loading"
        :readonly="loading || saving"
        @focus="editing = true"
        @blur="editing = false"
      />
    </div>
    <OkDialog
      :open="okDialog.isOpen.value"
      :title="okDialog.title.value"
      :message="okDialog.message.value"
      :confirm-label="okDialog.confirmLabel.value"
      @confirm="okDialog.confirm"
    />
  </BaseScreen>
</template>

<script setup lang="ts">
import { QIcon } from 'quasar';
import {
  BaseButton,
  BaseEmptyState,
  BaseInput,
  BaseLoading,
  BaseRadioGroup,
  BaseScreen,
} from 'src/components/base';
import OkDialog from 'src/components/OkDialog.vue';
import { COMMON_FIELD } from 'src/constants/common-strings';
import { useMainStore } from 'src/features/main/stores/main.store';
import { okDialog } from 'src/services/ok-dialog.service';
import { barcodeStyleEqpId } from 'src/utils/barcode-style';
import { nextTick, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { machineInformService, type MachineInformType } from '../services/machine-inform.service';

const route = useRoute();
const router = useRouter();
const mainStore = useMainStore();
const initialMachineName =
  typeof route.query.MACHINENAME === 'string' ? route.query.MACHINENAME.toUpperCase() : '';
const machineName = ref(initialMachineName);
const informType = ref<MachineInformType>('MACHINE');
const informTypeOptions = [
  { label: '장비', value: 'MACHINE' },
  { label: '공정', value: 'PROCESS' },
];
const informContent = ref('');
const editing = ref(false);
const contentField = ref<HTMLTextAreaElement | null>(null);
const loading = ref(Boolean(initialMachineName));
const hasLoaded = ref(!initialMachineName);
const saving = ref(false);
let requestId = 0;

function onMachineNameInput(value: string | number | undefined): void {
  const nextName = String(value ?? '').toUpperCase();
  if (nextName === machineName.value) return;
  ++requestId;
  machineName.value = nextName;
  clearInfo();
  hasLoaded.value = false;
  loading.value = false;
}

function onEditorListener(): void {
  const { isValid, parsedId } = barcodeStyleEqpId(machineName.value);
  machineName.value = parsedId;
  if (isValid) {
    void getMachineInform('DEFAULT');
    return;
  }
  ++requestId;
  loading.value = false;
  clearInfo();
  hasLoaded.value = true;
}

function clearInfo(): void {
  informContent.value = '';
  editing.value = false;
}

function selectInformType(value: string | number): void {
  if (value !== 'MACHINE' && value !== 'PROCESS') return;
  if (informType.value === value) return;
  informType.value = value;
  clearInfo();
  hasLoaded.value = false;
  void getMachineInform('DEFAULT');
}

function showError(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  void okDialog.show(COMMON_FIELD.TXTDIALOGTITLE_ERROR, message, COMMON_FIELD.BTNOKSTR);
}

async function getMachineInform(type: 'DEFAULT' | MachineInformType = 'DEFAULT'): Promise<void> {
  const currentRequest = ++requestId;
  loading.value = true;
  hasLoaded.value = false;
  try {
    const content = await machineInformService.getMachineInform({
      factoryName: mainStore.facility,
      type: type === 'DEFAULT' ? informType.value : type,
      machineName: machineName.value,
    });
    if (currentRequest === requestId) {
      informContent.value = content;
      editing.value = false;
      hasLoaded.value = true;
    }
  } catch (error) {
    if (currentRequest === requestId) showError(error);
  } finally {
    if (currentRequest === requestId) loading.value = false;
  }
}

async function setMachineInform(): Promise<void> {
  if (saving.value || loading.value) return;
  ++requestId;
  saving.value = true;
  try {
    informContent.value = await machineInformService.addMachineInform({
      factoryName: mainStore.facility,
      type: informType.value,
      machineName: machineName.value,
      content: informContent.value,
      userId: mainStore.operatorId,
    });
    await getMachineInform('DEFAULT');
  } catch (error) {
    showError(error);
  } finally {
    saving.value = false;
  }
}

async function focusContent(): Promise<void> {
  if (loading.value || saving.value) return;
  editing.value = true;
  await nextTick();
  contentField.value?.focus();
}

function close(): void {
  router.back();
}

onMounted(() => {
  if (initialMachineName) {
    void getMachineInform('DEFAULT');
  }
});
</script>

<style src="../styles/machine-inform.css"></style>
