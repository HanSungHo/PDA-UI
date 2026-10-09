<template>
  <BaseModal
    :open="modelValue"
    :width="780"
    title="Backup Bay 변경"
    :closable="false"
    :overlay-closable="false"
    class="backup-bay-modal"
    @cancel="handleClose"
    @update:open="handleModalOpenChange"
  >
    <template #title>
      <span class="backup-bay-modal__title">Backup Bay 변경</span>
    </template>

    <div class="backup-bay-content">
      <!-- Main Layout: Powered by BaseRevoGrid -->
      <div class="backup-bay-table-wrap">
        <BaseRevoGrid
          class="backup-bay-grid"
          :columns="columns"
          :rows="rows"
          row-key="id"
          :row-size="44"
          :readonly="true"
        />
      </div>
    </div>

    <template #footer>
      <div class="backup-bay-actions">
        <BaseButton
          variant="link"
          size="large"
          class="backup-bay-btn backup-bay-btn--run"
          label="실행"
          :loading="isExecuting"
          @click="handleRun"
        />
        <BaseButton
          variant="link"
          size="large"
          class="backup-bay-btn backup-bay-btn--close"
          label="닫기"
          :disabled="isExecuting"
          @click="handleClose"
        />
      </div>
    </template>

    <!-- OkDialog / Alert Modal for Errors and Completion -->
    <BaseModal
      :open="alertState.open"
      :closable="false"
      :overlay-closable="false"
      class="backup-bay-alert-modal"
      @update:open="store.closeAlert"
    >
      <template #title>
        <div class="backup-bay-alert__header">
          <span>{{ alertState.title }}</span>
        </div>
      </template>

      <div class="backup-bay-alert__body">
        <p class="backup-bay-alert__text">{{ alertState.message }}</p>
      </div>

      <template #footer>
        <div class="backup-bay-alert__footer">
          <BaseButton
            variant="link"
            size="medium"
            class="backup-bay-alert__btn"
            label="확인"
            @click="handleAlertOk"
          />
        </div>
      </template>
    </BaseModal>
  </BaseModal>
</template>

<script setup lang="ts">
import { VGridVueTemplate } from '@revolist/vue3-datagrid';
import { storeToRefs } from 'pinia';
import { BaseButton, BaseModal, BaseRevoGrid } from 'src/components/base';
import type { BaseRevoGridColumn } from 'src/components/base/revo-grid';
import { useBackupBayStore } from 'src/stores/backup-bay.store';
import type { BackupBayDialogEmits, BackupBayDialogProps } from 'src/types/backup-bay.types';
import { computed, nextTick, onMounted, ref, watch } from 'vue';

import { BaySelectCell, FloorSelectCell, LotInputCell, ReadOnlyCell } from './BackupBayCells';

defineOptions({ name: 'BackupBayDialog' });

const props = defineProps<BackupBayDialogProps>();
const emit = defineEmits<BackupBayDialogEmits>();

const store = useBackupBayStore();
const { rows, isExecuting, alertState } = storeToRefs(store);

const pendingFocusIndex = ref<number | null>(null);

function focusLotInput(index: number) {
  void nextTick(() => {
    const inputs = document.querySelectorAll<HTMLInputElement>(
      '.backup-bay-input--lot input, input.backup-bay-input--lot',
    );
    const input = inputs[index];
    if (input) {
      input.focus();
      input.select();
    }
  });
}

function handleLotUpdate(index: number, val: string) {
  if (rows.value[index]) {
    rows.value[index].lotId = val;
  }
}

async function handleLotEnter(index: number) {
  const rawVal = rows.value[index]?.lotId ?? '';
  const result = await store.processLotInput(index, rawVal);

  if (result.success) {
    focusLotInput(result.focusIndex);
  } else {
    pendingFocusIndex.value = result.focusIndex;
  }
}

function handleAlertOk() {
  store.closeAlert();
  if (pendingFocusIndex.value !== null) {
    focusLotInput(pendingFocusIndex.value);
    pendingFocusIndex.value = null;
  }
}

async function handleFloorChange(index: number, value: string) {
  await store.setFloor(index, value);
}

function handleBayChange(index: number, value: string) {
  store.setBay(index, value);
}

async function handleRun() {
  const result = await store.executeRun();
  if (result.success) {
    emit('completed', result.count || 0);
    focusLotInput(0);
  }
}

function handleClose() {
  emit('update:modelValue', false);
}

function handleModalOpenChange(open: boolean) {
  emit('update:modelValue', open);
}

const lotTemplate = VGridVueTemplate(LotInputCell, {
  onLotUpdate: handleLotUpdate,
  onLotEnter: handleLotEnter,
});

const floorTemplate = VGridVueTemplate(FloorSelectCell, {
  onFloorChange: handleFloorChange,
});

const bayTemplate = VGridVueTemplate(BaySelectCell, {
  onBayChange: handleBayChange,
});

const readOnlyTemplate = VGridVueTemplate(ReadOnlyCell);

const columns = computed<BaseRevoGridColumn[]>(() => [
  {
    prop: 'lotId',
    name: 'LOT NO',
    size: 155,
    pin: 'colPinStart',
    cellTemplate: lotTemplate,
  },
  {
    prop: 'selectedFloor',
    name: '층',
    size: 105,
    cellTemplate: floorTemplate,
  },
  {
    prop: 'selectedBay',
    name: 'BAY',
    size: 130,
    cellTemplate: bayTemplate,
  },
  {
    prop: 'jobCode',
    name: 'JOB',
    size: 110,
    cellTemplate: readOnlyTemplate,
  },
  {
    prop: 'quantity',
    name: 'QTY',
    size: 80,
    cellTemplate: readOnlyTemplate,
  },
  {
    prop: 'processName',
    name: '공정명',
    size: 200,
    cellTemplate: readOnlyTemplate,
  },
]);

watch(
  () => props.modelValue,
  async (isOpen) => {
    if (isOpen) {
      await store.initDialog();
      focusLotInput(0);
    }
  },
  { immediate: true },
);

onMounted(() => {
  if (props.modelValue) {
    void store.initDialog();
    focusLotInput(0);
  }
});
</script>

<style scoped>
.backup-bay-modal__title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--ds-color-neutral-900, #101828);
  line-height: 1.3;
}

.backup-bay-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 4px;
  background-color: var(--ds-color-bg-secondary, #f7f8f9);
}

/* Table Wrapper */
.backup-bay-table-wrap {
  width: 100%;
  height: 360px;
}

.backup-bay-grid {
  width: 100%;
  height: 100%;
}

.backup-bay-cell-wrap {
  display: flex;
  align-items: center;
  width: 100%;
  height: 100%;
  padding: 2px 4px;
}

.backup-bay-cell-wrap :deep(.ds-input),
.backup-bay-cell-wrap :deep(.ds-dropdown-list) {
  width: 100%;
}

.backup-bay-cell-wrap :deep(.q-field__control) {
  height: 36px !important;
  min-height: 36px !important;
  padding: 0 8px;
  border-radius: var(--radius-6, 6px);
  border: 1px solid var(--ds-color-border, #d1d5db);
  background: var(--ds-color-bg, #ffffff);
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.backup-bay-cell-wrap :deep(.q-field__native),
.backup-bay-cell-wrap :deep(.q-field__input) {
  font-size: 13px;
  font-weight: 500;
  color: var(--ds-color-text, #101828);
}

.backup-bay-cell-wrap :deep(.backup-bay-input--lot .q-field__native) {
  text-transform: uppercase;
  font-weight: 600;
}

.backup-bay-cell-wrap :deep(.q-field--focused .q-field__control) {
  border-color: var(--primary-teal-500, #02b0a5);
  box-shadow: 0 0 0 2px var(--primary-teal-50, #effdfc);
}

.backup-bay-cell-wrap :deep(.backup-bay-input--valid .q-field__control) {
  border-color: var(--ds-color-success, #12b76a);
  background-color: var(--primary-teal-50, #effdfc);
}

.backup-bay-cell-wrap :deep(.q-field__append) {
  padding-left: 2px;
}

/* Readonly fields */
.backup-bay-readonly-box {
  width: 100%;
  height: 36px;
  padding: 6px 8px;
  border: 1px solid var(--ds-color-border-disabled, #e5e7eb);
  border-radius: var(--radius-6, 6px);
  background-color: var(--ds-color-bg-disabled, #f9fafb);
  color: var(--ds-color-text, #101828);
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
}

.backup-bay-readonly-box--process {
  font-size: 12px;
}

/* Action Buttons Footer */
.backup-bay-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.backup-bay-btn {
  min-width: 120px;
}

/* Alert Modal */
.backup-bay-alert__header {
  font-size: 17px;
  font-weight: 700;
  color: var(--ds-color-text, #101828);
}

.backup-bay-alert__body {
  padding: 16px 8px;
}

.backup-bay-alert__text {
  font-size: 15px;
  color: var(--ds-color-text, #101828);
  line-height: 1.4;
  margin: 0;
  white-space: pre-line;
}

.backup-bay-alert__footer {
  display: flex;
  justify-content: flex-end;
  padding-top: 8px;
}

.backup-bay-alert__btn {
  min-width: 80px;
}
</style>
