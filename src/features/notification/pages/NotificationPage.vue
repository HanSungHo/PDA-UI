<template>
  <BaseModal
    :open="modelValue"
    :width="300"
    :closable="false"
    :overlay-closable="false"
    class="notification-modal"
    @cancel="handleClose"
    @update:open="handleModalOpenChange"
  >
    <!-- Header: replaces the RelativeLayout banner -->
    <template #title>
      <span class="notification-modal__title">ALARM</span>
    </template>

    <div class="notification-modal__scroll-container">
      <!-- LinearLayout_NEW -->
      <div id="LinearLayout_NEW" class="notification-modal__body">
        <!-- TextView: title_receiver_message -->
        <BaseChip
          v-if="titleLabel"
          id="title_receiver_message"
          :class="['notification-modal__title-chip', levelClass]"
          :label="titleLabel"
        />

        <!-- TextView: txt_receiver_message -->
        <p id="txt_receiver_message" class="notification-modal__headline-text">
          {{ viewBinding.txtReceiverMessage.text }}
        </p>

        <!-- LinearLayout_Child -->
        <div id="LinearLayout_Child" class="notification-modal__child-layout"></div>
      </div>
    </div>

    <!-- Footer: btn_ok -->
    <template #footer>
      <div class="notification-modal__footer">
        <BaseButton
          id="btn_ok"
          class="notification-btn--ok"
          :label="viewBinding.btnOk.text"
          variant="link"
          size="medium"
          :disabled="!viewBinding.btnOk.isEnabled"
          @click="singleClickListener.onSingleClick()"
        />
      </div>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';

import BaseButton from '~/components/base/button/BaseButton.vue';
import BaseChip from '~/components/base/chip/BaseChip.vue';
import BaseModal from '~/components/base/modal/BaseModal.vue';

import { useNotification } from '../composables/useNotification';
import type { NotificationInboundParams } from '../types/notification.types';

interface Props {
  modelValue: boolean;
  inboundParams?: NotificationInboundParams;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  inboundParams: () => ({}),
});

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
  (e: 'close'): void;
}>();

const { viewBinding, alarmLevel, singleClickListener, onCreate, onBackPressed } = useNotification(
  () => props.inboundParams,
  () => {
    emit('update:modelValue', false);
    emit('close');
  },
);
const titleLabel = computed(() => {
  return viewBinding.titleReceiverMessage.text;
});

const levelClass = computed(() =>
  ['1', '2', '3'].includes(alarmLevel.value)
    ? `notification-modal__title-chip--level-${alarmLevel.value}`
    : '',
);

function handleModalOpenChange(val: boolean) {
  if (!val && !onBackPressed()) {
    return;
  }
  emit('update:modelValue', val);
  if (!val) {
    emit('close');
  }
}

function handleClose() {
  if (!onBackPressed()) return;
  emit('update:modelValue', false);
  emit('close');
}

watch(
  () => [props.modelValue, props.inboundParams?.UDP_RECEIVER_MESSAGE],
  ([isOpen]) => {
    if (isOpen) {
      onCreate();
    }
  },
);
</script>

<style scoped src="../styles/notification.css"></style>
