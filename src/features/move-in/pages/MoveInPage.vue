<template>
  <div v-if="route?.name === 'move-in'" class="move-in-page">
    <!-- HEADER -->
    <div class="move-in-header">
      <button
        type="button"
        class="move-in-back"
        :aria-label="MOVE_IN_UI.buttons.cancel"
        @click="onCancel"
      >
        <svg viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path
            d="M9.5 2L4 7.5L9.5 13"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
      <h1 class="move-in-title">MOVE IN</h1>
    </div>

    <div class="move-in-container">
      <!-- MAIN CARD -->
      <div class="move-in-card">
        <div class="move-in-fields">
          <!-- LOT No. row -->
          <div class="move-in-row move-in-row-lot">
            <BaseInput
              v-model:model-value="lotId"
              class="move-in-field move-in-field-lot"
              :label="MOVE_IN_UI.labels.lotId"
              :placeholder="MOVE_IN_UI.placeholders.lotId"
              readonly
            />
            <BaseInput
              v-model:model-value="batchId"
              class="move-in-field move-in-field-batch"
              :placeholder="MOVE_IN_UI.placeholders.batch"
              readonly
            />
            <img
              v-if="autoMotiveFlag === 'Y'"
              :src="carIcon"
              class="move-in-automotive-icon"
              width="24"
              height="24"
              alt=""
              aria-hidden="true"
            />
            <BaseButton
              variant="secondary"
              class="move-in-btn-outline"
              :disabled="!batchBtnEnabled || loading"
              @click="onBatIdClick"
            >
              {{ MOVE_IN_UI.buttons.batId }}
            </BaseButton>
          </div>

          <!-- RECIPE -->
          <BaseInput
            v-model:model-value="recipeText"
            :class="{ 'move-in-value--changed': recipeChanged }"
            :label="MOVE_IN_UI.labels.recipe"
            :placeholder="MOVE_IN_UI.placeholders.recipe"
            readonly
          />

          <!-- Processing R -->
          <BaseDropdownList
            v-model:model-value="selectedRecipe"
            :label="MOVE_IN_UI.labels.processingR"
            :placeholder="MOVE_IN_UI.placeholders.processingR"
            :options="recipeItems"
            :disabled="loading"
          />

          <!-- Reference Eq -->
          <BaseInput
            v-model:model-value="standardMachine"
            :class="{ 'move-in-value--changed': standardMachineChanged }"
            :label="MOVE_IN_UI.labels.standardMachine"
            :placeholder="MOVE_IN_UI.placeholders.standardMachine"
            readonly
            @dblclick="showStandardMachineInfo"
          />

          <!-- Processing E row -->
          <div class="move-in-row move-in-row-proc-e">
            <BaseInput
              v-model:model-value="eqpId"
              class="move-in-field move-in-field-equipment"
              :label="MOVE_IN_UI.labels.equipment"
              :placeholder="MOVE_IN_UI.placeholders.equipment"
              :disabled="loading"
              @input="onEqpInput"
              @keydown.enter.prevent="onEqpIdCommit"
            />
            <BaseInput
              v-model:model-value="exMachine"
              class="move-in-field"
              :placeholder="MOVE_IN_UI.placeholders.exMachine"
              readonly
            />
          </div>

          <!-- Comment -->
          <BaseInput
            v-model:model-value="comment"
            :label="MOVE_IN_UI.labels.comment"
            :placeholder="MOVE_IN_UI.placeholders.comment"
            :disabled="loading"
          />

          <!-- Product Name -->
          <BaseInput
            :model-value="productDisplay"
            class="move-in-field-product"
            :label="MOVE_IN_UI.labels.product"
            :placeholder="MOVE_IN_UI.placeholders.product"
            readonly
          />

          <!-- Current Process -->
          <BaseInput
            v-model:model-value="currentOperation"
            :label="MOVE_IN_UI.labels.currentOperation"
            :placeholder="MOVE_IN_UI.placeholders.currentOperation"
            readonly
          />

          <!-- Responsible -->
          <BaseInput
            v-model:model-value="engineer"
            :label="MOVE_IN_UI.labels.engineer"
            :placeholder="MOVE_IN_UI.placeholders.engineer"
            readonly
          />

          <!-- Customer -->
          <BaseInput
            v-model:model-value="customer"
            :label="MOVE_IN_UI.labels.customer"
            :placeholder="MOVE_IN_UI.placeholders.customer"
            readonly
          />

          <!-- Quantity / Good Chips -->
          <div class="move-in-row move-in-row-qty">
            <BaseInput
              v-model:model-value="quantity"
              class="move-in-field"
              :label="MOVE_IN_UI.labels.quantity"
              :placeholder="MOVE_IN_UI.placeholders.quantity"
              readonly
            />
            <BaseInput
              v-model:model-value="goodChips"
              class="move-in-field"
              :label="MOVE_IN_UI.labels.goodChips"
              :placeholder="MOVE_IN_UI.placeholders.goodChips"
              readonly
            />
          </div>

          <!-- PROCARD -->
          <div class="move-in-row move-in-row-procard">
            <BaseInput
              v-model:model-value="probeCard"
              class="move-in-field-procard-main"
              :label="MOVE_IN_UI.labels.procard"
              :placeholder="MOVE_IN_UI.placeholders.procard"
              :disabled="loading || !probeCardEnabled"
              @input="onProbeCardInput"
              @keydown.enter.prevent="onProbeCardCommit"
            />
            <BaseInput
              v-model:model-value="probeOD"
              class="move-in-field-procard-sub"
              :placeholder="MOVE_IN_UI.placeholders.procard"
              :disabled="loading || !probeCardEnabled"
              type="number"
            />
            <BaseInput
              v-model:model-value="probeZ"
              class="move-in-field-procard-sub"
              :placeholder="MOVE_IN_UI.placeholders.procard"
              :disabled="loading || !probeCardEnabled"
              type="number"
            />
          </div>
        </div>
      </div>

      <!-- BOTTOM CARD -->
      <div class="move-in-card-bottom">
        <BaseCheckbox
          v-model:model-value="skipCurrentOperation"
          :label="MOVE_IN_UI.labels.skip"
          :disabled="loading || !isSkipAllowed"
        />

        <div class="move-in-comment-row">
          <span class="move-in-comment-label">{{ MOVE_IN_UI.labels.commentCount }}</span>
          <BaseInput v-model:model-value="commentSize" class="move-in-comment-count" readonly />
          <span class="move-in-comment-unit">개</span>
          <BaseButton
            variant="secondary"
            class="move-in-btn-outline"
            :disabled="!readBtnEnabled || loading"
            @click="onReadClick"
          >
            {{ MOVE_IN_UI.buttons.read }}
          </BaseButton>
        </div>
      </div>
    </div>

    <!-- FOOTER -->
    <div class="move-in-footer">
      <BaseButton
        variant="primary"
        class="move-in-footer-btn"
        :loading="loading"
        :disabled="!okEnabled"
        @click="onOK"
      >
        {{ MOVE_IN_UI.buttons.ok }}
      </BaseButton>
      <BaseButton
        variant="primary"
        class="move-in-footer-btn"
        :disabled="loading"
        @click="onWHClick"
      >
        {{ whLabel }}
      </BaseButton>
      <BaseButton
        variant="tertiary"
        class="move-in-footer-btn"
        :disabled="loading"
        @click="onCancel"
      >
        {{ MOVE_IN_UI.buttons.cancel }}
      </BaseButton>
    </div>

    <a-modal
      v-model:open="waferDialogOpen"
      :title="waferDialogTitle"
      :footer="null"
      width="min(420px, calc(100vw - 32px))"
      wrap-class-name="move-in-wafer-modal"
      @cancel="cancelWaferSelection"
    >
      <BaseInput
        v-if="createCategory === 'COUNT'"
        v-model:model-value="countName"
        :label="MOVE_IN_UI.buttons.count"
        :placeholder="MOVE_IN_UI.buttons.count"
      />
      <div v-if="area === 'DIFF' && createCategory === 'SLOT'" class="move-in-machine-lookup">
        <BaseInput
          v-model:model-value="machineSearchId"
          :label="MOVE_IN_UI.labels.equipment"
          :placeholder="MOVE_IN_UI.placeholders.equipment"
          :disabled="loading"
        />
        <BaseButton class="move-in-btn-outline" :disabled="loading" @click="lookupWaferMachine">
          {{ MOVE_IN_UI.buttons.lookupEquipment }}
        </BaseButton>
      </div>
      <div
        v-if="createCategory !== 'COUNT'"
        class="move-in-wafer-list"
        role="group"
        :aria-label="MOVE_IN_UI.alerts.selectWafer"
      >
        <label v-for="wafer in waferOptions" :key="wafer" class="move-in-wafer-option">
          <input
            type="checkbox"
            :checked="selectedWafers.includes(wafer)"
            @change="toggleWaferSelection(wafer)"
          />
          <span>
            {{ wafer }}
            <template v-if="waferMachines[wafer]">({{ waferMachines[wafer] }})</template>
          </span>
        </label>
      </div>
      <div class="move-in-wafer-actions">
        <BaseButton variant="tertiary" @click="cancelWaferSelection">
          {{ MOVE_IN_UI.buttons.cancel }}
        </BaseButton>
        <BaseButton variant="primary" @click="confirmWaferSelection">
          {{ MOVE_IN_UI.buttons.ok }}
        </BaseButton>
      </div>
    </a-modal>
  </div>
  <RouterView v-slot="{ Component }">
    <component
      :is="Component"
      @cancel="closeProcessInquire"
      @complete="completeProcessInquire"
      @confirm="completeBatchLotList"
      @batch-complete="completeBatchMoveIn"
      @open-comment="openBatchMoveInCommentList"
      @inline-cancel="cancelInlineActivity"
      @inline-complete="completeInlineActivity"
    />
  </RouterView>

  <BaseModal
    v-if="route?.name === 'move-in'"
    v-model:open="modalOpen"
    :title="modalTitle"
    :closable="true"
    :overlay-closable="false"
    @cancel="handleModalCancel"
  >
    <p class="move-in-dialog-message" role="alert">{{ modalMessage }}</p>
    <template #footer>
      <BaseButton v-if="modalType === 'confirm'" variant="secondary" @click="resolveModal(false)">
        {{ MOVE_IN_DIALOG.buttonCancel }}
      </BaseButton>
      <BaseButton variant="secondary" @click="resolveModal(true)">
        {{ MOVE_IN_DIALOG.buttonOk }}
      </BaseButton>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import BaseButton from 'src/components/base/button/BaseButton.vue';
import BaseCheckbox from 'src/components/base/checkbox/BaseCheckbox.vue';
import BaseDropdownList from 'src/components/base/dropdown-list/BaseDropdownList.vue';
import BaseInput from 'src/components/base/input/BaseInput.vue';
import BaseModal from 'src/components/base/modal/BaseModal.vue';
import { computed } from 'vue';
import { useRoute } from 'vue-router';

import carIcon from '../assets/car.png';
import { useMoveIn } from '../composables/use-move-in';
import { useConfirmModal } from '../composables/useConfirmModal';
import { MOVE_IN_DIALOG, MOVE_IN_UI } from '../constants';

const route = useRoute();
const { modalOpen, modalTitle, modalMessage, modalType, resolveModal, handleModalCancel } =
  useConfirmModal();

const {
  lotId,
  batchId,
  batchBtnEnabled,
  eqpId,
  recipeText,
  selectedRecipe,
  recipeItems,
  recipeChanged,
  standardMachine,
  standardMachineChanged,
  autoMotiveFlag,
  exMachine,
  productDisplay,
  currentOperation,
  engineer,
  customer,
  quantity,
  goodChips,
  comment,
  commentSize,
  probeCard,
  probeOD,
  probeZ,
  probeCardEnabled,
  createCategory,
  countName,
  area,
  machineSearchId,
  waferMachines,
  waferDialogOpen,
  waferOptions,
  selectedWafers,
  skipCurrentOperation,
  isSkipAllowed,
  whLabel,
  readBtnEnabled,
  okEnabled,
  loading,
  closeProcessInquire,
  completeProcessInquire,
  completeBatchLotList,
  completeBatchMoveIn,
  openBatchMoveInCommentList,
  cancelInlineActivity,
  completeInlineActivity,
  onEqpIdCommit,
  onProbeCardCommit,
  showStandardMachineInfo,
  toggleWaferSelection,
  cancelWaferSelection,
  confirmWaferSelection,
  lookupWaferMachine,
  onBatIdClick,
  onWHClick,
  onReadClick,
  onOK,
  onCancel,
} = useMoveIn();

const waferDialogTitle = computed(() =>
  createCategory.value === 'COUNT'
    ? MOVE_IN_UI.buttons.count
    : createCategory.value === 'SLOT'
      ? MOVE_IN_UI.buttons.slot
      : MOVE_IN_UI.alerts.selectWafer,
);

function onEqpInput(value: string | number | undefined): void {
  eqpId.value = String(value ?? '').toUpperCase();
}

function onProbeCardInput(value: string | number | undefined): void {
  probeCard.value = String(value ?? '').toUpperCase();
}
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700&display=swap');
@import '../../../css/move-in.tokens.css';

/* Center the 360 x 1236 Move-In screen in the 600 x 1482 design canvas while
   letting it fill a matching mobile viewport. */

* {
  box-sizing: border-box;
}

body:has(.move-in-page) {
  background: #d1d5dc;
}

#app:has(.move-in-page) {
  display: flow-root;
  min-height: 100vh;
}

.move-in-page {
  background: var(--move-in-page-bg);
  display: flex;
  flex-direction: column;
  font-family: 'Noto Sans KR', sans-serif;
  margin: max(0px, calc((100vh - 1236px) / 2)) auto;
  min-height: min(100vh, 1236px);
  min-width: 0;
  width: min(100%, 360px);
}

/* --- Header ------------------------------------------------------------- */
.move-in-page .move-in-header {
  align-items: center;
  display: flex;
  gap: var(--move-in-header-gap);
  height: var(--move-in-header-height);
  padding: var(--move-in-header-padding);
}

.move-in-page .move-in-back {
  align-items: center;
  background: transparent;
  border: none;
  border-radius: var(--move-in-back-radius);
  color: var(--move-in-header-color);
  cursor: pointer;
  display: flex;
  flex-shrink: 0;
  height: var(--move-in-back-size);
  justify-content: center;
  padding: 0;
  width: var(--move-in-back-size);
}

.move-in-page .move-in-back svg {
  height: var(--move-in-back-icon-size);
  width: var(--move-in-back-icon-size);
}

.move-in-page .move-in-title {
  color: var(--move-in-header-color);
  font-size: var(--move-in-title-size);
  font-weight: 700;
  margin: 0;
}

/* --- Container / cards -------------------------------------------------- */
.move-in-page .move-in-container {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--move-in-card-gap);
  padding: var(--move-in-container-padding);
}

.move-in-page .move-in-card,
.move-in-page .move-in-card-bottom {
  background: var(--move-in-card-bg);
  border: var(--move-in-card-border);
  border-radius: var(--move-in-card-radius);
  box-shadow: var(--move-in-card-shadow);
  margin: var(--move-in-card-margin);
}

.move-in-page .move-in-card {
  flex: none;
  height: var(--move-in-card-height);
  padding: var(--move-in-card-padding);
}

.move-in-page .move-in-card-bottom {
  flex: 0 0 var(--move-in-card-bottom-height);
  height: var(--move-in-card-bottom-height);
  padding: var(--move-in-card-bottom-padding);
}

.move-in-page .move-in-fields {
  display: flex;
  flex-direction: column;
  gap: var(--move-in-fields-gap);
}

/* --- Rows --------------------------------------------------------------- */
.move-in-page .move-in-row {
  align-items: flex-end;
  display: flex;
  gap: var(--move-in-row-gap);
}

.move-in-page .move-in-row-lot .move-in-field-lot {
  flex: 0 0 29%;
}

.move-in-page .move-in-row-lot .move-in-field-batch {
  flex: 0 0 37%;
}

.move-in-page .move-in-automotive-icon {
  align-self: flex-end;
  flex: 0 0 24px;
  height: 24px;
  margin-bottom: var(--move-in-field-group-gap);
  object-fit: contain;
  width: 24px;
}

.move-in-page .move-in-row-lot .move-in-btn-outline {
  flex: 0 0 20%;
}

.move-in-page .move-in-row-proc-e .move-in-field:first-child {
  flex: 0 0 var(--move-in-proc-e-main-width);
}

.move-in-page .move-in-row-proc-e .move-in-field:last-child {
  flex: 0 0 var(--move-in-proc-e-sub-width);
}

.move-in-page .move-in-row-qty .move-in-field {
  flex: 1;
}

.move-in-page .move-in-row-procard .move-in-field-procard-main {
  grid-column: 1 / -1;
}

.move-in-page .move-in-row-procard .move-in-field-procard-sub {
  min-width: 0;
}

.move-in-page .move-in-row-procard {
  align-items: flex-end;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  row-gap: var(--move-in-row-gap);
}

/* --- BaseInput overrides (field-input) ---------------------------------- */
.move-in-page .ds-field {
  gap: var(--move-in-field-group-gap);
  min-width: 0;
}

.move-in-page .ds-field__label {
  color: var(--move-in-label-color);
  font-family: 'Noto Sans KR', sans-serif;
  font-size: var(--move-in-label-size);
  font-weight: 500;
  line-height: 20px;
}

.move-in-page .ds-input--medium .ds-input__control,
.move-in-page .ds-input--small .ds-input__control {
  background: var(--move-in-input-bg);
  border: var(--move-in-input-border);
  border-radius: var(--move-in-input-radius);
  font-size: var(--move-in-input-font-size);
  min-height: var(--move-in-input-height);
  padding: 0 var(--move-in-input-padding-x);
}

.move-in-page .ds-input__native {
  color: var(--move-in-input-color);
  font-size: var(--move-in-input-font-size);
}

.move-in-page .ds-input__native::placeholder {
  color: var(--move-in-input-placeholder);
}

.move-in-page .move-in-value--changed .ds-input__control {
  color: #f00;
}

.move-in-page
  .ds-input:not(.ds-input--disabled):not(.ds-input--loading):focus-within
  .ds-input__control {
  border-color: var(--move-in-input-focus-border);
}

.move-in-page .ds-input--disabled .ds-input__control {
  background: var(--move-in-input-bg);
  border-color: var(--ds-color-neutral-300);
  color: var(--ds-color-text-disabled);
}

/* --- BaseDropdownList overrides (field-select) -------------------------- */
.move-in-page .ds-dropdown-list__control .ant-select-selector {
  align-items: center;
  background: var(--move-in-input-bg) !important;
  border: var(--move-in-input-border) !important;
  border-radius: var(--move-in-input-radius) !important;
  font-size: var(--move-in-input-font-size) !important;
  height: var(--move-in-input-height) !important;
  min-height: var(--move-in-input-height) !important;
  padding: 0 28px 0 var(--move-in-input-padding-x) !important;
}

.move-in-page .ds-dropdown-list__control .ant-select-selection-item {
  color: var(--move-in-input-color);
  font-size: var(--move-in-input-font-size);
  line-height: var(--move-in-input-height);
  padding: 0;
}

.move-in-page .ds-dropdown-list__control .ant-select-selection-placeholder {
  color: var(--move-in-input-placeholder);
  font-size: var(--move-in-input-font-size);
  line-height: var(--move-in-input-height);
  padding: 0;
}

.move-in-page .ds-dropdown-list__control.ant-select-focused .ant-select-selector {
  border-color: var(--move-in-input-focus-border) !important;
}

.move-in-page .ds-dropdown-list__control .ant-select-arrow {
  color: var(--move-in-select-arrow-color);
  right: var(--move-in-select-arrow-right);
}

/* --- Outline buttons (BAT ID / READ) ------------------------------------ */
.move-in-page .move-in-btn-outline.ds-btn {
  --ds-btn-bg: transparent;
  --ds-btn-border-color: var(--move-in-outline-border-color);
  --ds-btn-fg: var(--move-in-outline-text-color);

  border-radius: var(--move-in-outline-radius);
  font-size: var(--move-in-outline-font-size);
  font-weight: 600;
  height: var(--move-in-outline-height);
  min-height: var(--move-in-outline-height);
  padding: 0 var(--move-in-outline-padding-x);
}

.move-in-page .move-in-btn-outline.ds-btn:not(.ds-btn--disabled):active {
  --ds-btn-bg: var(--move-in-outline-active-bg);
}

/* --- Bottom card / checkbox --------------------------------------------- */
.move-in-page .move-in-card-bottom {
  display: flex;
  flex-direction: column;
  gap: var(--move-in-bottom-gap);
}

.move-in-page .ds-checkbox__row {
  gap: 8px;
  line-height: 20px;
}

.move-in-page .ds-checkbox__control .ant-checkbox-inner {
  border: var(--move-in-checkbox-border);
  border-radius: var(--move-in-checkbox-radius);
  height: var(--move-in-checkbox-size);
  width: var(--move-in-checkbox-size);
}

.move-in-page .ds-checkbox__control.ant-checkbox-checked .ant-checkbox-inner {
  background-color: var(--ds-color-neutral-0);
  border-color: var(--ds-movein-accent);
}

.move-in-page .ds-checkbox__control.ant-checkbox-checked .ant-checkbox-inner::after {
  border-color: var(--ds-movein-accent);
  height: 6px;
  left: 22%;
  top: 46%;
  width: 3px;
}

.move-in-page .ds-checkbox__label {
  color: var(--move-in-label-color);
  font-size: var(--move-in-checkbox-label-size);
  font-weight: 500;
}

/* --- Comment row -------------------------------------------------------- */
.move-in-page .move-in-comment-row {
  align-items: center;
  display: flex;
  gap: var(--move-in-comment-row-gap);
}

.move-in-page .move-in-comment-label {
  color: var(--move-in-label-color);
  flex: 0 0 var(--move-in-comment-label-width);
  font-size: var(--move-in-label-size);
  font-weight: 500;
}

.move-in-page .move-in-comment-count {
  flex: 1 1 auto;
  min-width: 0;
}

.move-in-page .move-in-comment-row .move-in-btn-outline {
  flex: 0 0 50px;
}

.move-in-page .move-in-comment-unit {
  color: var(--move-in-label-color);
  flex: 0 0 auto;
  font-size: var(--move-in-label-size);
}

/* --- Footer buttons ----------------------------------------------------- */
.move-in-page .move-in-footer {
  display: flex;
  flex: 0 0 auto;
  gap: var(--move-in-footer-gap);
  padding: var(--move-in-footer-padding);
}

.move-in-page .move-in-footer-btn {
  flex: 1;
}

.move-in-page .move-in-footer-btn.ds-btn--primary {
  --ds-btn-bg: var(--move-in-primary-bg);
  --ds-btn-border-color: var(--move-in-primary-bg);
  --ds-btn-fg: var(--move-in-primary-text);

  border-radius: var(--move-in-primary-radius);
  font-size: var(--move-in-primary-font-size);
  font-weight: 600;
  height: var(--move-in-primary-height);
  min-height: var(--move-in-primary-height);
}

.move-in-page .move-in-footer-btn.ds-btn--primary:not(.ds-btn--disabled):active {
  --ds-btn-bg: var(--move-in-primary-bg-active);
  --ds-btn-border-color: var(--move-in-primary-bg-active);
}

.move-in-page .move-in-footer-btn.ds-btn--tertiary {
  --ds-btn-bg: var(--move-in-cancel-bg);
  --ds-btn-border-color: var(--ds-color-neutral-300);
  --ds-btn-fg: var(--move-in-cancel-text);

  border: var(--move-in-cancel-border);
  border-radius: var(--move-in-cancel-radius);
  font-size: var(--move-in-cancel-font-size);
  font-weight: 600;
  height: var(--move-in-cancel-height);
  min-height: var(--move-in-cancel-height);
}

.move-in-page .move-in-footer-btn.ds-btn--tertiary:not(.ds-btn--disabled):active {
  --ds-btn-bg: var(--move-in-cancel-bg-active);
}

.move-in-wafer-list {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  max-height: 50vh;
  overflow-y: auto;
}

.move-in-wafer-option {
  align-items: center;
  display: flex;
  gap: 8px;
  min-height: 40px;
}

.move-in-wafer-option input {
  accent-color: var(--move-in-primary-bg);
  height: 18px;
  width: 18px;
}

.move-in-machine-lookup {
  align-items: flex-end;
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.move-in-wafer-modal .ds-btn--primary {
  --ds-btn-bg: var(--move-in-primary-bg);
  --ds-btn-border-color: var(--move-in-primary-bg);
  --ds-btn-fg: var(--move-in-primary-text);
}

.move-in-wafer-modal .ds-btn--primary:not(.ds-btn--disabled):active {
  --ds-btn-bg: var(--move-in-primary-bg-active);
  --ds-btn-border-color: var(--move-in-primary-bg-active);
}

.move-in-wafer-modal .move-in-btn-outline.ds-btn {
  --ds-btn-bg: var(--move-in-card-bg);
  --ds-btn-border-color: var(--move-in-outline-border-color);
  --ds-btn-fg: var(--move-in-outline-text-color);
}

.move-in-wafer-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}

@media (max-width: 420px) {
  .move-in-wafer-list {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
