<template>
  <BaseModal
    :open="modelValue"
    :title="modalTitle"
    :closable="false"
    :overlay-closable="false"
    class="remote-recipe-dialog-modal"
    @cancel="handleCancel"
    @update:open="handleModalOpenChange"
  >
    <template #title>
      <span class="remote-recipe-dialog__title">{{ modalTitle }}</span>
    </template>

    <div class="remote-recipe-dialog-content">
      <div class="remote-recipe-card">
        <!-- Selected RECIPE label + value -->
        <div class="remote-recipe-group">
          <div class="remote-recipe-label">선택 RECIPE</div>
          <div class="remote-recipe-value remote-recipe-value--recipe">
            {{ recipeList }}
          </div>
        </div>

        <!-- Selected Run No label + value: hidden entirely when lotNo is empty (legacy View.GONE) -->
        <template v-if="hasLotNo">
          <div class="remote-recipe-group">
            <div class="remote-recipe-label">선택 Run No</div>
            <div class="remote-recipe-value remote-recipe-value--lot">
              {{ lotNo }}
            </div>
          </div>
        </template>

        <!-- Confirmation prompt -->
        <div class="remote-recipe-prompt">계속 진행하시겠습니까?</div>
      </div>
    </div>

    <!-- Footer: BaseButton variant link (green text, no border, no background) -->
    <template #footer>
      <BaseButton variant="link" class="remote-recipe-btn" label="취소" @click="handleCancel" />
      <BaseButton variant="link" class="remote-recipe-btn" label="확인" @click="handleConfirm" />
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { BaseButton, BaseModal } from 'src/components/base';
import { computed, onMounted, onUnmounted, watch } from 'vue';

import type {
  RemoteRecipeDialogEmits,
  RemoteRecipeDialogProps,
} from '~/types/remote-recipe-dialog.types';

defineOptions({ name: 'RemoteRecipeDialog' });

const props = withDefaults(defineProps<RemoteRecipeDialogProps>(), {
  lotNo: '',
  legacyBackBehavior: true,
});

const emit = defineEmits<RemoteRecipeDialogEmits>();

// When lotNo is empty, the Run No row is hidden entirely (legacy: View.GONE for txtSelectLot + txtLotNo)
const hasLotNo = computed(() => Boolean(props.lotNo?.trim()));

// Title matches legacy txt_title: "OK" label — shown as "확인" in Korean locale screenshots
const modalTitle = computed(() => '확인');

function handleConfirm(): void {
  emit('confirm');
  emit('update:modelValue', false);
}

function handleCancel(): void {
  emit('cancel');
  emit('update:modelValue', false);
}

function handleModalOpenChange(open: boolean): void {
  if (!open) {
    handleCancel();
  }
}

function handleKeydown(event: KeyboardEvent): void {
  if (!props.modelValue) return;

  if (event.key === 'Escape') {
    event.preventDefault();
    // Legacy HiFOS behavior: onBackPressed triggers btnOk.performClick() — confirm, not cancel
    if (props.legacyBackBehavior) {
      handleConfirm();
    } else {
      handleCancel();
    }
  } else if (event.key === 'Enter') {
    event.preventDefault();
    handleConfirm();
  }
}

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      if (typeof window !== 'undefined') {
        window.addEventListener('keydown', handleKeydown);
      }
    } else {
      if (typeof window !== 'undefined') {
        window.removeEventListener('keydown', handleKeydown);
      }
    }
  },
  { immediate: true },
);

onMounted(() => {
  if (props.modelValue && typeof window !== 'undefined') {
    window.addEventListener('keydown', handleKeydown);
  }
});

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleKeydown);
  }
});
</script>

<style scoped>
.remote-recipe-dialog-modal :deep(.ds-modal__body) {
  background-color: var(--ds-color-bg);
  padding: var(--spacing-space-4) var(--spacing-space-3) var(--spacing-space-3);
}

.remote-recipe-dialog__title {
  font-size: var(--ds-modal-title-size);
  font-weight: var(--ds-font-weight-bold);
  color: var(--ds-modal-title-color);
  line-height: var(--ds-line-height-xl);
}

.remote-recipe-dialog-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-space-3);
}

/* Content stack only — BaseModal owns surface colors (no legacy yellow / no hardcoded hex) */
.remote-recipe-card {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-space-3);
}

.remote-recipe-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-space-0);
}

.remote-recipe-label {
  font-size: var(--ds-font-size-md);
  font-weight: var(--ds-font-weight-semibold);
  color: var(--ds-color-text-secondary);
  letter-spacing: 0.01em;
}

.remote-recipe-value {
  font-size: var(--ds-font-size-2xl);
  font-weight: var(--ds-font-weight-bold);
  line-height: var(--ds-line-height-lg);
  word-break: break-word;
  /* Support horizontal scrolling for long recipe names (mirrors ScrollingMovementMethod) */
  overflow-x: auto;
  white-space: nowrap;
}

.remote-recipe-value--recipe {
  color: var(--ds-color-primary);
}

.remote-recipe-value--lot {
  color: var(--ds-color-text);
  font-family: var(--ds-font-family-monospace);
}

.remote-recipe-prompt {
  font-size: var(--ds-font-size-lg);
  font-weight: var(--ds-font-weight-semibold);
  color: var(--ds-color-text);
  text-align: center;
  padding-top: var(--spacing-space-2);
  border-top: 1px dashed var(--ds-color-border);
}

.remote-recipe-btn {
  min-width: var(--spacing-space-11);
}
</style>
