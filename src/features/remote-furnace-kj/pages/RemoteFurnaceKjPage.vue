<template>
  <main class="remote-furnace-kj-page">
    <section class="remote-furnace-kj-shell" aria-labelledby="remote-furnace-kj-title">
      <header class="remote-furnace-kj-header">
        <h1 id="remote-furnace-kj-title">KJ Furnace 자동화</h1>
      </header>

      <div class="remote-furnace-kj-content">
        <section
          class="remote-furnace-kj-card remote-furnace-kj-form"
          aria-label="Furnace LOT 정보"
        >
          <div class="remote-furnace-kj-lot-row">
            <div class="remote-furnace-kj-field">
              <BaseInput
                id="remote-furnace-kj-lot"
                :model-value="screen.lotInfo.value?.LOTID ?? screen.lotInput.value"
                label="LOT"
                stack-label
                aria-label="LOT"
                placeholder="LOT No"
                readonly
              />
            </div>
            <div class="remote-furnace-kj-field">
              <BaseInput
                id="remote-furnace-kj-batch"
                :model-value="screen.batchId.value"
                label="Batch"
                stack-label
                aria-label="Batch"
                placeholder="BAT ID"
                readonly
              />
            </div>
          </div>
          <div class="remote-furnace-kj-field">
            <BaseInput
              id="remote-furnace-kj-recipe"
              :model-value="screen.lotInfo.value?.RECIPE ?? ''"
              label="RECIPE"
              stack-label
              aria-label="RECIPE"
              readonly
            />
          </div>
          <div class="remote-furnace-kj-field">
            <BaseDropdownList
              class="remote-furnace-kj-select"
              label="진행 Rcp"
              stack-label
              aria-label="진행 Rcp"
              :model-value="screen.selectedRecipe.value || undefined"
              :options="recipeOptions"
              :disabled="screen.isRecipeLocked.value || screen.isLoading.value"
              @update:model-value="handleRecipeChange"
            />
          </div>
          <div class="remote-furnace-kj-field">
            <BaseInput
              id="remote-furnace-kj-standard-machine"
              :tone="screen.standardMachineError.value ? 'error-text' : 'default'"
              :model-value="screen.standardMachine.value"
              label="기준장비"
              stack-label
              aria-label="기준장비"
              readonly
            />
          </div>

          <div class="remote-furnace-kj-field">
            <div ref="equipmentInputContainer" class="remote-furnace-kj-machine-row">
              <BaseInput
                id="remote-furnace-kj-equipment"
                :model-value="screen.equipmentInput.value"
                label="진행장비"
                stack-label
                aria-label="진행장비"
                autocomplete="off"
                :disabled="screen.isEquipmentLocked.value || screen.isLoading.value"
                @update:model-value="screen.setEquipmentInput(String($event ?? ''))"
                @keydown.enter.prevent="handleEquipmentEnter"
              />
              <BaseInput
                v-if="screen.externalMachine.value"
                :model-value="screen.externalMachine.value"
                label="외부장비"
                stack-label
                aria-label="외부장비"
                readonly
              />
            </div>
          </div>
          <div class="remote-furnace-kj-field">
            <div class="remote-furnace-kj-port-row">
              <div class="remote-furnace-kj-port-select">
                <BaseDropdownList
                  class="remote-furnace-kj-select"
                  label="PORT"
                  stack-label
                  aria-label="PORT"
                  :model-value="screen.selectedPort.value || undefined"
                  :options="portOptions"
                  :disabled="
                    screen.isPortLocked.value ||
                    screen.isLoading.value ||
                    !screen.portOptions.value.length
                  "
                  @update:model-value="handlePortChange"
                />
                <output
                  v-if="screen.portStatus.value"
                  :class="[
                    'remote-furnace-kj-port-state',
                    getRemoteFurnaceKjPortStateClass(screen.portStatus.value),
                  ]"
                  aria-label="PORT 상태"
                  aria-live="polite"
                >
                  {{ screen.portStatus.value }}
                </output>
              </div>
              <BaseButton
                class="remote-furnace-kj-reset"
                variant="secondary"
                :disabled="screen.isLoading.value || !screen.clearPortEnabled.value"
                @click="screen.executeClearPort"
              >
                초기화
              </BaseButton>
            </div>
          </div>
        </section>

        <section class="remote-furnace-kj-card remote-furnace-kj-batch" aria-label="Batch LOT 목록">
          <BaseRevoGrid
            v-if="screen.batchRows.value.length"
            class="remote-furnace-kj-grid"
            :rows="gridRows"
            :columns="gridColumns"
            row-key="LOTID"
            :selected-row-key="selectedBatchLot?.LOTID"
            :row-size="38"
            :resize="false"
            @row-select="handleRowSelect"
            @pointerup="activateSelectedBatchLot"
            @keydown.enter.prevent="activateSelectedBatchLot"
            @keydown.space.prevent="activateSelectedBatchLot"
          />
          <BaseEmptyState
            v-else
            class="remote-furnace-kj-empty"
            title="EMPTY"
            message="MOVE IN할 LOT이 없습니다."
          />
        </section>
      </div>

      <footer class="remote-furnace-kj-footer" aria-label="Furnace 작업">
        <BaseButton
          class="remote-furnace-kj-action remote-furnace-kj-action--start"
          :class="{
            'remote-furnace-kj-action--no-batch': screen.startButtonLabel.value === 'NO BATCH',
          }"
          data-action="start"
          variant="primary"
          :disabled="!screen.startEnabled.value || screen.isProcessing.value"
          :loading="screen.isProcessing.value"
          @click="screen.executeStart"
        >
          {{ screen.startButtonLabel.value }}
        </BaseButton>
        <BaseButton
          class="remote-furnace-kj-action remote-furnace-kj-action--restart"
          data-action="restart"
          variant="secondary"
          :disabled="!screen.restartEnabled.value || screen.isProcessing.value"
          @click="screen.executeReStart"
        >
          {{ screen.restartButtonLabel.value }}
        </BaseButton>
        <BaseButton
          class="remote-furnace-kj-action remote-furnace-kj-action--cancel"
          variant="tertiary"
          @click="screen.cancelPage"
        >
          취소
        </BaseButton>
      </footer>
    </section>

    <RemoteRecipeDialog
      :model-value="screen.recipeConfirmationOpen.value"
      :recipe-list="screen.selectedRecipe.value"
      :lot-no="screen.lotInput.value"
      @confirm="screen.confirmRecipeAction"
      @cancel="screen.cancelRecipeAction"
    />

    <BaseModal
      :open="screen.dialog.value.open"
      :title="screen.dialog.value.title"
      :overlay-closable="screen.dialog.value.kind !== 'confirm'"
      class="remote-furnace-kj-message-modal"
      @update:open="handleMessageModalChange"
      @after-close="screen.onDialogAfterClose"
    >
      <p class="remote-furnace-kj-message">{{ screen.dialog.value.message }}</p>
      <template #footer>
        <BaseButton
          v-if="screen.dialog.value.kind === 'confirm'"
          variant="tertiary"
          @click="cancelMessageDialog"
        >
          취소
        </BaseButton>
        <BaseButton variant="primary" @click="screen.confirmDialogAction"> 확인 </BaseButton>
      </template>
    </BaseModal>
  </main>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import {
  BaseButton,
  BaseDropdownList,
  type BaseDropdownValue,
  BaseEmptyState,
  BaseInput,
  BaseModal,
  type BaseOption,
  BaseRevoGrid,
} from '../../../components/base';
import { ROUTE } from '../../../constants/routes';
import RemoteRecipeDialog from '../../remote-ramco/components/RemoteRecipeDialog.vue';
import { useRemoteFurnaceKj } from '../composables/useRemoteFurnaceKj';
import {
  createRemoteFurnaceKjMockApi,
  REMOTE_FURNACE_KJ_MOCK_CASES,
} from '../mocks/remote-furnace-kj.mock';
import { getRemoteFurnaceKjPortStateClass } from '../port-state';
import { useRemoteFurnaceKjStore } from '../stores/remote-furnace-kj.store';
import type { FurnaceKjBatchLot } from '../types/remote-furnace-kj.types';

const props = defineProps<{ initialLotId?: string }>();
const route = useRoute();
const router = useRouter();
const remoteFurnaceKjStore = useRemoteFurnaceKjStore();
const equipmentInputContainer = ref<HTMLElement>();
const selectedBatchLot = ref<FurnaceKjBatchLot>();

function queryString(key: string): string {
  const value = route.query[key];
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

const initialLotId = props.initialLotId ?? queryString('lotId');
const initialDraft = remoteFurnaceKjStore.consumeDraft(initialLotId);
const requestedMockCase = queryString('mockCase');
const mockCase = REMOTE_FURNACE_KJ_MOCK_CASES.find((candidate) => candidate === requestedMockCase);
const mockApi =
  import.meta.env.DEV && mockCase ? createRemoteFurnaceKjMockApi(mockCase) : undefined;
const screen = useRemoteFurnaceKj({
  api: mockApi,
  initialLotId,
  initialDraft,
  onOpenComments(context) {
    remoteFurnaceKjStore.setDraft(screen.createDraft());
    void router.push({
      path: `/${ROUTE.commentList}`,
      query: {
        lotId: context.lotId,
        operation: context.operation,
        subOperation: context.subOperation,
        processStep: context.processStep,
        operSequence: context.operSequence,
        ...(import.meta.env.DEV ? { mock: 'remote-furnace-kj' } : {}),
      },
    });
  },
  onCancel() {
    void router.back();
  },
  onSuccess(lotId) {
    remoteFurnaceKjStore.setReturnLotId(lotId);
    void router.replace({ path: `/${ROUTE.esheet}` });
  },
});

const gridRows = computed(() =>
  screen.batchRows.value.map((row) => ({
    ...row,
    rowClass: getBatchRowStatusClass(row.STATUS),
  })),
);

function getBatchRowStatusClass(status: string): string {
  switch (status.trim().toUpperCase()) {
    case 'FAIL':
      return 'is-fail';
    case 'RUN':
      return 'is-run';
    default:
      return '';
  }
}

const gridColumns = [
  { prop: 'LOTID', name: 'LOTNO', size: 132 },
  { prop: 'COMMENTQTY', name: 'C', size: 48 },
  { prop: 'STATUS', name: '상태', size: 72 },
  { prop: 'PROCESSSTEP', name: '공정명', size: 150 },
  { prop: 'PRODUCT', name: '제품명', size: 120 },
  { prop: 'QUANTITY', name: '수량', size: 72 },
  { prop: 'ERRORMESSAGE', name: '에러메시지', size: 180 },
  { prop: 'OPERATION', name: 'OPERATION', size: 112 },
  { prop: 'SUBOPERATION', name: 'SUBOPERATION', size: 128 },
  { prop: 'LOTSTATE', name: 'STATE', size: 76 },
  { prop: 'NWCOMMENTQTY', name: 'WCOMMENTCNT', size: 128 },
  { prop: 'OPERSEQUENCE', name: 'OPERSEQUENCE', size: 128 },
];

const recipeOptions = computed<BaseOption[]>(() =>
  screen.recipeOptions.value.map((recipe) => ({ label: recipe, value: recipe })),
);
const portOptions = computed<BaseOption[]>(() =>
  screen.portOptions.value.map((port) => ({ label: port, value: port })),
);

const isConfirmDialog = computed(() => screen.dialog.value.kind === 'confirm');

function handleRecipeChange(value: BaseDropdownValue): void {
  if (typeof value === 'string') void screen.selectRecipe(value);
}

function handlePortChange(value: BaseDropdownValue): void {
  if (typeof value === 'string') void screen.selectPort(value);
}

async function handleEquipmentEnter(): Promise<void> {
  await screen.onEquipmentEnter();
  await restoreEquipmentFocus(true);
}

async function cancelMessageDialog(): Promise<void> {
  screen.cancelDialogAction();
  await restoreEquipmentFocus();
}

async function restoreEquipmentFocus(selectAll = false): Promise<void> {
  await nextTick();
  const input = equipmentInputContainer.value?.querySelector<HTMLInputElement>('input');
  if (!input || input.disabled) return;

  input.focus();
  if (selectAll) input.select();
}

function handleRowSelect(_key: string | number, row: Record<string, unknown>): void {
  selectedBatchLot.value = row as unknown as FurnaceKjBatchLot;
}

function activateSelectedBatchLot(): void {
  if (selectedBatchLot.value) screen.selectMoveIn(selectedBatchLot.value);
}

function handleMessageModalChange(open: boolean): void {
  if (!open && !isConfirmDialog.value) screen.closeDialog();
}

onMounted(async () => {
  await screen.initialize();
  await restoreEquipmentFocus();
});
</script>

<style src="../styles/remote-furnace-kj.css"></style>
