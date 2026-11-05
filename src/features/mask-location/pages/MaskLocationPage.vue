<template>
  <BaseScreen
    title="MASK 위치 지정"
    ok-label="확인"
    class="mask-location"
    :ok-disabled="!ready || !maskLoaded || loading"
    :ok-loading="loading"
    cancel-label="취소 "
    :cancel-disabled="loading"
    @ok="changeMaskLoc"
    @cancel="closePage"
  >
    <div class="mask-location__form">
      <section
        class="ds-screen__card mask-location__card"
        aria-label="MASK 정보"
        :aria-busy="loading"
      >
        <BaseInput
          ref="maskInput"
          v-model="maskTag"
          label="MASK TAG"
          :disabled="!ready || loading"
          @keydown.enter.prevent="setMaskInfo"
          @focus="selectMask"
          @dblclick="selectMask"
        />
        <BaseInput :model-value="inspection" label="검사" readonly />
        <div class="mask-location__row">
          <BaseInput
            ref="locationInput"
            v-model="location"
            label="위치"
            :disabled="!ready || loading"
            @keydown.enter.prevent="readLocation"
          />
          <BaseInput
            :model-value="machine"
            aria-label="의뢰장비"
            :disabled="!ready || loading"
            @update:model-value="machine = String($event ?? '').toUpperCase()"
            @keydown.enter.prevent="finishMachineInput"
          />
        </div>
      </section>
      <section class="ds-screen__card mask-location__card" aria-label="PELLICLE 및 PSM">
        <BaseInput :model-value="pellicle" label="PELLICLE" readonly />
        <BaseInput :model-value="psm" label="PSM" readonly />
        <BaseCheckbox
          :model-value="manual"
          label="위치수동지정"
          :disabled="!maskLoaded || loading"
          @update:model-value="manualLocationCombo"
        />
      </section>
      <section class="ds-screen__card mask-location__card" aria-label="위치수동지정">
        <div class="mask-location__row mask-location__row--selection">
          <BaseDropdownList
            :model-value="floor"
            :options="floorOptions"
            label="층"
            :disabled="!manual || loading"
            @update:model-value="changeFloor(selection($event))"
          />
          <BaseDropdownList
            :model-value="selectedStatus"
            :options="statusOptions"
            label="상태"
            :disabled="!manual || loading"
            @update:model-value="changeStatus(selection($event))"
          />
        </div>
        <BaseDropdownList
          :model-value="locGroup"
          :options="locGroupOptions"
          label="현재위치"
          :disabled="!manual || loading"
          @update:model-value="changeLocGroup(selection($event))"
        />
        <BaseDropdownList
          :model-value="detailLocation"
          :options="detailOptions"
          label="상세위치"
          :disabled="!manual || loading"
          @update:model-value="changeDetailLocation(selection($event))"
        />
      </section>
      <section class="ds-screen__card mask-location__card" aria-label="MASK 진행정보">
        <BaseInput :model-value="shelf" label="최근SHELF" readonly />
        <BaseInput :model-value="product" label="제품명" readonly />
        <div class="mask-location__row">
          <BaseInput :model-value="status" label="진행상태" readonly />
          <BaseInput :model-value="useYn" aria-label="사용가능 여부" readonly />
        </div>
        <BaseInput :model-value="currentLocation" label="현위치" readonly />
      </section>
    </div>
    <BaseModal :open="loading" :closable="false" :overlay-closable="false" :width="160">
      <div class="mask-location__loading" role="status" aria-label="처리중">
        <BaseLoading size="large" />
      </div>
    </BaseModal>
    <BaseModal
      :open="Boolean(dialog)"
      :title="dialog?.title"
      :overlay-closable="false"
      back-closable
      @update:open="!$event && closeDialog()"
      @after-close="afterDialogClose"
    >
      <p class="mask-location__message">{{ dialog?.message }}</p>
      <template #footer><BaseButton @click="closeDialog">확인</BaseButton></template>
    </BaseModal>
  </BaseScreen>
</template>

<script setup lang="ts">
import {
  BaseButton,
  BaseCheckbox,
  BaseDropdownList,
  BaseInput,
  BaseLoading,
  BaseModal,
  BaseScreen,
} from 'src/components/base';
import type { BaseDropdownValue } from 'src/components/base/dropdown-list/base-dropdown-list.types';
import { ROUTE } from 'src/constants/routes';
import { useMainStore } from 'src/features/main/stores/main.store';
import { nextTick, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { useMaskLocation } from '../composables/use-mask-location';
import type { MaskFocus } from '../types/mask-location.types';

const router = useRouter();
const device = useMainStore();
const ready = ref(false);
let pendingFocus: MaskFocus | undefined;
const maskInput = ref<InstanceType<typeof BaseInput>>();
const locationInput = ref<InstanceType<typeof BaseInput>>();
async function focus(field: MaskFocus) {
  if (dialog.value) {
    pendingFocus = field;
    return;
  }
  await nextTick();
  const input = field === 'mask' ? maskInput.value : locationInput.value;
  input?.focus();
  if (field === 'mask') input?.select();
}
function afterDialogClose() {
  const field = pendingFocus;
  pendingFocus = undefined;
  if (field) void focus(field);
}
function selectMask() {
  maskInput.value?.select();
}
function finishMachineInput(event: KeyboardEvent) {
  (event.target as HTMLInputElement).blur();
}
function selection(value: BaseDropdownValue) {
  return typeof value === 'string' ? value : undefined;
}
const {
  maskTag,
  location,
  machine,
  shelf,
  product,
  status,
  useYn,
  currentLocation,
  pellicle,
  psm,
  inspection,
  manual,
  maskLoaded,
  loading,
  dialog,
  floor,
  selectedStatus,
  locGroup,
  detailLocation,
  floorOptions,
  statusOptions,
  locGroupOptions,
  detailOptions,
  setMaskInfo,
  readLocation,
  manualLocationCombo,
  changeFloor,
  changeStatus,
  changeLocGroup,
  changeDetailLocation,
  changeMaskLoc,
  closeDialog,
} = useMaskLocation({
  device,
  focus: (field) => {
    void focus(field);
  },
});
function closePage() {
  if (loading.value) return;
  if (router.options.history.state.back) router.back();
  else void router.replace({ path: `/${ROUTE.main}` });
}
const removeRouteGuard = router.beforeEach((_to, from) => {
  if (from.path !== `/${ROUTE.maskLocation}`) return;
  if (loading.value) return false;
  if (dialog.value) {
    closeDialog();
    return false;
  }
});
onUnmounted(removeRouteGuard);
onMounted(async () => {
  try {
    if (!device.isSettingReady || !device.mobileServerName) await device.initMain();
    ready.value = true;
    await focus('mask');
  } catch (error) {
    dialog.value = {
      title: '에  러',
      message: error instanceof Error ? error.message : String(error),
    };
  }
});
</script>

<style scoped>
.mask-location {
  min-height: 0;
  overflow: hidden;
}
/* Keep a bottom inset when the form scrolls; other insets come from BaseScreen. */
.mask-location :deep(.ds-screen__content) {
  overscroll-behavior: contain;
}
/* The design uses 36px actions; BaseScreen's default large buttons are 40px. */
.mask-location :deep(.ds-screen__actions .ds-btn) {
  flex-shrink: 0;
  min-width: max-content;
}
.mask-location__form {
  display: flex;
  flex: none;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  min-width: 0;
  /* Preserve the agreed minimum form height; cards size to their content. */
  min-height: 564px;
}
.mask-location__row {
  display: grid;
  flex: none;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: center;
  gap: 8px;
  width: 100%;
}
.mask-location__row--selection {
  gap: 10px;
}
.mask-location__card :deep(.ds-field) {
  flex-shrink: 0;
}

/* Standard fields use the base 65px label column; floor/status hug their text. */
.mask-location__row--selection :deep(.ds-field--horizontal:has(> .ds-field__header)) {
  --ds-field-label-width: max-content;
}
.mask-location__card :deep(.ds-checkbox__control) {
  gap: 8px;
  min-height: 20px;
  line-height: var(--line-height-20px);
}
.mask-location__card :deep(.ds-checkbox__control .q-checkbox__inner) {
  width: 16px;
  min-width: 16px;
  height: 16px;
}
.mask-location__card :deep(.ds-checkbox__control .q-checkbox__bg) {
  inset: 0;
  width: 100%;
  height: 100%;
}
.mask-location__card :deep(.ds-checkbox__label) {
  font-size: var(--font-size-13px);
  line-height: var(--line-height-20px);
}
.mask-location__message {
  white-space: pre-line;
}
.mask-location__loading {
  display: flex;
  justify-content: center;
  padding: var(--spacing-space-3, 16px);
}
</style>
