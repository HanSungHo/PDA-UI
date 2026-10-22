<template>
  <BaseModal
    :open="modelValue"
    :title="modalTitle"
    :closable="false"
    :overlay-closable="false"
    class="moveout-eqp-down-modal"
    @cancel="handleCancel"
    @update:open="handleModalOpenChange"
  >
    <template #title>
      <span class="moveout-eqp-down-modal__title">{{ modalTitle }}</span>
    </template>

    <div class="moveout-eqp-down-content">
      <!-- Notice / Confirmation prompt -->
      <div class="moveout-eqp-down-prompt">장비 비부하 DOWN 시키겠습니까?</div>

      <!-- Main Machine & Select All Row -->
      <div class="moveout-eqp-down-row">
        <BaseCheckbox
          :model-value="isMainChecked"
          :label="machineName || machine"
          class="moveout-eqp-down-chk--main"
          @update:model-value="store.toggleMain"
        />

        <BaseCheckbox
          v-if="hasChambers"
          :model-value="isSelectAll"
          label="전체 선택"
          class="moveout-eqp-down-chk--all"
          @update:model-value="store.toggleSelectAll"
        />
      </div>

      <!-- Chamber Section: Clean header and row conforming to design (no yellow box) -->
      <div v-if="hasChambers" class="moveout-eqp-down-chamber">
        <div class="moveout-eqp-down-chamber__header">CHAMBER</div>
        <div class="moveout-eqp-down-chamber__grid">
          <BaseCheckbox
            v-for="(chamber, idx) in chambers"
            :key="chamber.name"
            :model-value="chamber.checked"
            :disabled="!chamber.enabled"
            :label="chamber.name"
            class="moveout-eqp-down-chk--chamber"
            @update:model-value="(val: boolean) => store.toggleChamber(idx, val)"
          />
        </div>
      </div>
    </div>

    <!-- Footer Action Buttons -->
    <template #footer>
      <BaseButton
        variant="link"
        class="moveout-eqp-down-btn moveout-eqp-down-btn--cancel"
        :label="COMMON_FIELD.NEGATIVEBTNSTR"
        :disabled="isSubmitting"
        @click="handleCancel"
      />
      <BaseButton
        variant="link"
        class="moveout-eqp-down-btn moveout-eqp-down-btn--ok"
        :label="COMMON_FIELD.BTNOKSTR"
        :loading="isSubmitting"
        @click="handleOk"
      />
    </template>
  </BaseModal>

  <!-- Alert Modal for Validation & MES Error Feedback -->
  <BaseModal
    v-if="alertState.open"
    :open="alertState.open"
    :title="alertState.title"
    :closable="false"
    :overlay-closable="false"
    class="action-dialog"
    @cancel="handleAlertDismiss"
    @update:open="handleAlertOpenChange"
  >
    <p class="action-dialog-message">
      {{ alertState.message }}
    </p>

    <template #footer>
      <div class="action-dialog-actions">
        <BaseButton
          class="action-dialog-confirm"
          :label="COMMON_FIELD.BTNOKSTR"
          @click="handleAlertDismiss"
        />
      </div>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { BaseButton, BaseCheckbox, BaseModal } from 'src/components/base';
import { COMMON_FIELD } from 'src/constants/common-strings';
import { computed, ref, watch } from 'vue';

import { useMoveOutEqpDownStore } from '../stores/moveout-eqp-down.store';
import type {
  MoveOutEqpDownDialogEmits,
  MoveOutEqpDownDialogProps,
} from '../types/moveout-eqp-down.types';

defineOptions({ name: 'MoveOutEqpDownDialog' });

const props = withDefaults(defineProps<MoveOutEqpDownDialogProps>(), {
  chamberList: () => [],
  facility: 'FAB1',
  operatorId: 'OP10023',
  operatorName: 'OPERATOR',
});

const emit = defineEmits<MoveOutEqpDownDialogEmits>();

const store = useMoveOutEqpDownStore();
const { machineName, isMainChecked, chambers, isSelectAll, isSubmitting, alertState, hasChambers } =
  storeToRefs(store);

const modalTitle = computed(() => '확 인');
const isApiErrorOccurred = ref(false);

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      isApiErrorOccurred.value = false;
      store.init(props.machine, props.chamberList);
    }
  },
  { immediate: true },
);

function handleModalOpenChange(open: boolean) {
  if (!open) {
    handleCancel();
  }
}

function handleAlertOpenChange(open: boolean) {
  if (!open) {
    handleAlertDismiss();
  }
}

function handleCancel() {
  emit('update:modelValue', false);
  emit('resolve', {
    action: 'OK',
    success: true,
    changed: false,
    mainDown: false,
    downChambers: [],
  });
  emit('completed', { action: 'OK', success: true });
}

async function handleOk() {
  isApiErrorOccurred.value = false;
  const result = await store.submitDown({
    facility: props.facility,
    operatorId: props.operatorId,
    operatorName: props.operatorName,
  });

  if (result.validationError) {
    return;
  }

  if (result.success) {
    emit('update:modelValue', false);
    emit('resolve', {
      action: 'OK',
      success: true,
      changed: true,
      mainDown: result.mainDown ?? isMainChecked.value,
      downChambers: result.downChambers ?? [],
    });
    emit('completed', { action: 'OK', success: true });
  } else {
    isApiErrorOccurred.value = true;
  }
}

function handleAlertDismiss() {
  if (isApiErrorOccurred.value) {
    store.closeAlert();
    isApiErrorOccurred.value = false;
    emit('update:modelValue', false);
    emit('resolve', {
      action: 'OK',
      success: true,
      changed: false,
      mainDown: false,
      downChambers: [],
    });
    emit('completed', { action: 'OK', success: true });
  } else {
    store.closeAlert();
  }
}
</script>

<style scoped>
/* Modal container width */
.moveout-eqp-down-modal :deep(.ds-modal) {
  width: min(340px, calc(100vw - var(--ds-modal-margin-x, 24px) * 2)) !important;
}

.moveout-eqp-down-modal :deep(.ds-modal__header) {
  justify-content: center;
}

.moveout-eqp-down-modal :deep(.ds-modal__title) {
  text-align: center;
}

/* Modal Body Background and padding matching design tokens */
.moveout-eqp-down-modal :deep(.ds-modal__body) {
  background-color: var(--ds-color-bg);
  padding: var(--spacing-space-4) var(--spacing-space-3) var(--spacing-space-3);
}

.moveout-eqp-down-modal__title {
  font-size: var(--ds-modal-title-size);
  font-weight: var(--ds-font-weight-bold);
  color: var(--ds-modal-title-color);
  line-height: var(--ds-line-height-xl);
}

/* Content layout */
.moveout-eqp-down-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-space-4);
}

.moveout-eqp-down-prompt {
  font-size: var(--ds-font-size-md);
  font-weight: var(--ds-font-weight-semibold);
  color: var(--ds-color-text);
  line-height: var(--ds-line-height-md);
  text-align: left;
}

.moveout-eqp-down-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-space-7);
}

/* Chamber Section */
.moveout-eqp-down-chamber {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-space-2);
}

.moveout-eqp-down-chamber__header {
  font-size: var(--ds-font-size-md);
  font-weight: var(--ds-font-weight-bold);
  color: var(--ds-color-text);
  letter-spacing: 0.02em;
  text-align: left;
}

.moveout-eqp-down-chamber__grid {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacing-space-7);
}

/* Action Buttons */
.moveout-eqp-down-btn {
  min-width: var(--spacing-space-11, 60px);
  height: var(--component-button-height-md, 38px);
  padding: 0 var(--spacing-space-3);
  font-size: var(--ds-font-size-md);
  font-weight: var(--ds-font-weight-semibold);
  border-radius: var(--ds-radius-lg);
}
</style>

<style src="../../../components/base/modal/action-dialog.css"></style>
