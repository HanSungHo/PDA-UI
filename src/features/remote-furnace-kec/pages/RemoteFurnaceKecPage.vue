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
        <BaseDropdownList
          id="kec-progress-recipe"
          label="진행 RCP"
          placeholder=""
          :model-value="screen.selectedRecipe.value ?? undefined"
          :options="recipeOptions"
          :disabled="screen.restartMode.value"
          @update:model-value="screen.selectedRecipe.value = String($event ?? '') || null"
          @change="screen.checkRecipeInterlock()"
        >
          <template #indicator><QIcon name="sym_o_keyboard_arrow_down" size="16px" /></template>
        </BaseDropdownList>
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
          <BaseDropdownList
            id="kec-mwf"
            label="MWF"
            placeholder=""
            :model-value="screen.mwfPosition.value || undefined"
            :options="mwfOptions"
            @update:model-value="screen.mwfPosition.value = Number($event ?? 0)"
          >
            <template #indicator><QIcon name="sym_o_keyboard_arrow_down" size="16px" /></template>
          </BaseDropdownList>
          <BaseButton
            variant="secondary"
            :disabled="!screen.availability.clearPort || screen.loading.value"
            @click="screen.executeClearPort()"
          >
            초기화
          </BaseButton>
        </div>
        <div v-if="screen.portOptions.value.length" class="remote-furnace-kec__port-row">
          <BaseDropdownList
            id="kec-port"
            label="PORT"
            placeholder=""
            :model-value="screen.selectedPort.value ?? undefined"
            :options="portOptions"
            :disabled="screen.restartMode.value"
            @update:model-value="screen.selectedPort.value = String($event ?? '') || null"
            @change="screen.refreshPortState()"
          />
          <output
            v-if="screen.portState.value"
            class="remote-furnace-kec__port-state"
            :class="`remote-furnace-kec__port-state--${screen.portState.value.toLowerCase()}`"
            aria-live="polite"
          >
            {{ screen.portState.value }}
          </output>
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
  --kec-border: var(--border-border-primary, #d1d5dc);
  --kec-ink: var(--text-text-primary, #030712);
  --kec-surface: var(--ds-color-bg-secondary);
  min-height: 100vh;
  color: var(--kec-ink);
  background: linear-gradient(180deg, #1c493a 0%, #96b1a8 53.846%, #ecf8f1 100%);
  font-family: var(--font-family-default, 'Noto Sans KR', sans-serif);
}

.remote-furnace-kec__header {
  display: flex;
  min-height: 60px;
  align-items: center;
  justify-content: center;
  padding: 0 var(--ds-spacing-4, 16px);
  color: var(--kec-surface);
}

.remote-furnace-kec__header h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  line-height: 28px;
  text-align: center;
}

.remote-furnace-kec__content {
  display: flex;
  flex-direction: column;
  gap: var(--ds-spacing-4, 16px);
  min-height: 844px;
  padding: var(--ds-spacing-3, 12px);
}

.remote-furnace-kec__form,
.remote-furnace-kec__batch {
  min-width: 0;
  padding: var(--ds-spacing-3, 12px);
  border: 1px solid var(--kec-border);
  border-radius: var(--radius-4, 4px);
  background: var(--kec-surface);
  box-shadow: 0 8px 24px rgb(13 20 31 / 6%);
}

.remote-furnace-kec__form {
  display: flex;
  flex-direction: column;
  gap: var(--ds-spacing-2, 8px);
  border: 0;
  box-shadow:
    inset 0 0 0 1px var(--kec-border),
    0 8px 24px rgb(13 20 31 / 6%);
}

.remote-furnace-kec__pair,
.remote-furnace-kec__port-row,
.remote-furnace-kec__action-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: center;
  gap: var(--ds-spacing-2, 8px);
}

.remote-furnace-kec__mwf-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--ds-spacing-2, 8px);
}

.remote-furnace-kec__form :deep(.ds-input .q-field__control) {
  background: var(--background-background-primary, #fff);
}

.remote-furnace-kec__batch :deep(.ds-empty-state) {
  justify-self: center;
  width: max-content;
  max-width: 100%;
}

.remote-furnace-kec__batch :deep(.ds-empty-state__message) {
  width: auto;
  height: auto;
  white-space: nowrap;
}

.remote-furnace-kec__batch :deep(.ds-empty-state__icon) {
  color: var(--kec-ink);
}

.remote-furnace-kec__batch :deep(.ds-empty-state__icon .q-icon) {
  font-variation-settings: 'FILL' 1;
}

.remote-furnace-kec__form :deep(.q-field__append .q-icon) {
  font-size: 16px;
}

.remote-furnace-kec__changed :deep(.q-field__native) {
  color: var(--text-text-error, #c62828);
}

.remote-furnace-kec__port-state {
  min-width: 0;
  color: var(--kec-ink);
  text-align: center;
  overflow-wrap: anywhere;
}

.remote-furnace-kec__port-state--init {
  background: var(--background-background-error);
  color: var(--text-text-reversed);
}

.remote-furnace-kec__port-state--run {
  background: var(--background-background-info);
  color: var(--text-text-reversed);
}

.remote-furnace-kec__port-state--pending {
  background: var(--background-background-warning);
  color: var(--kec-ink);
}

.remote-furnace-kec__port-state--ready {
  background: var(--background-background-success);
  color: var(--kec-ink);
}

.remote-furnace-kec__port-state--reserved {
  background: var(--background-background-warning);
  color: var(--kec-ink);
}

.remote-furnace-kec__port-state--complete {
  background: var(--background-background-success);
  color: var(--kec-ink);
}

.remote-furnace-kec__port-state--idle {
  background: var(--background-background-disabled);
  color: var(--text-text-secondary);
}

.remote-furnace-kec__batch {
  display: grid;
  align-items: center;
  min-height: 352px;
  flex: 1;
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
  padding: var(--ds-spacing-3, 12px);
}

.remote-furnace-kec__action-row :deep(.ds-btn) {
  --ds-btn-padding-x: var(--ds-spacing-1, 4px);
  min-width: 0;
  width: 100%;
  font-weight: 700;
}

.remote-furnace-kec__action-row :deep(.ds-btn__label) {
  white-space: normal;
  overflow-wrap: anywhere;
}

.remote-furnace-kec__entry-actions :deep(.ds-btn) {
  font-size: 13px;
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
