<template>
  <BaseScreen
    title="Abort Batch 매뉴얼 등록"
    class="manual-abort-batch"
    ok-label="저장"
    cancel-label="취소"
    :ok-disabled="!canSave"
    :ok-loading="loading"
    @ok="save"
    @cancel="closePage"
  >
    <section class="ds-screen__card" aria-label="Abort Batch 입력">
      <BaseInput
        ref="lotInput"
        :model-value="lotId"
        class="manual-abort-batch__field"
        label="LOT"
        placeholder="barcode"
        autocomplete="off"
        autocapitalize="characters"
        @update:model-value="updateLot(String($event ?? ''))"
        @keydown.enter.prevent="scanLot"
      />
      <BaseInput
        ref="eqpInput"
        :model-value="eqpId"
        class="manual-abort-batch__field"
        label="진행 장비"
        placeholder="barcode"
        autocomplete="off"
        autocapitalize="characters"
        @update:model-value="updateEqp(String($event ?? ''))"
        @keydown.enter.prevent="scanEqp"
      />
      <BaseInput
        ref="recipeInput"
        :model-value="recipe"
        class="manual-abort-batch__field"
        label="RECIPE"
        placeholder="Key - in"
        autocomplete="off"
        autocapitalize="characters"
        @update:model-value="updateRecipe(String($event ?? ''))"
      />
    </section>

    <section
      ref="gridCard"
      class="ds-screen__card manual-abort-batch__grid"
      aria-label="Abort Batch LOT 목록"
      :aria-busy="loading"
    >
      <BaseRevoGrid
        v-if="gridRows.length"
        :rows="gridRows"
        :columns="columns"
        :row-size="40"
        :resize="false"
        :filter="false"
        :readonly="true"
        accessible-label="Abort Batch LOT 목록"
      />
      <BaseEmptyState v-else icon-variant="filled" />
    </section>

    <BaseModal
      :open="Boolean(activeDialog)"
      :title="activeDialog?.title"
      :closable="false"
      :overlay-closable="false"
      @update:open="!$event && closeDialog()"
    >
      <p class="manual-abort-batch__message" role="alert">{{ activeDialog?.message }}</p>
      <template #footer>
        <BaseButton variant="primary" @click="closeDialog">{{ COMMON_FIELD.BTNOKSTR }}</BaseButton>
      </template>
    </BaseModal>
  </BaseScreen>
</template>

<script setup lang="ts">
import { BaseButton, BaseInput, BaseModal, BaseRevoGrid, BaseScreen } from 'src/components/base';
import { BaseEmptyState } from 'src/components/base/empty-state';
import type { BaseRevoGridColumn } from 'src/components/base/revo-grid';
import { COMMON_FIELD } from 'src/constants/common-strings';
import { ROUTE } from 'src/constants/routes';
import { NATIVE_ENTER_EVENT } from 'src/utils/native-enter-event';
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { useManualAbortBatch } from '../composables/use-manual-abort-batch';
import type { ManualAbortBatchField } from '../types/manual-abort-batch.types';

const router = useRouter();
const lotInput = ref<InstanceType<typeof BaseInput>>();
const eqpInput = ref<InstanceType<typeof BaseInput>>();
const recipeInput = ref<InstanceType<typeof BaseInput>>();
const inputs = { lot: lotInput, eqp: eqpInput, recipe: recipeInput };

// The EditTexts set selectAllOnFocus, so the next scan replaces the text instead of appending.
function focus(field: ManualAbortBatchField): void {
  void nextTick(() => {
    inputs[field].value?.focus();
    inputs[field].value?.select();
  });
}

function closePage(): void {
  if (router.options.history.state.back) router.back();
  else void router.replace({ path: `/${ROUTE.main}` });
}

const {
  lotId,
  eqpId,
  recipe,
  rows,
  canSave,
  loading,
  activeDialog,
  closeDialog,
  updateLot,
  updateEqp,
  updateRecipe,
  scanLot,
  scanEqp,
  save,
} = useManualAbortBatch({ focus, close: closePage });

// Android paints the row whose BATCHINFO is "자" (#ffebcd).
const gridRows = computed(() =>
  rows.value.map((row) => ({
    ...row,
    rowClass: row.BATCHINFO === '자' ? 'manual-abort-batch__row--child' : '',
  })),
);

// Android gives each of the three columns a third of the grid width (baseWidth / 3), so the
// columns follow the card width on any screen size.
const gridCard = ref<HTMLElement>();
const gridWidth = ref(318);
let gridResizeObserver: ResizeObserver | undefined;
const columns = computed<BaseRevoGridColumn[]>(() => {
  const size = Math.floor(gridWidth.value / 3);
  return [
    { prop: 'BATCHINFO', name: '구분', size },
    { prop: 'ZONE', name: 'ZONE', size },
    { prop: 'LOT', name: 'LOT', size },
  ];
});

// On the device MainActivity consumes the scanner's Enter key and re-sends it as native-enter.
function handleNativeEnter(): void {
  const active = document.activeElement;
  const within = (input: typeof lotInput) =>
    Boolean((input.value?.$el as HTMLElement | undefined)?.contains(active));
  if (within(lotInput)) void scanLot();
  else if (within(eqpInput)) scanEqp();
}

onMounted(() => {
  if (gridCard.value && typeof ResizeObserver !== 'undefined') {
    gridResizeObserver = new ResizeObserver(([entry]) => {
      if (entry) gridWidth.value = Math.floor(entry.contentRect.width);
    });
    gridResizeObserver.observe(gridCard.value);
  }
  window.addEventListener(NATIVE_ENTER_EVENT, handleNativeEnter);
  focus('lot');
});

onBeforeUnmount(() => {
  window.removeEventListener(NATIVE_ENTER_EVENT, handleNativeEnter);
  gridResizeObserver?.disconnect();
});
</script>

<style scoped>
/* Figma 4373:14785: a 65px label column for LOT / 진행 장비 / RECIPE. */
.manual-abort-batch__field {
  --ds-field-label-width: 65px;
  width: 100%;
  min-width: 0;
}
/* The grid card takes the remaining height so the screen itself never scrolls. */
.manual-abort-batch__grid.ds-screen__card {
  flex: 1 1 0;
  min-height: 0;
  align-items: center;
  justify-content: center;
}
.manual-abort-batch__grid :deep(.base-revo-grid) {
  flex: 1;
  width: 100%;
  min-height: 0;
}
.manual-abort-batch__grid :deep(revo-grid) {
  --revo-grid-header-height: 40px;
  --revo-grid-font-family: var(--font-family-default);
  --revo-grid-font-size: var(--size-14px);
}
.manual-abort-batch__grid :deep(.rgHeaderCell) {
  box-sizing: border-box;
  padding: 0 var(--spacing-space-1);
  border-inline-end: 1px solid var(--border-border-secondary);
  background: var(--background-background-brand);
  color: var(--text-text-reversed);
  font-weight: var(--weight-font-bold);
}
.manual-abort-batch__grid :deep(.rgHeaderCell .header-content) {
  text-align: center;
}
/* Android centres every column (Gravity.CENTER). */
.manual-abort-batch__grid :deep(.rgCell) {
  box-sizing: border-box;
  padding: 0 var(--spacing-space-1);
  border-inline-end: 1px solid var(--border-border-primary);
  border-block-end: 1px solid var(--border-border-primary);
  color: var(--text-text-primary);
  text-align: center;
}
.manual-abort-batch__grid :deep(.manual-abort-batch__row--child .rgCell) {
  background: var(--background-background-warning-20);
}
.manual-abort-batch__message {
  margin: 0;
  white-space: pre-line;
}
</style>
