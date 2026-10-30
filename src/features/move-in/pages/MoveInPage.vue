<template>
  <BaseScreen
    v-if="route?.name === 'move-in'"
    class="move-in-base-screen"
    :title="MOVE_IN_UI.section.title"
  >
    <div class="move-in-page">
      <div class="move-in-container">
        <!-- MAIN CARD -->
        <div class="move-in-card ds-screen__card">
          <div class="move-in-fields">
            <!-- LOT No. row -->
            <div class="move-in-row move-in-row-lot">
              <BaseInput
                v-model:model-value="lotId"
                class="move-in-field move-in-field-lot"
                :label="MOVE_IN_UI.labels.lotId"
                :placeholder="MOVE_IN_UI.placeholders.lotId"
                layout="horizontal"
                readonly
              />
              <BaseInput
                v-model:model-value="batchId"
                class="move-in-field move-in-field-batch"
                :placeholder="MOVE_IN_UI.placeholders.batch"
                readonly
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
              layout="horizontal"
              readonly
            />

            <!-- Processing R -->
            <div class="move-in-select-field">
              <span class="ds-field__label">{{ MOVE_IN_UI.labels.processingR }}</span>
              <BaseDropdownList
                v-model="selectedRecipe"
                class="move-in-processing-r"
                :aria-label="MOVE_IN_UI.labels.processingR"
                :options="recipeItems"
                :disabled="loading"
              />
            </div>

            <!-- Reference Eq -->
            <BaseInput
              v-model:model-value="standardMachine"
              :class="{ 'move-in-value--changed': standardMachineChanged }"
              :label="MOVE_IN_UI.labels.standardMachine"
              :placeholder="MOVE_IN_UI.placeholders.standardMachine"
              layout="horizontal"
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
                layout="horizontal"
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
              layout="horizontal"
              :disabled="loading"
            />

            <!-- Product Name -->
            <BaseInput
              :model-value="productDisplay"
              class="move-in-field-product"
              :label="MOVE_IN_UI.labels.product"
              :placeholder="MOVE_IN_UI.placeholders.product"
              layout="horizontal"
              readonly
            />

            <!-- Current Process -->
            <BaseInput
              v-model:model-value="currentOperation"
              :label="MOVE_IN_UI.labels.currentOperation"
              :placeholder="MOVE_IN_UI.placeholders.currentOperation"
              layout="horizontal"
              readonly
            />

            <!-- Responsible -->
            <BaseInput
              v-model:model-value="engineer"
              :label="MOVE_IN_UI.labels.engineer"
              :placeholder="MOVE_IN_UI.placeholders.engineer"
              layout="horizontal"
              readonly
            />

            <!-- Customer -->
            <BaseInput
              v-model:model-value="customer"
              :label="MOVE_IN_UI.labels.customer"
              :placeholder="MOVE_IN_UI.placeholders.customer"
              layout="horizontal"
              readonly
            />

            <!-- Quantity / Good Chips -->
            <div class="move-in-row move-in-row-qty">
              <BaseInput
                v-model:model-value="quantity"
                class="move-in-field"
                :label="MOVE_IN_UI.labels.quantity"
                :placeholder="MOVE_IN_UI.placeholders.quantity"
                layout="horizontal"
                readonly
              />
              <BaseInput
                v-model:model-value="goodChips"
                class="move-in-field"
                :label="MOVE_IN_UI.labels.goodChips"
                :placeholder="MOVE_IN_UI.placeholders.goodChips"
                layout="horizontal"
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
                layout="horizontal"
                :disabled="loading || !probeCardEnabled"
                @input="onProbeCardInput"
                @keydown.enter.prevent="onProbeCardCommit"
              />
              <BaseInput
                v-model:model-value="probeOD"
                class="move-in-field-procard-sub"
                size="small"
                :placeholder="MOVE_IN_UI.placeholders.procard"
                :disabled="loading || !probeCardEnabled"
                type="number"
              />
              <BaseInput
                v-model:model-value="probeZ"
                class="move-in-field-procard-sub"
                size="small"
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
            v-model="skipCurrentOperation"
            class="move-in-skip-option"
            :label="MOVE_IN_UI.labels.skip"
            :disabled="loading || !isSkipAllowed"
          />

          <div class="move-in-comment-row">
            <span class="move-in-comment-label">{{ MOVE_IN_UI.labels.commentLabel }}</span>
            <BaseInput :model-value="commentSize" class="move-in-comment-count" readonly />
            <span class="move-in-comment-unit">{{ MOVE_IN_UI.labels.commentUnit }}</span>
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
    </div>
    <template #footer>
      <div class="move-in-footer">
        <BaseButton
          variant="primary"
          size="medium"
          class="move-in-footer-btn"
          :loading="loading"
          :disabled="!okEnabled"
          @click="onOK"
        >
          {{ MOVE_IN_UI.buttons.ok }}
        </BaseButton>
        <BaseButton
          variant="primary"
          size="medium"
          class="move-in-footer-btn"
          :disabled="loading"
          @click="onWHClick"
        >
          {{ whLabel }}
        </BaseButton>
        <BaseButton
          variant="tertiary"
          size="medium"
          class="move-in-footer-btn"
          :disabled="loading"
          @click="onCancel"
        >
          {{ MOVE_IN_UI.buttons.cancel }}
        </BaseButton>
      </div>
    </template>

    <BaseModal
      v-model:open="waferDialogOpen"
      :title="waferDialogTitle"
      :width="420"
      class="move-in-wafer-modal"
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
        <BaseCheckbox
          v-for="wafer in waferOptions"
          :key="wafer"
          class="move-in-wafer-option"
          :model-value="selectedWafers.includes(wafer)"
          :label="waferMachines[wafer] ? `${wafer} (${waferMachines[wafer]})` : wafer"
          @update:model-value="toggleWaferSelection(wafer)"
        />
      </div>
      <div class="move-in-wafer-actions">
        <BaseButton variant="tertiary" @click="cancelWaferSelection">
          {{ MOVE_IN_UI.buttons.cancel }}
        </BaseButton>
        <BaseButton variant="primary" @click="confirmWaferSelection">
          {{ MOVE_IN_UI.buttons.ok }}
        </BaseButton>
      </div>
    </BaseModal>
  </BaseScreen>
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
import {
  BaseButton,
  BaseCheckbox,
  BaseDropdownList,
  BaseInput,
  BaseModal,
  BaseScreen,
} from 'src/components/base';
import { computed } from 'vue';
import { useRoute } from 'vue-router';

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
  exMachine,
  productDisplay,
  currentOperation,
  engineer,
  customer,
  quantity,
  goodChips,
  comment,
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
  commentSize,
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
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700&display=swap');
@import '../styles/move-in.tokens.css';

@media not all {
  /* Center the 360 x 1112 Move-In screen in the 600 x 1482 design canvas while
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
    font-family: var(--family-font-family-default, var(--ds-font-family-sans));
    margin: max(0px, calc((100vh - 1112px) / 2)) auto;
    min-height: min(100vh, 1112px);
    min-width: 0;
    width: 100%;
  }

  /* --- Header ------------------------------------------------------------- */
  .move-in-page .move-in-header {
    align-items: center;
    display: flex;
    height: var(--move-in-header-height);
    justify-content: center;
    padding-inline: var(--move-in-container-padding);
  }

  .move-in-page .move-in-title {
    color: var(--move-in-header-color);
    flex: 1;
    font-size: var(--move-in-title-size);
    font-weight: 700;
    line-height: 28px;
    margin: 0;
    text-align: center;
  }

  .move-in-page .ds-field__label {
    font-family: var(--family-font-family-default, var(--ds-font-family-sans));
    font-size: 14px;
    font-weight: 500;
    line-height: 20px;
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
    min-height: var(--move-in-card-height);
    padding: var(--move-in-card-padding);
  }

  .move-in-page .move-in-card-bottom {
    flex: 0 0 auto;
    min-height: var(--move-in-card-bottom-height);
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

  /* --- Processing recipe select ------------------------------------------ */
  .move-in-page .move-in-select-field {
    display: flex;
    flex-direction: column;
    gap: var(--ds-spacing-2);
    min-width: 0;
  }

  .move-in-page .move-in-processing-r {
    min-width: 0;
  }

  .move-in-page .move-in-processing-r .q-field__native,
  .move-in-page .move-in-processing-r .q-field__input {
    font-size: var(--ds-font-size-lg);
    font-weight: var(--ds-font-weight-regular);
    line-height: var(--ds-line-height-lg);
  }

  /* --- BaseInput overrides (field-input) ---------------------------------- */
  .move-in-page .ds-field {
    gap: var(--move-in-field-group-gap);
    min-width: 0;
  }

  .move-in-page .ds-field__label {
    color: var(--move-in-label-color);
    font-family: var(--family-font-family-default, var(--ds-font-family-sans));
    font-size: var(--move-in-label-size);
    font-weight: 500;
    line-height: 20px;
  }

  .move-in-page .ds-input--medium .ds-input__control,
  .move-in-page .ds-input--small .ds-input__control {
    background: var(--move-in-input-bg);
    border: 0;
    border-radius: var(--move-in-input-radius);
    box-shadow: inset 0 0 0 1px var(--ds-color-neutral-300);
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
    box-shadow: inset 0 0 0 2px var(--move-in-input-focus-border);
  }

  .move-in-page .ds-input--disabled .ds-input__control {
    background: var(--move-in-input-bg);
    border-color: var(--ds-color-neutral-300);
    color: var(--ds-color-text-disabled);
  }

  /* --- Outline buttons (BAT ID / READ) ------------------------------------ */
  .move-in-page .move-in-btn-outline.ds-btn {
    --ds-btn-bg: transparent;
    --ds-btn-border-color: var(--move-in-outline-border-color);
    --ds-btn-fg: var(--move-in-outline-text-color);

    border-radius: var(--move-in-outline-radius);
    font-size: var(--move-in-outline-font-size);
    font-weight: 700;
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

  .move-in-page .move-in-skip-option {
    align-items: center;
    color: var(--move-in-label-color);
    display: flex;
    flex-direction: row;
    height: 20px;
    line-height: 20px;
    width: fit-content;
  }

  .move-in-page .move-in-skip-option .ds-checkbox__control {
    gap: 8px;
  }

  .move-in-page .move-in-skip-option .ds-checkbox__label {
    color: var(--ds-color-neutral-900);
    font-size: var(--move-in-checkbox-label-size);
    font-weight: 500;
    line-height: 20px;
  }

  /* --- Comment row -------------------------------------------------------- */
  .move-in-page .move-in-comment-row {
    display: grid;
    gap: 10px;
    grid-template-columns: minmax(0, 1fr) auto max-content;
    grid-template-rows: var(--ds-field-label-line-height) var(--ds-control-height-md);
  }

  .move-in-page .move-in-comment-count {
    grid-row: 1 / -1;
    min-width: 0;
  }

  .move-in-page .move-in-comment-unit {
    grid-row: 2;
    align-self: center;
    color: var(--move-in-label-color);
    font-size: 16px;
  }

  .move-in-page .move-in-comment-row .move-in-btn-outline {
    grid-row: 2;
    align-self: center;
  }

  /* --- Footer buttons ----------------------------------------------------- */
  .move-in-page .move-in-footer {
    display: flex;
    flex: 0 0 auto;
    gap: var(--move-in-footer-gap);
    padding: var(--move-in-footer-padding);
  }

  .move-in-page .move-in-footer-btn {
    --ds-btn-line-height: var(--ds-line-height-xl);
    flex: 1;
  }

  .move-in-page .move-in-footer-btn.ds-btn--primary {
    --ds-btn-bg: var(--move-in-primary-bg);
    --ds-btn-border-color: var(--move-in-primary-bg);
    --ds-btn-fg: var(--move-in-primary-text);

    border-radius: var(--move-in-primary-radius);
    font-size: var(--move-in-primary-font-size);
    font-weight: 700;
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
    font-weight: 700;
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
    flex-direction: row;
    min-height: 40px;
    width: 100%;
  }

  .move-in-wafer-option .ds-checkbox__control {
    gap: 8px;
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

  .move-in-base-screen.ds-screen {
    width: 100%;
    min-height: 100dvh;
    height: 100dvh;
    font-family: 'Noto Sans KR', sans-serif;
  }

  .move-in-base-screen .ds-screen__content {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    min-height: 0;
    padding: 0;
    overflow: visible;
  }

  .move-in-base-screen .ds-screen__footer {
    display: none;
  }

  .move-in-page {
    position: relative;
    flex: 1 1 auto;
    width: 100%;
    height: auto;
    min-height: 0;
    margin: 0 auto;
    background: transparent;
  }

  .move-in-page .move-in-header {
    position: absolute;
    inset: 0 0 auto;
    z-index: 1;
    height: 36px;
    padding: 4px 16px;
    background: #1e4b3c;
  }

  .move-in-page .move-in-title {
    color: #f9fafb;
    font-size: 16px;
    line-height: 28px;
  }

  .move-in-page .move-in-container {
    position: absolute;
    top: 40px;
    left: 0;
    width: 100%;
    height: 592px;
    padding: 0;
    display: block;
  }

  .move-in-page .move-in-card {
    position: absolute;
    inset: 0 0 auto;
    width: 100%;
    height: 528px;
    min-height: 0;
    padding: 8px;
    border: 0;
    border-radius: 4px;
    background: #f3f4f6;
    box-shadow: inset 0 0 0 1px #d1d5dc;
  }

  .move-in-page .move-in-fields {
    gap: 8px;
  }

  .move-in-page .ds-field,
  .move-in-page .move-in-row,
  .move-in-page .move-in-select-field {
    min-width: 0;
    height: 32px;
  }

  .move-in-page .ds-field--horizontal {
    display: grid;
    grid-template-columns: 80px minmax(0, 1fr);
    column-gap: 8px;
    align-items: center;
    width: 100%;
  }

  .move-in-page .ds-field__header {
    min-width: 0;
    min-height: 32px;
    align-items: center;
  }

  .move-in-page .ds-field__label,
  .move-in-page .ds-field__label label {
    color: #030712;
    font-size: 12px;
    line-height: 14px;
    font-weight: 500;
  }

  .move-in-page .ds-input__qinput,
  .move-in-page .q-field,
  .move-in-page .q-field__inner,
  .move-in-page .q-field__control {
    min-width: 0;
    height: 32px;
    min-height: 32px;
  }

  .move-in-page .q-field__control {
    padding: 0 8px;
    border: 0;
    border-radius: 4px;
    background: #fff;
    box-shadow: inset 0 0 0 1px #d1d5dc;
  }

  .move-in-page .q-field__control::before,
  .move-in-page .q-field__control::after {
    display: none;
  }

  .move-in-page .ds-input__native,
  .move-in-page .q-field__native,
  .move-in-page .q-field__input {
    color: #030712;
    font-size: 18px;
    line-height: 28px;
  }

  .move-in-page .move-in-row {
    align-items: center;
    gap: 8px;
  }

  .move-in-page .move-in-row-lot .move-in-field-lot {
    flex: 1 1 0;
    width: auto;
  }

  .move-in-page .move-in-row-lot .move-in-field-batch {
    display: block;
    flex: 1 1 0;
    width: auto;
  }

  .move-in-page .move-in-row-lot .move-in-field-batch .ds-field__header {
    display: none;
  }

  .move-in-page .move-in-row-lot .move-in-field-batch .q-field {
    width: 100%;
  }

  .move-in-page .move-in-row-lot .move-in-btn-outline {
    flex: 0 0 auto;
    width: auto;
  }

  .move-in-page .move-in-select-field {
    display: grid;
    grid-template-columns: 80px minmax(0, 1fr);
    column-gap: 8px;
    align-items: center;
    width: 100%;
  }

  .move-in-page .move-in-select-field > .ds-field__label {
    width: 80px;
  }

  .move-in-page .move-in-processing-r,
  .move-in-page .move-in-processing-r .q-field,
  .move-in-page .move-in-processing-r .q-field__control {
    width: 100%;
    height: 32px;
    min-height: 32px;
  }

  .move-in-page .move-in-row-proc-e .move-in-field:first-child {
    flex: 1 1 0;
    width: auto;
  }

  .move-in-page .move-in-row-proc-e .move-in-field:last-child {
    flex: 1 1 0;
    width: auto;
  }

  .move-in-page .move-in-row-qty .move-in-field {
    flex: 1 1 0;
    width: auto;
  }

  .move-in-page .move-in-row-procard {
    height: 72px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    row-gap: 8px;
  }

  .move-in-page .move-in-row-procard .move-in-field-procard-main {
    grid-column: 1 / -1;
    width: 100%;
  }

  .move-in-page .move-in-row-procard .move-in-field-procard-sub {
    width: 100%;
  }

  .move-in-page .move-in-card-bottom {
    position: absolute;
    top: 536px;
    left: 0;
    width: 100%;
    height: 56px;
    min-height: 0;
    padding: 12px;
    border: 0;
    border-radius: 4px;
    background: #f3f4f6;
    box-shadow: none;
  }

  .move-in-page .move-in-skip-option {
    position: absolute;
    top: 22px;
    left: 12px;
    width: 91px;
    height: 20px;
  }

  .move-in-page .move-in-skip-option .ds-checkbox__control {
    width: 91px;
    height: 20px;
    min-height: 20px;
    align-items: center;
    gap: 8px;
  }

  .move-in-page .move-in-skip-option .q-checkbox__inner {
    width: 16px;
    min-width: 16px;
    height: 16px;
    font-size: 16px;
  }

  .move-in-page .move-in-skip-option .q-checkbox__bg {
    top: 0;
    left: 0;
    width: 16px;
    height: 16px;
  }

  .move-in-page .move-in-skip-option .q-checkbox__label,
  .move-in-page .move-in-skip-option .ds-checkbox__label {
    white-space: nowrap;
  }

  .move-in-page .move-in-comment-row {
    position: absolute;
    top: 16px;
    left: 112px;
    right: 12px;
    width: auto;
    height: 32px;
    display: flex;
    align-items: center;
    gap: var(--move-in-comment-row-gap);
  }

  .move-in-page .move-in-comment-label {
    flex: 0 0 var(--move-in-comment-label-width);
    width: var(--move-in-comment-label-width);
    color: #030712;
    font-size: 12px;
    line-height: 14px;
    font-weight: 500;
    white-space: nowrap;
  }

  .move-in-page .move-in-comment-count {
    flex: 1 1 auto;
    width: auto;
    height: 32px;
    min-width: 0;
  }

  .move-in-page .move-in-comment-count.ds-field--horizontal {
    display: block;
  }

  .move-in-page .move-in-comment-count .ds-input__qinput,
  .move-in-page .move-in-comment-count .q-field,
  .move-in-page .move-in-comment-count .q-field__inner,
  .move-in-page .move-in-comment-count .q-field__control {
    width: 100%;
    min-width: 0;
  }

  .move-in-page .move-in-comment-count .ds-input__qinput,
  .move-in-page .move-in-comment-count .q-field {
    flex: 1 1 auto;
    max-width: none;
  }

  .move-in-page .move-in-comment-count .ds-field__header {
    display: none;
  }

  .move-in-page .move-in-comment-row .move-in-btn-outline {
    flex: 0 0 40px;
    width: 40px;
    min-width: 40px;
    padding-inline: 4px;
  }

  .move-in-page .move-in-footer {
    position: absolute;
    inset: auto 0 0;
    z-index: 1;
    width: 100%;
    height: 44px;
    gap: 8px;
    padding: 4px 12px;
    background: #e9f6ef;
  }

  .move-in-page .move-in-footer-btn {
    height: 36px;
    min-height: 36px;
    padding: 6px 8px;
    font-size: 14px;
    line-height: 20px;
  }

  .move-in-page .move-in-footer-btn:nth-child(-n + 2) {
    width: auto;
    flex: 1 1 0;
  }

  .move-in-page .move-in-footer-btn:last-child {
    width: auto;
    flex: 1 1 0;
  }

  .move-in-page .move-in-btn-outline.ds-btn {
    height: 32px;
    min-height: 32px;
    padding: 6px 8px;
    border: 0;
    border-radius: 4px;
    box-shadow: inset 0 0 0 1px var(--move-in-outline-border-color);
    font-size: 13px;
    line-height: 20px;
  }

  .move-in-page .move-in-btn-outline .ds-btn__label {
    overflow: visible;
    text-overflow: clip;
    font-size: 12px;
  }

  .move-in-page .move-in-row-lot .move-in-field-lot {
    align-self: start;
  }

  .move-in-page .move-in-footer-btn.ds-btn {
    height: 36px;
    min-height: 36px;
  }

  .move-in-page .move-in-footer-btn .q-btn__content {
    align-items: center;
    justify-content: center;
    line-height: 20px;
  }

  .move-in-page .move-in-footer-btn .ds-btn__label {
    line-height: 20px;
  }
}

body:has(.move-in-page) {
  background: var(--border-border-primary);
}

.move-in-page {
  align-self: stretch;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-space-1);
  margin-top: calc(-1 * var(--spacing-space-1));
  min-width: 0;
}

.move-in-container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-space-1);
}

.move-in-card {
  height: calc(var(--height-32px) * 13 + var(--spacing-space-1) * 14);
}

.move-in-fields {
  align-self: stretch;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-space-1);
  min-width: 0;
  width: 100%;
}

.move-in-row {
  align-items: center;
  display: flex;
  gap: var(--spacing-space-1);
  min-width: 0;
}

.move-in-row-lot .move-in-field-lot {
  flex: 0 0
    calc(var(--ds-field-label-width) + var(--spacing-space-1) + var(--move-in-lot-primary-width));
}

.move-in-row-lot .move-in-field-batch {
  flex: 1 1 0;
  min-width: 0;
}

.move-in-row-lot .move-in-field-batch.ds-field--horizontal {
  display: block;
}

.move-in-row-lot .move-in-field-batch .q-field,
.move-in-row-lot .move-in-field-batch .q-field__inner,
.move-in-row-lot .move-in-field-batch .q-field__control {
  min-width: 0;
  width: 100%;
}

.move-in-row-lot {
  gap: 4px;
}

.move-in-row-lot .move-in-btn-outline {
  flex: 0 0 var(--move-in-lot-action-width);
  margin-left: var(--spacing-space-1);
}

.move-in-row-lot .move-in-btn-outline.ds-btn--disabled,
.move-in-comment-row .move-in-btn-outline.ds-btn--disabled {
  --ds-btn-bg: var(--ds-color-neutral-0);
  --ds-btn-border-color: var(--move-in-outline-border-color);
  --ds-btn-fg: var(--move-in-outline-text-color);
}

.move-in-select-field {
  align-items: center;
  display: grid;
  gap: var(--spacing-space-1);
  grid-template-columns: var(--move-in-label-width) minmax(0, 1fr);
}

.move-in-select-field > :first-child {
  grid-column: 1;
  grid-row: 1;
  width: var(--move-in-label-width);
}

.move-in-select-field > :last-child {
  grid-column: 2;
  grid-row: 1;
  width: auto;
}

.move-in-row-proc-e > *,
.move-in-row-qty > * {
  flex: 1 1 0;
  min-width: 0;
}

.move-in-row-procard {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.move-in-field-procard-main {
  grid-column: 1 / -1;
}

.move-in-card-bottom {
  align-items: center;
  background: var(--background-background-secondary);
  border-radius: var(--radius-4);
  display: grid;
  gap: var(--spacing-space-1);
  grid-template-columns: auto minmax(0, 1fr);
  min-height: calc(var(--height-32px) + var(--spacing-space-2) * 2);
  padding: var(--spacing-space-2);
}

.move-in-skip-option {
  min-width: 0;
}

.move-in-comment-row {
  align-items: center;
  display: flex;
  gap: var(--spacing-space-1);
  min-width: 0;
}

.move-in-comment-label,
.move-in-comment-unit {
  color: var(--text-text-primary);
  font-size: var(--font-size-12px);
  font-weight: var(--font-weight-medium);
  white-space: nowrap;
}

.move-in-comment-count {
  flex: 1 1 0;
  min-width: 0;
}

.move-in-comment-count.ds-field--horizontal {
  display: block;
}

.move-in-comment-count .q-field,
.move-in-comment-count .q-field__inner,
.move-in-comment-count .q-field__control {
  min-width: 0;
  width: 100%;
}

.move-in-footer {
  display: flex;
  gap: var(--spacing-space-1);
  width: 100%;
}

.move-in-footer-btn {
  flex: 1 1 0;
}
</style>
