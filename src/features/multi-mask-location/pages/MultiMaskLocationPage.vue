<template>
  <BaseScreen
    title="복수 MASK 위치 지정"
    class="multi-mask-location"
    ok-label="확인"
    cancel-label="취소"
    :ok-loading="saving"
    :ok-disabled="scanning"
    @ok="changeLocations"
    @cancel="closePage"
  >
    <section class="ds-screen__card multi-mask-location__card" aria-label="MASK TAG 스캔">
      <div class="ds-screen__card-row multi-mask-location__scan">
        <BaseInput
          ref="maskTagInput"
          :model-value="maskTag"
          class="multi-mask-location__field"
          label="MASK TAG"
          autocomplete="off"
          autocapitalize="characters"
          :loading="scanning"
          @update:model-value="maskTag = String($event ?? '').toUpperCase()"
          @keydown.enter.prevent="scanMask"
        />
        <!-- Android btn_clear; the Figma frame has no List Clear control. -->
        <BaseButton
          class="multi-mask-location__clear"
          variant="secondary"
          size="small"
          :disabled="busy"
          @click="clearList"
          >List Clear</BaseButton
        >
      </div>
    </section>

    <section
      class="ds-screen__card multi-mask-location__card multi-mask-location__grid"
      aria-label="MASK 목록"
      :aria-busy="scanning || saving"
    >
      <BaseRevoGrid
        v-if="rows.length"
        :rows="rows"
        :columns="columns"
        row-key="id"
        :row-size="40"
        :resize="false"
        :filter="false"
        :readonly="true"
        accessible-label="MASK 목록"
      />
      <BaseEmptyState v-else icon-variant="filled" />
    </section>

    <section
      class="ds-screen__card multi-mask-location__card multi-mask-location__choices"
      aria-label="층 및 사용여부"
    >
      <div class="multi-mask-location__pair">
        <BaseDropdownList
          :model-value="floor || undefined"
          class="multi-mask-location__field"
          label="층"
          :options="floorOptions"
          :disabled="busy"
          @update:model-value="selectFloor(String($event ?? ''))"
        />
        <!-- Android shows this spinner but never sends its value. -->
        <BaseDropdownList
          :model-value="useable || undefined"
          class="multi-mask-location__field"
          label="사용여부"
          :options="useableOptions"
          :disabled="busy"
          @update:model-value="useable = String($event ?? '')"
        />
      </div>
    </section>

    <section
      class="ds-screen__card multi-mask-location__card multi-mask-location__choices"
      aria-label="상태"
    >
      <BaseDropdownList
        :model-value="status || undefined"
        class="multi-mask-location__field"
        label="상태"
        :options="toOptions(statusOptions)"
        :loading="loadingOptions"
        :disabled="busy"
        @update:model-value="selectStatus(String($event ?? ''))"
      />
    </section>

    <section
      class="ds-screen__card multi-mask-location__card multi-mask-location__choices"
      aria-label="위치"
    >
      <div class="multi-mask-location__pair multi-mask-location__pair--bottom">
        <BaseDropdownList
          :model-value="location || undefined"
          class="multi-mask-location__field"
          label="위치"
          :options="toOptions(locationOptions)"
          :disabled="busy"
          @update:model-value="selectLocation(String($event ?? ''))"
        />
        <BaseDropdownList
          :model-value="detailLocation || undefined"
          class="multi-mask-location__field"
          aria-label="상세위치"
          :options="toOptions(detailLocationOptions)"
          :disabled="busy"
          @update:model-value="detailLocation = String($event ?? '')"
        />
      </div>
    </section>

    <BaseModal
      :open="Boolean(activeDialog)"
      :title="activeDialog?.title"
      :closable="false"
      :overlay-closable="false"
      @update:open="!$event && closeDialog()"
    >
      <p class="multi-mask-location__message" role="alert">{{ activeDialog?.message }}</p>
      <template #footer
        ><BaseButton variant="primary" @click="closeDialog">확인</BaseButton></template
      >
    </BaseModal>
  </BaseScreen>
</template>

<script setup lang="ts">
import {
  BaseButton,
  BaseDropdownList,
  BaseEmptyState,
  BaseInput,
  BaseModal,
  type BaseOption,
  BaseRevoGrid,
  BaseScreen,
} from 'src/components/base';
import type { BaseRevoGridColumn } from 'src/components/base/revo-grid';
import { ROUTE } from 'src/constants/routes';
import { useMainStore } from 'src/features/main/stores/main.store';
import { nextTick, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import {
  MULTI_MASK_FLOORS,
  MULTI_MASK_USEABLE,
  useMultiMaskLocation,
} from '../composables/use-multi-mask-location';

const router = useRouter();
const mainStore = useMainStore();
const maskTagInput = ref<InstanceType<typeof BaseInput>>();

function focusMaskTag(): void {
  void nextTick(() => {
    maskTagInput.value?.focus();
    maskTagInput.value?.select();
  });
}

const {
  maskTag,
  rows,
  floor,
  useable,
  status,
  location,
  detailLocation,
  statusOptions,
  locationOptions,
  detailLocationOptions,
  scanning,
  saving,
  loadingOptions,
  busy,
  activeDialog,
  closeDialog,
  loadStatuses,
  selectFloor,
  selectStatus,
  selectLocation,
  scanMask,
  clearList,
  changeLocations,
} = useMultiMaskLocation({
  facility: () => mainStore.facility,
  operatorId: () => mainStore.operatorId,
  focusMaskTag,
});

function toOptions(values: readonly string[]): BaseOption[] {
  return values.map((value) => ({ label: value, value }));
}

const floorOptions = toOptions(MULTI_MASK_FLOORS);
const useableOptions = toOptions(MULTI_MASK_USEABLE);

// Column order and captions of the Android grid (setMaskInfo slotcol).
const columns: BaseRevoGridColumn[] = [
  { prop: 'MASKTAG', name: 'MASK TAG', size: 120 },
  { prop: 'ISUSE', name: '사용여부', size: 80 },
  { prop: 'STATUS', name: '상태', size: 100 },
  { prop: 'CURRLOC', name: '현재위치', size: 120 },
  { prop: 'PRODUCT', name: 'PRODUCT', size: 120 },
  { prop: 'MASKID', name: 'MASKID', size: 120 },
];

function closePage(): void {
  if (router.options.history.state.back) router.back();
  else void router.replace({ path: `/${ROUTE.main}` });
}

onMounted(() => {
  focusMaskTag();
  void loadStatuses();
});
</script>

<style scoped>
.multi-mask-location {
  width: 100%;
}
.multi-mask-location__field {
  flex: 1 1 0;
  width: 100%;
  min-width: 0;
}
.multi-mask-location__scan {
  width: 100%;
}
.multi-mask-location__clear {
  flex: 0 0 auto;
}
/* The list takes the height left by the other cards (352px in the 360x720 Figma frame). */
.multi-mask-location__grid.ds-screen__card {
  flex: 1 1 0;
  min-height: calc(4 * var(--height-40px));
  justify-content: center;
  align-items: stretch;
}
.multi-mask-location__grid :deep(.base-revo-grid) {
  flex: 1;
  width: 100%;
  min-height: 0;
}
.multi-mask-location__grid :deep(.ds-empty-state) {
  align-self: center;
  width: 100%;
}
.multi-mask-location__grid :deep(.ds-empty-state__message) {
  width: auto;
  max-width: 100%;
  height: auto;
}
/* Figma 4185:42827: the 층 / 사용여부 / 상태 / 위치 labels hug their text (MASK TAG keeps 80px). */
.multi-mask-location__choices .ds-dropdown-list {
  --ds-field-label-width: max-content;
}
.multi-mask-location__pair {
  display: flex;
  width: 100%;
  gap: 10px;
}
.multi-mask-location__pair--bottom {
  align-items: flex-end;
}
.multi-mask-location__message {
  margin: 0;
  white-space: pre-line;
}
</style>
