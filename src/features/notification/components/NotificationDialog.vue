<template>
  <BaseModal
    :open="modelValue"
    title="ALARM"
    :overlay-closable="false"
    back-closable
    @update:open="handleModalOpenChange"
  >
    <!-- LinearLayout_NEW -->
    <div id="LinearLayout_NEW" class="notification-modal__body">
      <!-- TextView: title_receiver_message -->
      <p v-if="titleLabel" id="title_receiver_message" :class="titleClass">{{ titleLabel }}</p>

      <!-- TextView: txt_receiver_message -->
      <div
        id="txt_receiver_message"
        class="notification-modal__message"
        v-text="viewBinding.txtReceiverMessage.text"
      />
    </div>

    <!-- Footer: btn_ok -->
    <template #footer>
      <BaseButton
        id="btn_ok"
        :label="viewBinding.btnOk.text"
        variant="link"
        size="medium"
        :disabled="!viewBinding.btnOk.isEnabled"
        @click="singleClickListener.onSingleClick()"
      />
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';

import BaseButton from '~/components/base/button/BaseButton.vue';
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

const titleClass = computed(() => [
  'notification-modal__title',
  ['1', '2', '3'].includes(alarmLevel.value) &&
    `notification-modal__title--level-${alarmLevel.value}`,
]);

function handleModalOpenChange(val: boolean) {
  if (!val && !onBackPressed()) {
    return;
  }
  emit('update:modelValue', val);
  if (!val) {
    emit('close');
  }
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
