<template>
  <BaseScreen title="ETCH 조건표 조회" class="etch-condition">
    <section class="ds-screen__card etch-condition__card" aria-label="LOT 조회">
      <BaseDropdownList
        :model-value="machine || undefined"
        class="etch-condition__field"
        label="Machine"
        clearable
        :options="machineOptions"
        :disabled="loading"
        @update:model-value="machine = String($event ?? '')"
      />
      <div class="etch-condition__lot">
        <BaseInput
          ref="lotInput"
          :model-value="lotNo"
          class="etch-condition__field"
          label="LOT"
          autocomplete="off"
          autocapitalize="characters"
          :loading="loading"
          @update:model-value="updateLot(String($event ?? ''))"
          @keydown.enter.prevent="scanLot"
        >
          <template #append>
            <QIcon name="sym_o_search" aria-hidden="true" />
          </template>
        </BaseInput>
        <BaseButton variant="secondary" size="small" :loading="loading" @click="search"
          >조회</BaseButton
        >
      </div>
      <!-- Android txt_oper_recipe has no caption; Figma draws it as a field, so it gets an aria-label. -->
      <BaseInput
        :model-value="operRecipe"
        class="etch-condition__field"
        aria-label="공정 / RCP"
        readonly
      />
    </section>

    <section class="ds-screen__card etch-condition__card" aria-label="조건 메시지">
      <p class="etch-condition__comment" aria-live="polite">{{ comment }}</p>
    </section>

    <section
      class="ds-screen__card etch-condition__card etch-condition__grid"
      aria-label="ETCH 조건표"
      :aria-busy="loading"
    >
      <BaseRevoGrid
        v-if="rows.length"
        :key="gridKind"
        :rows="rows"
        :columns="columns"
        :row-size="40"
        :resize="false"
        :filter="false"
        :readonly="true"
        accessible-label="ETCH 조건표"
      />
    </section>

    <template #footer>
      <BaseButton variant="tertiary" size="medium" block @click="closePage">취소</BaseButton>
    </template>

    <BaseModal
      :open="Boolean(activeDialog)"
      :title="activeDialog?.title"
      :closable="false"
      :overlay-closable="false"
      @update:open="!$event && closeDialog()"
    >
      <p class="etch-condition__message" role="alert">{{ activeDialog?.message }}</p>
      <template #footer>
        <BaseButton variant="primary" @click="closeDialog">{{ COMMON_FIELD.BTNOKSTR }}</BaseButton>
      </template>
    </BaseModal>
  </BaseScreen>
</template>

<script setup lang="ts">
import { QIcon } from 'quasar';
import {
  BaseButton,
  BaseDropdownList,
  BaseInput,
  BaseModal,
  type BaseOption,
  BaseRevoGrid,
  BaseScreen,
} from 'src/components/base';
import type { BaseRevoGridColumn } from 'src/components/base/revo-grid';
import { COMMON_FIELD } from 'src/constants/common-strings';
import { ROUTE } from 'src/constants/routes';
import { NATIVE_ENTER_EVENT } from 'src/utils/native-enter-event';
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { ETCH_MACHINES, useEtchCondition } from '../composables/use-etch-condition';
import type { EtchConditionRow } from '../types/etch-condition.types';

const router = useRouter();
const lotInput = ref<InstanceType<typeof BaseInput>>();

function focusLot(select: boolean): void {
  void nextTick(() => {
    lotInput.value?.focus();
    if (select) lotInput.value?.select();
  });
}

const {
  lotNo,
  machine,
  operRecipe,
  comment,
  gridKind,
  rows,
  loading,
  activeDialog,
  closeDialog,
  updateLot,
  search,
  scanLot,
} = useEtchCondition({ focusLot });

const machineOptions: BaseOption[] = ETCH_MACHINES.map((value) => ({ label: value, value }));

// Android colours the 연속 cell green for 가능 and red for 불가 and leaves other values alone.
function continuityClass(value: string | undefined): string {
  if (value === '가능') return 'etch-condition__cell--possible';
  if (value === '불가') return 'etch-condition__cell--impossible';
  return 'etch-condition__cell--continuity';
}

// Column keys and captions of the two ETCHActivity grids; widths follow Figma 4387:16771.
const chamberColumns: BaseRevoGridColumn[] = [
  { prop: 'CHAMBER', name: 'CH', size: 40 },
  { prop: 'ETCVALUE', name: 'PARA', size: 131 },
  { prop: 'BASE_VALUE', name: 'BASE', size: 58 },
  { prop: 'TUNE_VALUE', name: '변경', size: 48 },
  { prop: 'CURR_VALUE', name: '현재값', size: 70 },
  {
    prop: 'CHKCHK',
    name: '연속',
    size: 70,
    cellProperties: ({ model }: { model: EtchConditionRow }) => ({
      class: continuityClass(model.CHKCHK),
    }),
  },
];

// Android splits the grid width in half (baseWidth / 2); 155px fills the 310px table.
const te8500Columns: BaseRevoGridColumn[] = [
  { prop: 'COL', name: 'COL', size: 155 },
  { prop: 'VALUE', name: 'VALUE', size: 155 },
];

const columns = computed(() => (gridKind.value === 'te8500' ? te8500Columns : chamberColumns));

function closePage(): void {
  if (router.options.history.state.back) router.back();
  else void router.replace({ path: `/${ROUTE.main}` });
}

// On the device MainActivity consumes the scanner's Enter key and re-sends it as native-enter.
function handleNativeEnter(): void {
  const root = lotInput.value?.$el as HTMLElement | undefined;
  if (root?.contains(document.activeElement)) void scanLot();
}

onMounted(() => {
  window.addEventListener(NATIVE_ENTER_EVENT, handleNativeEnter);
  focusLot(false);
});

onBeforeUnmount(() => window.removeEventListener(NATIVE_ENTER_EVENT, handleNativeEnter));
</script>

<style scoped>
/* Fields use the shared Input Form spec (32px, label beside the control). */
.etch-condition__field {
  flex: 1 1 0;
  width: 100%;
  min-width: 0;
}
.etch-condition__lot {
  display: flex;
  align-items: flex-end;
  gap: var(--spacing-space-1);
  width: 100%;
}
.etch-condition__comment {
  min-height: 20px;
  margin: 0;
  color: var(--text-text-warning);
  font-size: var(--size-14px);
  font-weight: var(--weight-font-medium);
  line-height: var(--height-20px);
  overflow-wrap: anywhere;
}
/* The grid card takes the remaining height so the screen itself never scrolls. */
.etch-condition__grid.ds-screen__card {
  flex: 1 1 0;
  min-height: 0;
  align-items: stretch;
}
.etch-condition__grid :deep(.base-revo-grid) {
  flex: 1;
  width: 100%;
  min-height: 0;
}
/* Figma Table List 4387:16771: brand header and start-aligned cells. The 8px inline padding
   (Figma 12px) keeps CH and BASE readable in their Figma column widths. */
.etch-condition__grid :deep(revo-grid) {
  --revo-grid-header-height: 40px;
  --revo-grid-font-family: var(--font-family-default);
  --revo-grid-font-size: var(--size-14px);
}
.etch-condition__grid :deep(.rgHeaderCell) {
  box-sizing: border-box;
  padding: 0 var(--spacing-space-1);
  border-inline-end: 1px solid var(--border-border-secondary);
  background: var(--background-background-brand);
  color: var(--text-text-reversed);
  font-weight: var(--weight-font-bold);
}
.etch-condition__grid :deep(.rgHeaderCell .header-content) {
  text-align: start;
}
.etch-condition__grid :deep(.rgCell) {
  box-sizing: border-box;
  padding: 0 var(--spacing-space-1);
  border-inline-end: 1px solid var(--border-border-primary);
  border-block-end: 1px solid var(--border-border-primary);
  color: var(--text-text-primary);
  text-align: start;
}
.etch-condition__grid :deep(.etch-condition__cell--continuity) {
  background: var(--background-background-hover);
}
.etch-condition__grid :deep(.etch-condition__cell--possible) {
  background: var(--background-background-success-opacity-20);
}
.etch-condition__grid :deep(.etch-condition__cell--impossible) {
  background: var(--background-background-error-opacity-20);
}
.etch-condition__message {
  margin: 0;
  white-space: pre-line;
}
</style>
