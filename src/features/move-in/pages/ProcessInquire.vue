<script setup lang="ts">
import { BaseButton, BaseCheckbox, BaseInputField, BaseModal } from 'src/components/base';
import { computed, onMounted, ref } from 'vue';

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
/**
 * Modal state
 *
 * useProcessInquire 내부에서 사용하는
 * useConfirmModal과 동일한 singleton state를 사용한다.
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

onMounted(async () => {
  await initialize();
});
</script>

<template>
  <div class="process-inquire-legacy">
    <div class="header">
      <button class="back-btn" aria-label="Back" type="button" @click="emit('cancel')">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M19 12H5" />
          <path d="M12 19l-7-7 7-7" />
        </svg>
      </button>

      <span class="title"> 계측 공정선택 </span>
    </div>

    <div class="container">
      <div class="card-product-info">
        <div class="form-row">
          <div class="form-group">
            <span class="label"> LOT NO. </span>

            <BaseInputField :model-value="form.lotNo" :disabled="true" />
          </div>

          <div class="form-group">
            <span class="label"> JOB </span>

            <BaseInputField :model-value="form.job" :disabled="true" />
          </div>
        </div>

        <div class="form-group">
          <span class="label"> 현재공정 </span>

          <BaseInputField :model-value="form.currentProcess" :disabled="true" />
        </div>

        <div class="form-row">
          <div class="form-group">
            <span class="label"> 제품명 </span>

            <BaseInputField :model-value="form.productName" :disabled="true" />
          </div>

          <div class="form-group">
            <span class="label"> 수량 </span>

            <BaseInputField :model-value="form.quantity" :disabled="true" />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <span class="label"> 현상SLOT </span>

            <BaseInputField v-model="form.currentSlot" :disabled="false" />
          </div>

          <div class="wh-button">
            <BaseButton
              label="W/H"
              size="medium"
              variant="secondary"
              @click="openWaferSelect('currentSlot')"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <span class="label"> WF </span>

            <BaseInputField v-model="form.currentWf" :disabled="false" />
          </div>

          <div class="wh-button">
            <BaseButton
              label="W/H"
              size="medium"
              variant="secondary"
              @click="openWaferSelect('currentWf')"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <span class="label"> SEM SLOT </span>

            <BaseInputField v-model="form.semSlot" :disabled="false" />
          </div>

          <div class="wh-button">
            <BaseButton
              label="W/H"
              size="medium"
              variant="secondary"
              @click="openWaferSelect('semSlot')"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <span class="label"> WF </span>

            <BaseInputField v-model="form.semWf" :disabled="false" />
          </div>

          <div class="wh-button">
            <BaseButton
              label="W/H"
              size="medium"
              variant="secondary"
              @click="openWaferSelect('semWf')"
            />
          </div>
        </div>
      </div>

      <div class="display-data">
        <table class="data-table">
          <thead>
            <tr>
              <th>공정명</th>
              <th>S</th>
              <th>Description</th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="row in rows"
              :key="row.id"
              :class="{
                'is-selected': row.status === 'Y',
                'is-complete': row.status === 'C',
              }"
              @click="toggleMeasureRow(row)"
            >
              <td>
                {{ row.subOperation }}
              </td>

              <td>
                {{ row.status }}
              </td>

              <td>
                {{ row.description }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="checkbox-area">
        <BaseCheckbox
          v-model="skipCurrentProcess"
          class="check-box"
          label="현공정 Skip"
          :disabled="!isCurrentOperationSkipEnabled"
        />

        <BaseCheckbox v-model="scopeSubstitution" class="check-box" label="Scope 대체" />
      </div>

      <div class="bottom-section">
        <BaseButton
          class="confirm-btn"
          label="확인"
          size="medium"
          variant="secondary"
          :disabled="isLoading || isSubmitting"
          @click="submitCurrentMeasure"
        />

        <BaseButton
          class="cancel-btn"
          label="취소"
          size="medium"
          variant="secondary"
          @click="emit('cancel')"
        />
      </div>
    </div>
  </div>

  <!--
    Common Alert / Confirm Modal
  -->
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
      <!-- Confirm일 때만 취소 버튼 표시 -->
      <BaseButton
        v-if="modalType === 'confirm'"
        label="취소"
        size="medium"
        variant="secondary"
        @click="resolveModal(false)"
      />

      <!-- Alert / Confirm 공통 확인 버튼 -->
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
      <BaseButton label="취소" size="medium" variant="secondary" @click="closeWaferSelect(true)" />
      <BaseButton label="확인" size="medium" variant="primary" @click="confirmWaferSelect" />
    </template>
  </BaseModal>
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
