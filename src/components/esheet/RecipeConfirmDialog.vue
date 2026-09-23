<template>
  <BaseModal
    :open="modelValue"
    :title="modalTitle"
    :closable="true"
    :overlay-closable="false"
    class="recipe-confirm-modal"
    @cancel="handleCancel"
    @update:open="handleModalOpenChange"
  >
    <template #title>
      <span class="recipe-confirm-modal__title">{{ modalTitle }}</span>
    </template>

    <div class="recipe-confirm-content">
      <!-- Case A: Normal Recipe Confirmation -->
      <template v-if="!isSkipMode">
        <div class="recipe-confirm-card">
          <!-- Recipe Section -->
          <div class="recipe-confirm-group">
            <div class="recipe-confirm-label">선택 RECIPE</div>
            <div class="recipe-confirm-value recipe-confirm-value--recipe">
              {{ recipe }}
            </div>
          </div>

          <!-- LOT (Run No) Section with Edge Far Flag -->
          <div class="recipe-confirm-group">
            <div class="recipe-confirm-row">
              <div class="recipe-confirm-label">선택 Run No</div>
              <span v-if="isEdgeFar" class="recipe-confirm-edgefar">
                EDGE FAR&nbsp;&nbsp;&nbsp;&nbsp;Y
              </span>
            </div>
            <div class="recipe-confirm-value recipe-confirm-value--lot">
              {{ lotId || '-' }}
            </div>
          </div>

          <!-- Confirmation Prompt -->
          <div class="recipe-confirm-prompt">계속 진행하시겠습니까?</div>
        </div>
      </template>

      <!-- Case B: DiCycle Skip Confirmation -->
      <template v-else>
        <div class="recipe-confirm-skip-card">
          <div class="recipe-confirm-skip-message">
            {{ recipe }}
          </div>
        </div>
      </template>
    </div>

    <!-- Action Buttons Footer -->
    <template #footer>
      <div class="recipe-confirm-actions">
        <BaseButton
          variant="secondary"
          class="recipe-confirm-btn recipe-confirm-btn--cancel"
          label="취소"
          @click="handleCancel"
        />
        <BaseButton
          variant="primary"
          class="recipe-confirm-btn recipe-confirm-btn--ok"
          label="확인"
          @click="handleConfirm"
        />
      </div>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { BaseButton, BaseModal } from 'src/components/base';
import type {
  RecipeConfirmDialogEmits,
  RecipeConfirmDialogProps,
} from 'src/types/recipe-confirm.types';
import { computed } from 'vue';

defineOptions({ name: 'RecipeConfirmDialog' });

const props = withDefaults(defineProps<RecipeConfirmDialogProps>(), {
  lotId: '',
  skip: '',
  edgeFar: '',
  legacyBackBehavior: false,
});

const emit = defineEmits<RecipeConfirmDialogEmits>();

const isSkipMode = computed(() => props.skip === 'OK');
const isEdgeFar = computed(() => props.edgeFar === 'Y');

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
</script>

<style scoped>
.recipe-confirm-modal :deep(.ds-modal) {
  width: min(520px, calc(100vw - var(--ds-modal-margin-x) * 2)) !important;
}

.recipe-confirm-modal__title {
  font-size: var(--ds-modal-title-size, 18px);
  font-weight: 700;
  color: var(--ds-color-neutral-900, #101828);
  line-height: 1.3;
}

.recipe-confirm-content {
  display: flex;
  flex-direction: column;
  gap: var(--figma-radius-16, 16px);
  padding: 4px;
}

/* Case A: Card style */
.recipe-confirm-card {
  display: flex;
  flex-direction: column;
  gap: var(--figma-radius-16, 16px);
  background-color: var(--ds-color-bg, #ffffff);
  border: 1px solid var(--ds-color-border, #e5e7eb);
  border-radius: var(--ds-radius-sm, 6px);
  padding: 16px 20px;
}

.recipe-confirm-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.recipe-confirm-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.recipe-confirm-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--ds-color-text-secondary, #64748b);
  letter-spacing: 0.01em;
}

.recipe-confirm-value {
  font-size: 22px;
  font-weight: 700;
  line-height: 1.3;
  word-break: break-word;
}

.recipe-confirm-value--recipe {
  color: var(--ds-color-primary, #1976d2);
}

.recipe-confirm-value--lot {
  color: var(--ds-color-neutral-900, #0f172a);
  font-family: var(--ds-font-family-mono, inherit);
}

.recipe-confirm-edgefar {
  display: inline-flex;
  align-items: center;
  font-size: 14px;
  font-weight: 700;
  color: var(--ds-color-error, #ef4444);
  background-color: var(--ds-color-error-bg, rgba(239, 68, 68, 0.1));
  padding: 3px 10px;
  border-radius: var(--ds-radius-sm, 4px);
  border: 1px solid var(--ds-color-error, #ef4444);
  letter-spacing: 0.05em;
  white-space: nowrap;
}

.recipe-confirm-prompt {
  font-size: 16px;
  font-weight: 600;
  color: var(--ds-color-neutral-800, #1e293b);
  text-align: center;
  padding-top: 12px;
  border-top: 1px dashed var(--ds-color-border, #e2e8f0);
}

/* Case B: Skip confirmation card */
.recipe-confirm-skip-card {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--ds-color-warning-bg, rgba(245, 158, 11, 0.08));
  border: 1px solid var(--ds-color-warning, #f59e0b);
  border-radius: var(--ds-radius-sm, 6px);
  padding: 24px 20px;
}

.recipe-confirm-skip-message {
  font-size: 17px;
  font-weight: 700;
  line-height: 1.5;
  color: var(--ds-color-neutral-900, #0f172a);
  text-align: center;
  white-space: pre-line;
}

/* Footer Actions */
.recipe-confirm-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  width: 100%;
}

:deep(.recipe-confirm-btn) {
  min-width: 110px;
  height: 42px;
  font-size: 15px;
  font-weight: 700;
  border-radius: var(--ds-radius-sm, 6px);
}
</style>
