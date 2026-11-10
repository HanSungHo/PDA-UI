<template>
  <BaseScreen title="Abort Batch 매뉴얼 등록" class="manual-abort-batch">
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
        class="manual-abort-batch__table"
        :rows="gridRows"
        :columns="columns"
        :resize="false"
        accessible-label="Abort Batch LOT 목록"
      />
    </section>

    <!-- Figma 7790:82478 order (저장 then 취소), as on the other screens; Android has 취소 first. -->
    <template #footer>
      <BaseButton size="medium" :disabled="!canSave" :loading="loading" @click="save">
        저장
      </BaseButton>
      <BaseButton variant="tertiary" size="medium" @click="closePage">취소</BaseButton>
    </template>

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
// columns follow the card width on any screen size, and centres every column (Gravity.CENTER).
const gridCard = ref<HTMLElement>();
const gridWidth = ref(318);
let gridResizeObserver: ResizeObserver | undefined;
const columns = computed<BaseRevoGridColumn[]>(() => {
  const size = Math.floor(gridWidth.value / 3);
  return [
    { prop: 'BATCHINFO', name: '구분', size, align: 'center' },
    { prop: 'ZONE', name: 'ZONE', size, align: 'center' },
    { prop: 'LOT', name: 'LOT', size, align: 'center' },
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
.manual-abort-batch__field {
  width: 100%;
  min-width: 0;
}
/* The grid card takes the remaining height so the screen itself never scrolls. */
.manual-abort-batch__grid.ds-screen__card {
  flex: 1 1 0;
  min-height: 0;
}
.manual-abort-batch__table {
  flex: 1 1 0;
  min-height: 0;
}
/* Android paints the 자 row #ffebcd. */
.manual-abort-batch__grid :deep(.manual-abort-batch__row--child .rgCell) {
  background: var(--background-background-warning-20);
}
.manual-abort-batch__message {
  margin: 0;
  white-space: pre-line;
}
</style>
