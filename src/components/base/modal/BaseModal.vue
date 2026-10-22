<template>
  <q-dialog
    :model-value="open"
    :persistent="!overlayClosable"
    :no-esc-dismiss="!closable"
    transition-show="scale"
    transition-hide="scale"
    class="ds-modal-dialog"
    @update:model-value="handleOpenChange"
    @hide="emit('afterClose')"
  >
    <q-card class="ds-modal" :style="cardStyle">
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
              <span class="ds-modal__close-icon">✕</span>
            </slot>
          </button>
        </div>

        <div class="ds-modal__body">
          <slot />
        </div>

        <div v-if="$slots.footer" class="ds-modal__footer">
          <slot name="footer" :close="() => handleOpenChange(false)" />
        </div>
      </div>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { QCard } from 'quasar';
import { computed } from 'vue';

import { baseModalDefaults, type BaseModalEmits, type BaseModalProps } from './base-modal.types';

defineOptions({ name: 'BaseModal' });

const props = withDefaults(defineProps<BaseModalProps>(), {
  ...baseModalDefaults,
});
const emit = defineEmits<BaseModalEmits>();

defineSlots<{
  default?(): unknown;
  title?(): unknown;
  closeIcon?(): unknown;
  footer?(scope: { close: () => void }): unknown;
}>();

const cardStyle = computed(() => {
  const widthVal = props.width;
  return {
    width: typeof widthVal === 'number' ? `${widthVal}px` : widthVal,
    maxWidth: 'calc(100vw - 20px)',
  };
});

function handleClose(event: MouseEvent): void {
  emit('cancel', event);
  emit('update:open', false);
}

function handleOpenChange(value: boolean): void {
  emit('update:open', value);
  if (!value) {
    emit('cancel');
  }
}

defineExpose({
  close: () => handleOpenChange(false),
});
</script>

<style src="./base-modal.css"></style>
