<template>
  <BaseModal
    title="PDA 기기명 확인"
    :open="open"
    :closable="false"
    :overlay-closable="false"
    class="device-name-check-modal"
    @update:open="handleOpenChange"
  >
    <p class="device-name-check-modal__warning-text">PDA 기기명이 잘못 설정 되었습니다.</p>
    <p class="device-name-check-modal__warning-text">
      반장님께 PDA 기기명 변경을 요청 하시기 바랍니다.
    </p>

    <BaseInput
      id="pda-ip"
      label="현재 PDA IP"
      :model-value="pdaIp || 'Null'"
      readonly
      class="device-name-check-modal__input"
    />

    <BaseInput
      id="pda-current-name"
      label="현재 기기명"
      :model-value="currentPdaName || 'Null'"
      readonly
      class="device-name-check-modal__input"
    />

    <BaseInput
      id="pda-new-name"
      ref="inputRef"
      v-model="newPdaDigits"
      label="새로운 기기명"
      type="text"
      :max-length="3"
      maxlength="3"
      prefix="AR"
      class="device-name-check-modal__input device-name-check-modal__input--new"
      @keydown.enter.prevent="handleConfirm"
    />

    <template #footer>
      <BaseButton
        class="device-name-check-modal__btn-ok"
        :loading="isLoading"
        @click="handleConfirm"
      >
        {{ confirmLabel }}
      </BaseButton>
    </template>
  </BaseModal>

  <OkDialog
    :open="alertState.isOpen"
    :title="alertState.title"
    :message="alertState.message"
    :confirm-label="confirmLabel"
    @update:open="handleAlertOpenChange"
    @confirm="store.dismissAlert"
  />
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { BaseButton, BaseInput, BaseModal } from 'src/components/base';
import OkDialog from 'src/components/OkDialog.vue';
import { COMMON_FIELD } from 'src/constants/common-strings';
import { nextTick, onMounted, ref, watch } from 'vue';

import { useDeviceNameCheckStore } from '../stores/device-name-check.store';
import type {
  DeviceNameCheckModalEmits,
  DeviceNameCheckModalProps,
} from '../types/device-name-check.types';

defineOptions({ name: 'DeviceNameCheckModal' });

const props = withDefaults(defineProps<DeviceNameCheckModalProps>(), {
  open: false,
  initialIp: '',
  initialDeviceName: '',
});

const emit = defineEmits<DeviceNameCheckModalEmits>();

const confirmLabel = COMMON_FIELD.BTNOKSTR;
const store = useDeviceNameCheckStore();
const { pdaIp, currentPdaName, newPdaDigits, isLoading, alertState } = storeToRefs(store);

const inputRef = ref<InstanceType<typeof BaseInput>>();

async function handleConfirm(): Promise<void> {
  const result = await store.submitDeviceNameChange();
  if (result) {
    emit('confirm', result);
    emit('update:open', false);
  }
}

function handleOpenChange(val: boolean): void {
  emit('update:open', val);
}

function handleAlertOpenChange(val: boolean): void {
  if (!val) {
    store.dismissAlert();
  }
}

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      await store.initModal({
        ip: props.initialIp,
        deviceName: props.initialDeviceName,
      });
      await nextTick();
      inputRef.value?.focus();
    }
  },
  { immediate: true },
);

onMounted(async () => {
  if (props.open) {
    await nextTick();
    inputRef.value?.focus();
  }
});
</script>

<style src="../styles/device-name-check.css"></style>
