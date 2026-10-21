<template>
  <main class="remote-furnace-kec" aria-labelledby="kec-screen-title">
    <QToolbar class="remote-furnace-kec__header">
      <h1 id="kec-screen-title">KEC Furnace 자동화</h1>
    </QToolbar>

    <section class="remote-furnace-kec__content" aria-label="Furnace 정보">
      <QCard tag="section" class="remote-furnace-kec__form" aria-label="제품 정보">
        <div class="remote-furnace-kec__pair">
          <BaseInput
            id="kec-lot"
            label="LOT"
            stack-label
            :model-value="screen.lotId.value"
            :loading="screen.loading.value"
            readonly
          />
          <BaseInput
            id="kec-batch"
            label="BATCH"
            stack-label
            :model-value="screen.batchId.value"
            readonly
          />
        </div>

        <BaseInput
          id="kec-recipe"
          label="RECIPE"
          stack-label
          :model-value="screen.recipe.value"
          :class="{ 'remote-furnace-kec__changed': screen.isRecipeChanged.value }"
          readonly
        />
        <div class="remote-furnace-kec__select-field">
          <span class="ds-field__label">진행 RCP</span>
          <BaseDropdownList
            id="kec-progress-recipe"
            aria-label="진행 RCP"
            placeholder=""
            :model-value="screen.selectedRecipe.value ?? undefined"
            :options="recipeOptions"
            :disabled="screen.restartMode.value"
            @update:model-value="screen.selectedRecipe.value = String($event ?? '') || null"
            @change="screen.checkRecipeInterlock()"
          >
            <template #indicator><QIcon name="sym_o_keyboard_arrow_down" size="16px" /></template>
          </BaseDropdownList>
        </div>
        <BaseInput
          id="kec-standard-machine"
          label="기준장비"
          stack-label
          :model-value="screen.standardEquipment.value"
          :class="{ 'remote-furnace-kec__changed': screen.isStandardEquipmentChanged.value }"
          readonly
        />
        <BaseInput
          id="kec-equipment"
          label="진행장비"
          stack-label
          :model-value="screen.equipmentId.value"
          :disabled="screen.restartMode.value"
          autocomplete="off"
          @update:model-value="screen.equipmentId.value = String($event ?? '')"
          @keyup.enter="screen.handleEquipmentEnter(screen.equipmentId.value)"
        />

        <div class="remote-furnace-kec__mwf-row">
          <div class="remote-furnace-kec__select-field">
            <span class="ds-field__label">MWF</span>
            <BaseDropdownList
              id="kec-mwf"
              aria-label="MWF"
              placeholder=""
              :model-value="screen.mwfPosition.value || undefined"
              :options="mwfOptions"
              @update:model-value="screen.mwfPosition.value = Number($event ?? 0)"
            >
              <template #indicator><QIcon name="sym_o_keyboard_arrow_down" size="16px" /></template>
            </BaseDropdownList>
          </div>
          <BaseButton
            variant="secondary"
            :disabled="!screen.availability.clearPort || screen.loading.value"
            @click="screen.executeClearPort()"
          >
            초기화
          </BaseButton>
        </div>
        <div v-if="screen.portOptions.value.length" class="remote-furnace-kec__port-row">
          <div class="remote-furnace-kec__select-field">
            <span class="ds-field__label">PORT</span>
            <BaseDropdownList
              id="kec-port"
              aria-label="PORT"
              placeholder=""
              :model-value="screen.selectedPort.value ?? undefined"
              :options="portOptions"
              :disabled="screen.restartMode.value"
              @update:model-value="screen.selectedPort.value = String($event ?? '') || null"
              @change="screen.refreshPortState()"
            />
          </div>
          <BaseInput
            v-if="screen.portState.value"
            class="remote-furnace-kec__port-state"
            :class="`remote-furnace-kec__port-state--${screen.portState.value.toLowerCase()}`"
            :model-value="screen.portState.value"
            aria-label="PORT STATUS"
            aria-live="polite"
            readonly
          />
        </div>
      </QCard>

      <QCard tag="section" class="remote-furnace-kec__batch" aria-label="조회 결과">
        <BaseRevoGrid
          v-if="screen.rows.value.length"
          class="remote-furnace-kec__table"
          :rows="screen.rows.value"
          :columns="batchColumns"
          row-key="LOTID"
          :selected-row-key="screen.selectedRowId.value"
          @row-select="handleRowSelect"
        />
        <BaseEmptyState v-else title="EMPTY" message="해당 결과가 없습니다" />
      </QCard>

      <div class="remote-furnace-kec__action-row remote-furnace-kec__entry-actions">
        <BaseButton
          variant="tertiary"
          size="small"
          :disabled="!screen.availability.enter || screen.loading.value"
          @click="screen.executeCommand('enter')"
        >
          ENTERING
        </BaseButton>
        <BaseButton
          variant="tertiary"
          size="small"
          :disabled="!screen.availability.enterStart || screen.loading.value"
          @click="screen.executeCommand('enterStart')"
        >
          ENTER + START
        </BaseButton>
      </div>
    </section>
    <footer class="remote-furnace-kec__actions">
      <div class="remote-furnace-kec__action-row remote-furnace-kec__action-row--three">
        <BaseButton
          variant="primary"
          size="large"
          :disabled="!screen.availability.start || screen.loading.value"
          @click="screen.executeCommand('start')"
        >
          {{ screen.isNonLot.value ? 'NO BATCH' : 'START' }}
        </BaseButton>
        <BaseButton
          variant="secondary"
          size="large"
          :disabled="!screen.availability.restart || screen.loading.value"
          @click="screen.executeCommand('restart')"
        >
          {{ screen.isNonLot.value ? '온도설정' : 'RESTART' }}
        </BaseButton>
        <BaseButton variant="tertiary" size="large" @click="goBack">취소</BaseButton>
      </div>
    </footer>

    <BaseModal
      :open="dialog.modalOpen.value"
      :title="dialog.modalTitle.value"
      :closable="false"
      :overlay-closable="false"
      @update:open="handleDialogOpenChange"
    >
      <p class="remote-furnace-kec__dialog-message" role="alert">
        {{ dialog.modalMessage.value }}
      </p>
      <template #footer>
        <div class="remote-furnace-kec__dialog-actions">
          <BaseButton
            v-if="dialog.modalType.value === 'confirm'"
            variant="secondary"
            @click="dialog.resolveModal(false)"
          >
            {{ confirmNegativeLabel }}
          </BaseButton>
          <BaseButton variant="primary" @click="dialog.resolveModal(true)">
            {{ dialog.modalType.value === 'confirm' ? confirmPositiveLabel : '확인' }}
          </BaseButton>
        </div>
      </template>
    </BaseModal>

    <RemoteRecipeDialog
      :model-value="isRecipeDialogOpen"
      :recipe-list="recipeDialogRecipe"
      :lot-no="recipeDialogLot"
      @update:model-value="isRecipeDialogOpen = $event"
      @confirm="resolveRecipeConfirmation(true)"
      @cancel="resolveRecipeConfirmation(false)"
    />
  </main>
</template>

<script setup lang="ts">
import { QCard, QIcon, QToolbar } from 'quasar';
import {
  BaseButton,
  BaseDropdownList,
  BaseEmptyState,
  BaseInput,
  BaseModal,
  BaseRevoGrid,
} from 'src/components/base';
import type { BaseRevoGridColumn, BaseRevoGridKey } from 'src/components/base/revo-grid';
import RemoteRecipeDialog from 'src/components/esheet/RemoteRecipeDialog.vue';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useMainStore } from '../../main/stores/main.store';
import { useConfirmModal } from '../../move-in/composables/useConfirmModal';
import { useRemoteFurnaceKec } from '../composables/use-remote-furnace-kec';
import type { RemoteFurnaceKecDialog } from '../types/remote-furnace-kec.types';

defineOptions({ name: 'RemoteFurnaceKecPage' });

const route = useRoute();
const router = useRouter();
const mainStore = useMainStore();
const dialog = useConfirmModal();
const routeLotId = route.query.LOTID ?? route.query.lotId;
const initialLotId = computed(() =>
  Array.isArray(routeLotId) ? (routeLotId[0] ?? '') : (routeLotId ?? ''),
);
const isRecipeDialogOpen = ref(false);
const recipeDialogRecipe = ref('');
const recipeDialogLot = ref('');
const confirmPositiveLabel = ref('예');
const confirmNegativeLabel = ref('아니오');
let recipeConfirmationResolver: ((confirmed: boolean) => void) | undefined;

const confirmRecipe = (recipeName: string, currentLotId: string): Promise<boolean> => {
  recipeDialogRecipe.value = recipeName;
  recipeDialogLot.value = currentLotId;
  isRecipeDialogOpen.value = true;
  return new Promise<boolean>((resolve) => {
    recipeConfirmationResolver = resolve;
  });
};

function resolveRecipeConfirmation(confirmed: boolean): void {
  isRecipeDialogOpen.value = false;
  recipeConfirmationResolver?.(confirmed);
  recipeConfirmationResolver = undefined;
}

const dialogAdapter: RemoteFurnaceKecDialog = {
  async alert(title, message) {
    await dialog.alert(message, title);
  },
  confirm(title, message, positiveLabel = '예', negativeLabel = '아니오') {
    confirmPositiveLabel.value = positiveLabel;
    confirmNegativeLabel.value = negativeLabel;
    return dialog.confirm(message, title);
  },
};

const screen = useRemoteFurnaceKec({
  lotId: initialLotId.value,
  facility: mainStore.facility,
  operatorId: mainStore.operatorId,
  operatorName: mainStore.operatorName,
  dialog: dialogAdapter,
  confirmRecipe,
  onSuccess() {
    if (initialLotId.value) {
      void router.replace({ path: '/esheet', query: { lotId: screen.lotId.value } });
    } else {
      goBack();
    }
  },
  onComment(row) {
    void router.push({
      path: '/comment-list',
      query: {
        lotId: row.LOTID,
        operation: row.OPERATION,
        subOperation: row.SUBOPERATION,
        processStep: row.PROCESSSTEP,
        operSequence: row.OPERSEQUENCE,
        facility: mainStore.facility,
      },
    });
  },
});

const recipeOptions = computed(() =>
  screen.recipeOptions.value.map((value) => ({ label: value, value })),
);
const portOptions = computed(() =>
  screen.portOptions.value.map((value) => ({ label: value, value })),
);
const mwfOptions = screen.mwfOptions.map((label, index) => ({ label, value: index + 1 }));
const batchColumns: BaseRevoGridColumn[] = (
  [
    ['LOTID', 'LOTNO'],
    ['COMMENTQTY', 'C'],
    ['STATUS', '상태'],
    ['PROCESSSTEP', '공정명'],
    ['PRODUCT', '제품명'],
    ['QUANTITY', '수량'],
    ['ERRORMESSAGE', '에러메시지'],
    ['OPERATION', 'OPERATION'],
    ['SUBOPERATION', 'SUBOPERATION'],
    ['LOTSTATE', 'STATE'],
    ['NWCOMMENTQTY', 'WCOMMENTCNT'],
    ['OPERSEQUENCE', 'OPERSEQUENCE'],
  ] as const
).map(([prop, name]) => ({
  prop,
  name,
  size: prop === 'COMMENTQTY' ? 40 : 140,
  cellProperties: ({ model }) => ({
    class: `remote-furnace-kec__cell--${String(model.STATUS).toLowerCase()}`,
  }),
}));

function handleRowSelect(rowKey: BaseRevoGridKey): void {
  const row = screen.rows.value.find((item) => item.LOTID === rowKey);
  if (row) screen.selectRow(row);
}

function handleDialogOpenChange(open: boolean): void {
  if (!open) dialog.resolveModal(false);
}

function goBack(): void {
  void router.back();
}

onMounted(() => {
  void screen.initialize();
});
</script>

<style scoped>
.remote-furnace-kec {
  --kec-border: #ccd4df;
  --kec-ink: #101725;
  --kec-surface: #f3f4f6;
  --kec-accent: #00b5b0;
  width: 100%;
  min-height: 1044px;
  color: var(--kec-ink);
  background: linear-gradient(160deg, #194638 0%, #577a6e 31%, #a5beb5 65%, #edf7f2 100%);
  font-family: var(--family-font-family-default, var(--ds-font-family-sans));
  font-synthesis: none;
  font-weight: var(--ds-font-weight-regular);
  letter-spacing: 0;
}

.remote-furnace-kec__header {
  display: flex;
  min-height: 72px;
  align-items: center;
  justify-content: center;
  padding: 0 var(--ds-spacing-3);
  color: var(--kec-surface);
}

.remote-furnace-kec__header h1 {
  margin: 0;
  font-family: var(--family-font-family-default, var(--ds-font-family-sans));
  font-size: var(--ds-font-size-xl);
  font-weight: var(--ds-font-weight-bold);
  line-height: var(--ds-line-height-xl);
  letter-spacing: 0;
  text-align: center;
}

.remote-furnace-kec__content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 0 var(--ds-spacing-3);
}

.remote-furnace-kec__form,
.remote-furnace-kec__batch {
  min-width: 0;
  padding: var(--ds-spacing-3) calc(var(--ds-spacing-2) + var(--ds-spacing-0))
    calc(var(--ds-spacing-2) + var(--ds-spacing-0));
  border: 1px solid var(--kec-border);
  border-radius: var(--radius-4, 4px);
  background: var(--kec-surface);
  box-shadow: 0 8px 24px rgb(13 20 31 / 6%);
}

.remote-furnace-kec__form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow: none;
}

.remote-furnace-kec__form :deep(.ds-input) {
  --ds-spacing-1: 6px;
}

.remote-furnace-kec__pair,
.remote-furnace-kec__port-row,
.remote-furnace-kec__action-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: center;
  gap: var(--ds-spacing-2, 8px);
}

.remote-furnace-kec__select-field {
  --ds-input-min-height-md: 40px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.remote-furnace-kec :deep(.ds-field__label) {
  font-family: var(--family-font-family-default, var(--ds-font-family-sans));
  font-size: var(--ds-font-size-md);
  font-weight: var(--ds-font-weight-medium);
  line-height: var(--ds-line-height-md);
  letter-spacing: 0;
}

.remote-furnace-kec__mwf-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-rows: var(--ds-field-label-line-height) 40px;
  gap: 6px 8px;
}

.remote-furnace-kec__mwf-row .remote-furnace-kec__select-field {
  grid-row: 1 / -1;
}

.remote-furnace-kec__mwf-row .ds-btn {
  --ds-btn-bg: transparent;
  --ds-btn-border-color: var(--kec-accent);
  --ds-btn-fg: var(--kec-accent);
  --ds-btn-font-size: var(--ds-font-size-md);
  --ds-btn-height: 40px;
  --ds-btn-line-height: var(--ds-line-height-md);
  grid-row: 2;
  align-self: center;
  font-weight: var(--ds-font-weight-bold);
}

.remote-furnace-kec__port-row {
  grid-template-rows: var(--ds-field-label-line-height) 40px;
  row-gap: 6px;
}

.remote-furnace-kec__port-row .remote-furnace-kec__select-field {
  grid-row: 1 / -1;
}

.remote-furnace-kec__form :deep(.ds-input .q-field__control) {
  background: var(--background-background-primary, #fff);
}

.remote-furnace-kec__batch :deep(.ds-empty-state) {
  justify-self: center;
  width: 100%;
  gap: 0;
}

.remote-furnace-kec__batch :deep(.ds-empty-state__message) {
  width: auto;
  height: auto;
  margin-top: 10px;
  color: #667085;
  font-family: var(--family-font-family-default, var(--ds-font-family-sans));
  font-size: var(--ds-font-size-lg);
  font-weight: var(--ds-font-weight-regular);
  line-height: var(--ds-line-height-lg);
  letter-spacing: 0;
  white-space: nowrap;
}

.remote-furnace-kec__batch :deep(.ds-empty-state__icon) {
  width: 27px;
  height: 27px;
  margin-bottom: 18px;
  padding: 0;
  border-radius: 50%;
  background: #080f1b;
  color: #fff;
}

.remote-furnace-kec__batch :deep(.ds-empty-state__icon .q-icon) {
  font-size: 19px;
  font-variation-settings: 'FILL' 1;
}

.remote-furnace-kec__form :deep(.q-field__append .q-icon) {
  font-size: var(--component-icon-size-sm);
}

.remote-furnace-kec :deep(.q-field__native),
.remote-furnace-kec :deep(.q-field__input) {
  font-family: var(--family-font-family-default, var(--ds-font-family-sans));
  font-size: var(--ds-font-size-lg);
  font-weight: var(--ds-font-weight-regular);
  line-height: var(--ds-line-height-lg);
  letter-spacing: 0;
}

.remote-furnace-kec__batch :deep(.ds-empty-state__title) {
  font-family: var(--family-font-family-default, var(--ds-font-family-sans));
  font-size: var(--ds-font-size-xl);
  font-weight: var(--ds-font-weight-bold);
  line-height: var(--ds-line-height-xl);
  letter-spacing: 0;
}

.remote-furnace-kec__changed :deep(.q-field__native) {
  color: var(--text-text-error, #c62828);
}

.remote-furnace-kec__port-state {
  --ds-input-control-background: var(--ds-color-bg);
  --ds-input-control-color: var(--kec-ink);
  grid-row: 2;
  align-self: center;
  min-width: 0;
}

.remote-furnace-kec__port-state :deep(.q-field__native) {
  text-align: center;
}

.remote-furnace-kec__port-state--init {
  --ds-input-control-background: var(--background-background-error);
  --ds-input-control-color: var(--text-text-reversed);
}

.remote-furnace-kec__port-state--run {
  --ds-input-control-background: var(--background-background-info);
  --ds-input-control-color: var(--text-text-reversed);
}

.remote-furnace-kec__port-state--pending {
  --ds-input-control-background: var(--background-background-warning);
}

.remote-furnace-kec__port-state--ready {
  --ds-input-control-background: var(--background-background-success);
}

.remote-furnace-kec__port-state--reserved {
  --ds-input-control-background: var(--background-background-warning);
}

.remote-furnace-kec__port-state--complete {
  --ds-input-control-background: var(--background-background-success);
}

.remote-furnace-kec__port-state--idle {
  --ds-input-control-background: var(--background-background-disabled);
  --ds-input-control-color: var(--text-text-secondary);
}

.remote-furnace-kec__batch {
  display: grid;
  align-items: center;
  min-height: 352px;
  flex: none;
}

.remote-furnace-kec__table {
  align-self: stretch;
  min-width: 0;
  height: 328px;
}

.remote-furnace-kec__table :deep(.rgCell),
.remote-furnace-kec__table :deep(.rgHeaderCell) {
  text-align: center;
}

.remote-furnace-kec__table :deep(.remote-furnace-kec__cell--fail) {
  background: var(--background-background-error-opacity-20);
  color: var(--text-text-error);
}

.remote-furnace-kec__table :deep(.remote-furnace-kec__cell--run) {
  background: var(--background-background-info-opacity-20);
  color: var(--text-text-info);
}

.remote-furnace-kec__table :deep(.base-revo-grid__row--selected .rgCell) {
  background: var(--background-background-brand);
  color: var(--text-text-reversed);
}

.remote-furnace-kec__actions {
  display: grid;
  padding: var(--spacing-space-5) var(--ds-spacing-3)
    calc(var(--ds-spacing-3) + var(--ds-spacing-0));
}

.remote-furnace-kec__action-row :deep(.ds-btn) {
  --ds-btn-padding-x: var(--ds-spacing-1, 4px);
  min-width: 0;
  width: 100%;
  font-family: var(--family-font-family-default, var(--ds-font-family-sans));
  font-weight: var(--ds-font-weight-bold);
  letter-spacing: 0;
}

.remote-furnace-kec__action-row :deep(.ds-btn__label) {
  white-space: normal;
  overflow-wrap: anywhere;
}

.remote-furnace-kec__entry-actions :deep(.ds-btn) {
  --ds-btn-height: 35px;
  --ds-btn-font-size: 13px;
  --ds-btn-line-height: var(--ds-line-height-md);
  font-size: 13px;
  font-weight: var(--ds-font-weight-bold);
}

.remote-furnace-kec :deep(.ds-btn--primary.ds-btn--disabled) {
  --ds-btn-bg: var(--button-primary-default-btn-primary-bg-default);
  --ds-btn-border-color: var(--button-primary-default-btn-primary-bg-default);
  --ds-btn-fg: var(--button-primary-default-btn-primary-fg-default);
}

.remote-furnace-kec :deep(.ds-btn--secondary.ds-btn--disabled) {
  --ds-btn-border-color: var(--button-secondary-default-btn-secondary-border-default);
  --ds-btn-fg: var(--button-secondary-default-btn-secondary-fg-default);
}

.remote-furnace-kec :deep(.ds-btn--tertiary.ds-btn--disabled) {
  --ds-btn-bg: var(--button-tertiary-default-btn-tertiary-bg-default);
  --ds-btn-border-color: var(--kec-border);
  --ds-btn-fg: var(--button-tertiary-default-btn-tertiary-fg-default);
}

.remote-furnace-kec__action-row--three {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.remote-furnace-kec__dialog-message {
  margin: 0;
  white-space: pre-line;
}

.remote-furnace-kec__dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
