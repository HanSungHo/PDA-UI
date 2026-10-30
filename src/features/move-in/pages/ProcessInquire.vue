<script setup lang="ts">
import { BaseButton, BaseCheckbox, BaseInput, BaseModal, BaseScreen } from 'src/components/base';
import { computed, onMounted, ref } from 'vue';

import type { BaseRevoGridColumn, BaseRevoGridKey } from '~/components/base/index.ts';
import BaseRevoGrid from '~/components/base/revo-grid/BaseRevoGrid.vue';

import { useConfirmModal } from '../composables/useConfirmModal';
import type {
  ProcessInquireResult,
  WaferSelectPayload,
  WaferSelectTarget,
} from '../composables/useProcessInquire';
import { useProcessInquire } from '../composables/useProcessInquire';

const emit = defineEmits<{
  (e: 'cancel'): void;
  (e: 'complete', result: ProcessInquireResult): void;
}>();

/**
 * Modal state
 *
 * Uses the same singleton state as the useConfirmModal
 * used internally by useProcessInquire.
 */
const { modalOpen, modalTitle, modalMessage, modalType, resolveModal, handleModalCancel } =
  useConfirmModal();

const {
  form,
  rows,
  skipCurrentProcess,
  scopeSubstitution,
  isCurrentOperationSkipEnabled,
  isLoading,
  isSubmitting,
  toggleMeasureRow,
  initialize,
  submitCurrentMeasure,
  getWaferSelectPayload,
} = useProcessInquire({ onComplete: (result) => emit('complete', result) });

/* ---------------------------------- Wafer select ---------------------------------- */

const waferSelectOpen = ref(false);
const waferSelectPayload = ref<WaferSelectPayload | null>(null);
const selectedWaferOptions = ref<string[]>([]);

function openWaferSelect(target: WaferSelectTarget): void {
  waferSelectPayload.value = getWaferSelectPayload(target);
  selectedWaferOptions.value = [];
  waferSelectOpen.value = true;
}

const waferOptions = computed(
  () => waferSelectPayload.value?.existingWaferList.split(',').filter(Boolean) ?? [],
);

function toggleWaferOption(option: string): void {
  if (selectedWaferOptions.value.includes(option)) {
    selectedWaferOptions.value = selectedWaferOptions.value.filter((item) => item !== option);
    return;
  }

  const selectionLimit = waferSelectPayload.value?.fixedCount ?? 0;
  if (selectedWaferOptions.value.length < selectionLimit) {
    selectedWaferOptions.value = [...selectedWaferOptions.value, option];
  }
}

function waferOptionLabel(option: string): string {
  return option.slice(option.lastIndexOf('.') + 1);
}

function toggleSelectAll(): void {
  if (selectedWaferOptions.value.length === waferOptions.value.length) {
    selectedWaferOptions.value = [];
    return;
  }

  const selectionLimit = waferSelectPayload.value?.fixedCount ?? 0;
  selectedWaferOptions.value = waferOptions.value.slice(0, selectionLimit);
}

function closeWaferSelect(clearValue: boolean): void {
  const target = waferSelectPayload.value?.target;
  if (clearValue && target) form[target] = '';
  waferSelectOpen.value = false;
  waferSelectPayload.value = null;
  selectedWaferOptions.value = [];
}

function confirmWaferSelect(): void {
  const payload = waferSelectPayload.value;
  if (!payload) return;

  const prefix = payload.target.endsWith('Slot') ? 'Slot.' : `${payload.lotId}.`;
  form[payload.target] = selectedWaferOptions.value
    .map((option) => option.replace(prefix, ''))
    .join(',');
  closeWaferSelect(false);
}

/* ------------------------------------- Grid ------------------------------------- */

const gridColumns: BaseRevoGridColumn[] = [
  { prop: 'subOperation', name: 'Process', size: 120 },
  { prop: 'status', name: 'S', size: 40 },
  { prop: 'description', name: 'Description', size: 180 },
];

const ROW_CLASS: Record<string, string> = {
  Y: 'process-inquire__row--selected',
  C: 'process-inquire__row--complete',
};

const gridRows = computed(() =>
  rows.value.map((row) => ({ ...row, rowClass: ROW_CLASS[row.status] ?? '' })),
);

function onGridRowSelect(rowKey: BaseRevoGridKey): void {
  const row = rows.value.find((r) => r.id === rowKey);
  if (row) toggleMeasureRow(row);
}

onMounted(async () => {
  await initialize();
});
</script>

<template>
  <BaseScreen class="process-inquire" title="계측 공정선택">
    <div class="ds-screen__card">
      <BaseInput label="LOT No." :model-value="form.lotNo" readonly />
      <BaseInput label="JOB" :model-value="form.job" readonly />
      <BaseInput label="현재공정" :model-value="form.currentProcess" readonly />

      <div class="ds-screen__card-row">
        <BaseInput label="제품명" :model-value="form.productName" readonly />
        <BaseInput
          class="process-inquire__quantity"
          label="수량"
          :model-value="String(form.quantity ?? '')"
          readonly
        />
      </div>

      <div class="ds-screen__card-row">
        <BaseInput v-model="form.currentSlot" label="현상SLOT" />
        <BaseButton
          label="W/H"
          size="small"
          variant="secondary"
          @click="openWaferSelect('currentSlot')"
        />
      </div>

      <div class="ds-screen__card-row">
        <BaseInput v-model="form.currentWf" label="WF" />
        <BaseButton
          label="W/H"
          size="small"
          variant="secondary"
          @click="openWaferSelect('currentWf')"
        />
      </div>

      <div class="ds-screen__card-row">
        <BaseInput v-model="form.semSlot" label="SEM SLOT" />
        <BaseButton
          label="W/H"
          size="small"
          variant="secondary"
          @click="openWaferSelect('semSlot')"
        />
      </div>

      <div class="ds-screen__card-row">
        <BaseInput v-model="form.semWf" label="WF" />
        <BaseButton
          label="W/H"
          size="small"
          variant="secondary"
          @click="openWaferSelect('semWf')"
        />
      </div>
    </div>

    <div class="ds-screen__card process-inquire__grid">
      <BaseRevoGrid
        :rows="gridRows"
        :columns="gridColumns"
        row-key="id"
        :resize="false"
        :filter="false"
        stretch
        accessible-label="계측 공정"
        @row-select="onGridRowSelect"
      />
    </div>

    <div class="ds-screen__card process-inquire__checkbox-card">
      <BaseCheckbox
        v-model="skipCurrentProcess"
        label="현공정 Skip"
        :disabled="!isCurrentOperationSkipEnabled"
      />
      <BaseCheckbox v-model="scopeSubstitution" label="Scope 대체" />
    </div>

    <template #footer>
      <BaseButton
        label="확인"
        size="medium"
        variant="primary"
        :loading="isSubmitting"
        :disabled="isLoading"
        @click="submitCurrentMeasure"
      />
      <BaseButton label="취소" size="medium" variant="tertiary" @click="emit('cancel')" />
    </template>

    <!-- Common Alert / Confirm Modal -->
    <BaseModal
      v-model:open="modalOpen"
      :title="modalTitle"
      :closable="true"
      :overlay-closable="false"
      @cancel="handleModalCancel"
    >
      <div class="process-inquire-modal-message">
        {{ modalMessage }}
      </div>

      <template #footer>
        <!-- Cancel button only for confirm -->
        <BaseButton
          v-if="modalType === 'confirm'"
          label="취소"
          size="medium"
          variant="secondary"
          @click="resolveModal(false)"
        />
        <!-- Shared OK button for alert / confirm -->
        <BaseButton label="확인" size="medium" variant="secondary" @click="resolveModal(true)" />
      </template>
    </BaseModal>

    <BaseModal
      v-model:open="waferSelectOpen"
      title="WAFER 선택"
      :closable="true"
      :overlay-closable="false"
      @cancel="closeWaferSelect(true)"
    >
      <div class="wafer-select-modal">
        <div class="wafer-select-header">
          <span>LOT No.</span>
          <span>{{ form.lotNo }}</span>
          <BaseButton label="전체선택" size="small" variant="secondary" @click="toggleSelectAll" />
        </div>
        <div class="wafer-options" role="group" aria-label="WAFER 선택">
          <button
            v-for="option in waferOptions"
            :key="option"
            class="wafer-option"
            :class="{ 'is-selected': selectedWaferOptions.includes(option) }"
            type="button"
            :aria-pressed="selectedWaferOptions.includes(option)"
            :aria-label="option"
            @click="toggleWaferOption(option)"
          >
            {{ waferOptionLabel(option) }}
          </button>
        </div>
        <div class="selected-wafer-list" aria-live="polite">
          {{ selectedWaferOptions.join(', ') }}
        </div>
      </div>

      <template #footer>
        <BaseButton
          label="취소"
          size="medium"
          variant="secondary"
          @click="closeWaferSelect(true)"
        />
        <BaseButton label="확인" size="medium" variant="primary" @click="confirmWaferSelect" />
      </template>
    </BaseModal>
  </BaseScreen>
</template>

<style scoped src="../styles/process-inquire.css"></style>

<style scoped>
.process-inquire-modal-message {
  white-space: pre-line;
  text-align: center;
  padding: 20px 8px;
  line-height: 1.6;
}

.wafer-select-modal {
  display: grid;
  gap: 12px;
}

.wafer-select-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.wafer-select-header span:nth-child(2) {
  flex: 1;
  overflow-wrap: anywhere;
}

.wafer-options {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 6px;
  max-height: min(52vh, 420px);
  overflow: auto;
}

.wafer-option {
  min-height: 38px;
  padding: 0 2px;
  border: 1px solid var(--ds-color-border, #d5dbe3);
  border-radius: 4px;
  background: #fff;
  color: var(--ds-color-text, #1f2937);
  cursor: pointer;
  font-size: 12px;
  white-space: nowrap;
}

.wafer-option.is-selected {
  border-color: #2096fb;
  background: #2096fb;
  color: #fff;
}

.selected-wafer-list {
  min-height: 24px;
  overflow-wrap: anywhere;
}
</style>
