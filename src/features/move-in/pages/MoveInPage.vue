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
            <BaseDropdownList
              v-model="selectedRecipe"
              :label="MOVE_IN_UI.labels.processingR"
              layout="horizontal"
              size="small"
              :options="recipeItems"
              :disabled="loading"
            />

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
              class="move-in-field-customer"
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
        <div class="move-in-card-bottom ds-screen__card">
          <BaseCheckbox
            v-model="skipCurrentOperation"
            class="move-in-skip-option"
            :label="MOVE_IN_UI.labels.skip"
            :disabled="loading || !isSkipAllowed"
          />

          <div class="move-in-comment-row">
            <span class="move-in-comment-label">{{ MOVE_IN_UI.labels.commentLabel }}</span>
            <BaseInput
              :model-value="commentSize"
              class="move-in-comment-count"
              size="small"
              readonly
            />
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
/* Screen-owned layout only: Base components are styled through their props. */
.move-in-page {
  display: flex;
  flex-direction: column;
  align-self: stretch;
  gap: var(--spacing-space-1);
}

.move-in-container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-space-1);
}

.move-in-fields .move-in-field-customer {
  --ds-field-label-font-size: var(--font-size-11px);
}

.move-in-fields {
  display: flex;
  flex-direction: column;
  align-self: stretch;
  gap: var(--spacing-space-1);
}

.move-in-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-space-1);
}

.move-in-row > * {
  flex: 1 1 0;
}

.move-in-row-lot > .move-in-field-lot {
  flex-grow: 2;
}

.move-in-row-lot > .move-in-btn-outline {
  flex: none;
}

.move-in-row-procard {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.move-in-row-procard > .move-in-field-procard-main {
  grid-column: 1 / -1;
}

.move-in-card-bottom {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-space-1);
}

.move-in-comment-row {
  display: flex;
  align-self: stretch;
  align-items: center;
  gap: var(--spacing-space-1);
}

.move-in-comment-label {
  color: var(--text-text-primary);
  font-size: var(--font-size-12px);
  font-weight: var(--font-weight-medium);
  white-space: nowrap;
}

/* Same unit size as Move Out and Remote CVD: matches the 18px count value beside it. */
.move-in-comment-unit {
  color: var(--text-text-primary);
  font-size: var(--font-size-18px);
  line-height: var(--line-height-28px);
  white-space: nowrap;
}

.move-in-comment-count {
  flex: 1 1 0;
}

.move-in-footer {
  display: flex;
  flex: 1 1 0;
  gap: var(--spacing-space-1);
}

.move-in-footer-btn {
  flex: 1 1 0;
}

.move-in-machine-lookup {
  display: flex;
  align-items: flex-end;
  gap: var(--spacing-space-1);
  margin-bottom: var(--spacing-space-2);
}

.move-in-wafer-list {
  display: grid;
  gap: var(--spacing-space-2);
  grid-template-columns: repeat(3, minmax(0, 1fr));
  overflow-y: auto;
}

.move-in-wafer-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-space-2);
  margin-top: var(--spacing-space-5);
}
</style>
