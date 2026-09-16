<template>
  <AModal
    :open="open"
    :centered="true"
    :destroy-on-close="true"
    :closable="false"
    :mask-closable="overlayClosable"
    :keyboard="false"
    :footer="null"
    wrap-class-name="ds-modal-wrap"
    class="ds-modal"
    @cancel="handleCancel"
    @update:open="handleOpenChange"
    @after-close="emit('afterClose')"
  >
    <div class="ds-modal__container">
      <div v-if="title || $slots.title || closable" class="ds-modal__header">
        <div class="ds-modal__title">
          <slot name="title">{{ title }}</slot>
        </div>
        <button
          v-if="closable"
          type="button"
          class="ds-modal__close-btn"
          aria-label="Close"
          @click="handleClose"
        >
          <slot name="closeIcon">
            <CloseOutlined class="ds-modal__close-icon" />
          </slot>
        </button>
      </div>

      <div class="ds-modal__body">
        <slot />
      </div>

      <div v-if="$slots.footer" class="ds-modal__footer">
        <slot name="footer" />
      </div>
    </div>
  </AModal>
</template>

<script setup lang="ts">
import { CloseOutlined } from '@ant-design/icons-vue';
import { Modal as AModal } from 'ant-design-vue';

import { baseModalDefaults, type BaseModalEmits, type BaseModalProps } from './base-modal.types';

defineOptions({ name: 'BaseModal' });

withDefaults(defineProps<BaseModalProps>(), baseModalDefaults);
const emit = defineEmits<BaseModalEmits>();

defineSlots<{
  default?(): unknown;
  title?(): unknown;
  closeIcon?(): unknown;
  footer?(): unknown;
}>();

function handleClose(event: MouseEvent): void {
  emit('cancel', event);
  emit('update:open', false);
}

function handleCancel(event?: MouseEvent): void {
  emit('cancel', event);
}

function handleOpenChange(value: boolean): void {
  emit('update:open', value);
}
</script>

<style src="./base-modal.css"></style>
