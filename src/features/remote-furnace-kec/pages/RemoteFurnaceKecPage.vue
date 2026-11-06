<template>
  <BaseScreen class="remote-furnace-kec" title="KEC Furnace 자동화">
    <section class="ds-screen__card" aria-label="제품 정보">
      <div class="remote-furnace-kec__row">
        <BaseInput
          id="kec-lot"
          label="LOT"
          :model-value="screen.lotId.value"
          :loading="screen.loading.value"
          readonly
        />
        <BaseInput id="kec-batch" label="BATCH" :model-value="screen.batchId.value" readonly />
      </div>

      <BaseInput
        id="kec-recipe"
        label="RECIPE"
        :model-value="screen.recipe.value"
        :tone="screen.isRecipeChanged.value ? 'error-text' : 'default'"
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
      />
      <BaseInput
        id="kec-standard-machine"
        label="기준장비"
        :model-value="screen.standardEquipment.value"
        :tone="screen.isStandardEquipmentChanged.value ? 'error-text' : 'default'"
        readonly
      />
      <BaseInput
        id="kec-equipment"
        label="진행장비"
        :model-value="screen.equipmentId.value"
        :disabled="screen.restartMode.value"
        autocomplete="off"
        @update:model-value="screen.equipmentId.value = String($event ?? '')"
        @keyup.enter="screen.handleEquipmentEnter(screen.equipmentId.value)"
      />

      <div class="remote-furnace-kec__row remote-furnace-kec__row--action">
        <BaseDropdownList
          id="kec-mwf"
          label="MWF"
          placeholder=""
          :model-value="screen.mwfPosition.value || undefined"
          :options="mwfOptions"
          @update:model-value="screen.mwfPosition.value = Number($event ?? 0)"
        />
        <BaseButton
          variant="secondary"
          :disabled="!screen.availability.clearPort || screen.loading.value"
          @click="screen.executeClearPort()"
        >
          초기화
        </BaseButton>
      </div>
      <div v-if="screen.portOptions.value.length" class="remote-furnace-kec__row">
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
        <BaseInput
          v-if="screen.portState.value"
          :model-value="screen.portState.value"
          :tone="portStateTone"
          aria-label="PORT STATUS"
          aria-live="polite"
          readonly
        />
      </div>
    </section>

    <section class="ds-screen__card" aria-label="조회 결과">
      <div class="remote-furnace-kec__batch">
        <BaseRevoGrid
          v-if="screen.rows.value.length"
          :rows="screen.rows.value"
          :columns="batchColumns"
          row-key="LOTID"
          :selected-row-key="screen.selectedRowId.value"
          @row-select="handleRowSelect"
        />
        <BaseEmptyState v-else title="EMPTY" message="해당 결과가 없습니다" icon-variant="filled" />
      </div>
    </section>

    <div class="remote-furnace-kec__row">
      <BaseButton
        variant="tertiary"
        :disabled="!screen.availability.enter || screen.loading.value"
        @click="screen.executeCommand('enter')"
      >
        ENTERING
      </BaseButton>
      <BaseButton
        variant="tertiary"
        :disabled="!screen.availability.enterStart || screen.loading.value"
        @click="screen.executeCommand('enterStart')"
      >
        ENTER + START
      </BaseButton>
    </div>

    <template #footer>
      <BaseButton
        variant="primary"
        size="medium"
        :disabled="!screen.availability.start || screen.loading.value"
        @click="screen.executeCommand('start')"
      >
        {{ screen.isNonLot.value ? 'NO BATCH' : 'START' }}
      </BaseButton>
      <BaseButton
        variant="secondary"
        size="medium"
        :disabled="!screen.availability.restart || screen.loading.value"
        @click="screen.executeCommand('restart')"
      >
        {{ screen.isNonLot.value ? '온도설정' : 'RESTART' }}
      </BaseButton>
      <BaseButton variant="tertiary" size="medium" @click="goBack">취소</BaseButton>
    </template>

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
  </BaseScreen>
</template>

<script setup lang="ts">
import {
  BaseButton,
  BaseDropdownList,
  BaseEmptyState,
  BaseInput,
  type BaseInputTone,
  BaseModal,
  BaseRevoGrid,
  BaseScreen,
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

const PORT_STATE_TONES: Record<string, BaseInputTone> = {
  INIT: 'error',
  RUN: 'brand',
  PENDING: 'warning',
  READY: 'success',
  RESERVED: 'warning-subtle',
  COMPLETE: 'success',
  IDLE: 'inactive',
};

const recipeOptions = computed(() =>
  screen.recipeOptions.value.map((value) => ({ label: value, value })),
);
const portOptions = computed(() =>
  screen.portOptions.value.map((value) => ({ label: value, value })),
);
const portStateTone = computed<BaseInputTone>(
  () => PORT_STATE_TONES[screen.portState.value.toUpperCase()] ?? 'default',
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
.remote-furnace-kec__row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: end;
  gap: var(--spacing-space-1);
  inline-size: 100%;
}

.remote-furnace-kec__row--action {
  grid-template-columns: minmax(0, 1fr) auto;
}

.remote-furnace-kec__batch {
  --kec-batch-min-height: 12rem;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  place-items: center;
  inline-size: 100%;
  min-block-size: var(--kec-batch-min-height);
}

.remote-furnace-kec__batch :deep(.remote-furnace-kec__cell--fail) {
  background: var(--background-background-error-opacity-20);
  color: var(--text-text-error);
}

.remote-furnace-kec__batch :deep(.remote-furnace-kec__cell--run) {
  background: var(--background-background-info-opacity-20);
  color: var(--text-text-info);
}

.remote-furnace-kec__dialog-message {
  margin: 0;
  white-space: pre-line;
}

.remote-furnace-kec__dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-space-1);
}
</style>
