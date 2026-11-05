<template>
  <BaseScreen title="SHELF 입고" class="shelf-incoming">
    <section class="ds-screen__card shelf-incoming__product-info" aria-label="SHELF 및 LOT 조회">
      <div class="shelf-incoming__search">
        <BaseInput
          ref="shelfInput"
          class="shelf-incoming__field"
          :model-value="shelfId"
          label="SHELF"
          placeholder="Search"
          :disabled="loading"
          @update:model-value="shelfId = String($event ?? '').toUpperCase()"
          @keydown.enter.prevent="searchData('shelf')"
        >
          <template #suffix><QIcon name="sym_o_search" aria-hidden="true" /></template>
        </BaseInput>
        <BaseButton
          variant="secondary"
          :disabled="loading"
          @click="searchShelfInfo()"
          >조회</BaseButton
        >
      </div>
      <div class="shelf-incoming__search">
        <BaseInput
          ref="lotInput"
          class="shelf-incoming__field"
          :model-value="lotId"
          label="LOT No."
          placeholder="Search"
          :disabled="loading"
          @update:model-value="lotId = String($event ?? '').toUpperCase()"
          @keydown.enter.prevent="searchData('lot')"
        >
          <template #suffix><QIcon name="sym_o_search" aria-hidden="true" /></template>
        </BaseInput>
        <BaseButton
          variant="secondary"
          :disabled="loading"
          @click="setLotInfo()"
          >조회</BaseButton
        >
        <BaseButton
          variant="secondary"
          aria-label="선택 LOT 삭제"
          :disabled="loading"
          @click="deleteLotId"
          >D</BaseButton
        >
      </div>
      <div
        v-if="productSpecName || operationName || operationDesc"
        class="shelf-incoming__summary"
        aria-label="LOT 정보"
      >
        <output :title="productSpecName">{{ productSpecName }}</output
        ><output :title="operationName">{{ operationName }}</output
        ><output :title="operationDesc">{{ operationDesc }}</output>
      </div>
    </section>
    <section
      class="ds-screen__card shelf-incoming__grid"
      aria-label="LOT 목록"
      :aria-busy="loading"
      ref="gridContainer"
    >
      <BaseRevoGrid
        v-if="hasLots"
        :rows="rows"
        :columns="columns"
        row-key="id"
        :row-size="40"
        :resize="false"
        :filter="false"
        :readonly="true"
        :stretch="true"
        accessible-label="LOT 위치"
      />
      <BaseEmptyState v-else icon-variant="filled" />
    </section>
    <section class="shelf-incoming__commands" aria-label="SHELF 및 CART 작업">
      <BaseButton
        v-for="command in commands"
        :key="command"
        variant="tertiary"
        size="small"
        :disabled="loading || category !== (command.startsWith('SHELF') ? 'S' : 'C')"
        @click="execute(command)"
        >{{ command }}</BaseButton
      >
    </section>
    <template #footer
      ><BaseButton variant="tertiary" size="medium" block :disabled="loading" @click="closePage"
        >닫기</BaseButton
      ></template
    >
    <BaseModal
      :open="Boolean(dialog)"
      :title="dialog?.title"
      :overlay-closable="false"
      @update:open="!$event && closeDialog()"
      @after-close="afterDialogClose"
    >
      <p class="shelf-incoming__message">{{ dialog?.message }}</p>
      <template #footer
        ><BaseButton variant="primary" @click="closeDialog">확인</BaseButton></template
      >
    </BaseModal>
  </BaseScreen>
</template>

<script setup lang="ts">
import { VGridVueTemplate } from '@revolist/vue3-datagrid';
import { QIcon } from 'quasar';
import {
  BaseButton,
  BaseEmptyState,
  BaseInput,
  BaseModal,
  BaseRevoGrid,
  BaseScreen,
} from 'src/components/base';
import type { BaseRevoGridColumn } from 'src/components/base/revo-grid';
import { ROUTE } from 'src/constants/routes';
import { useMainStore } from 'src/features/main/stores/main.store';
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { ShelfIncomingGridCell } from '../components/ShelfIncomingGridCell';
import { useShelfIncoming } from '../composables/use-shelf-incoming';

const router = useRouter();
const mainStore = useMainStore();
const gridContainer = ref<HTMLElement>();
const gridWidth = ref(300);
let gridResizeObserver: ResizeObserver | undefined;
const shelfInput = ref<InstanceType<typeof BaseInput>>();
const lotInput = ref<InstanceType<typeof BaseInput>>();
async function focus(field: 'shelf' | 'lot') {
  await nextTick();
  const input = field === 'shelf' ? shelfInput.value : lotInput.value;
  input?.focus();
  input?.select();
}
const {
  shelfId,
  lotId,
  category,
  selected,
  productSpecName,
  operationName,
  operationDesc,
  loading,
  dialog,
  rows,
  hasLots,
  closeDialog,
  afterDialogClose,
  searchShelfInfo,
  setLotInfo,
  toggleCell,
  deleteLotId,
  execute,
  searchData,
} = useShelfIncoming({
  device: mainStore,
  facility: mainStore.facility,
  operatorId: mainStore.operatorId,
  focus: (field) => {
    void focus(field);
  },
});
const commands = ['SHELF IN', 'CART IN', 'SHELF OUT', 'CART OUT'] as const;
const cellTemplate = VGridVueTemplate(ShelfIncomingGridCell, {
  selected,
  loading,
  onToggle: toggleCell,
});
const columns = computed<BaseRevoGridColumn[]>(() =>
  (['c0', 'c1', 'c2'] as const).map((field) => ({
    prop: field,
    name: '',
    size: Math.floor((gridWidth.value - 3) / 3),
    cellTemplate,
  })),
);
function closePage() {
  if (router.options.history.state.back) router.back();
  else void router.replace({ path: `/${ROUTE.esheet}` });
}
onMounted(() => {
  if (gridContainer.value && typeof ResizeObserver !== 'undefined') {
    gridResizeObserver = new ResizeObserver(([entry]) => {
      if (entry) gridWidth.value = Math.floor(entry.contentRect.width);
    });
    gridResizeObserver.observe(gridContainer.value);
  }
  void focus('shelf');
});
onBeforeUnmount(() => gridResizeObserver?.disconnect());
</script>

<style scoped>
.shelf-incoming {
  width: 100%;
  min-height: max(720px, 100dvh);
  height: max(720px, 100dvh);
}
.shelf-incoming__search {
  display: flex;
  width: 100%;
  align-items: flex-end;
  gap: var(--spacing-space-1, 8px);
}
/* Figma 4116:11668 keeps a 4px inset above the footer, which BaseScreen does not have. */
.shelf-incoming :deep(.ds-screen__content) {
  padding-bottom: var(--spacing-space-0);
}
/* Figma draws the 1px stroke inside the 8px padding: the search card is 88px tall. */
.shelf-incoming__product-info {
  padding: calc(var(--spacing-space-1, 8px) - var(--ds-border-width-sm, 1px));
}
/* SHELF / LOT No. sit in a 65px label column; 조회 and D hug their labels. */
.shelf-incoming__search .shelf-incoming__field {
  --ds-field-label-width: 65px;

  flex: 1;
  min-width: 0;
}
.shelf-incoming__search > :deep(.ds-btn) {
  flex: 0 0 auto;
}
.shelf-incoming__summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--spacing-space-1, 8px);
  width: 100%;
  font-size: var(--size-12px, 12px);
}
.shelf-incoming__summary output {
  overflow: auto;
  white-space: nowrap;
}
.shelf-incoming__grid {
  flex: 1;
  min-height: 0;
  justify-content: center;
  align-items: stretch;
}
.shelf-incoming__grid :deep(.base-revo-grid) {
  width: 100%;
  flex: 1;
  min-height: 0;
}
.shelf-incoming__grid :deep(revogr-header) {
  display: none;
}
.shelf-incoming__grid :deep(.rgCell) {
  padding: 0;
}
.shelf-incoming__grid :deep(.ds-empty-state) {
  align-self: center;
  width: 100%;
}
.shelf-incoming__grid :deep(.ds-empty-state__message) {
  width: auto;
  max-width: 100%;
  height: auto;
}
.shelf-incoming__grid :deep(.shelf-incoming__cell) {
  width: 100%;
  min-height: 32px;
  font-size: var(--size-12px, 12px);
  overflow-wrap: anywhere;
  --ds-btn-padding-x: 0;
  --ds-btn-padding-y: var(--spacing-space-1, 8px);
}
.shelf-incoming__grid :deep(.shelf-incoming__cell--selected) {
  background: var(--background-background-brand);
  color: var(--text-text-reversed);
}
/*
 * SHELF IN / CART IN / SHELF OUT / CART OUT: a 2-column grid across the content width (BaseScreen
 * aligns its children to the start, so the section sets its own width). Figma draws them 36px tall.
 */
.shelf-incoming__commands {
  display: grid;
  width: 100%;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--spacing-space-1, 8px);
}
.shelf-incoming__commands > .ds-btn {
  --ds-btn-height: var(--component-button-height-md);
}
.shelf-incoming__message {
  white-space: pre-line;
}
</style>
