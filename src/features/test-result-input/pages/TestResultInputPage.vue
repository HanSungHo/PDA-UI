<template>
  <BaseScreen
    class="test-result-input"
    title="검사 결과 입력"
    ok-label="검사결과입력"
    cancel-label="취소"
    :ok-disabled="!ready || !maskLoaded || loading"
    :ok-loading="loading"
    :cancel-disabled="loading"
    @ok="submit"
    @cancel="closePage"
  >
    <section class="ds-screen__card test-result-input__card" aria-label="MASK 정보">
      <BaseInput
        ref="maskInput"
        :model-value="maskTag"
        label="Mask Tag"
        :disabled="!ready || maskLoaded || loading"
        @update:model-value="maskTag = String($event ?? '').toUpperCase()"
        @keydown.enter.prevent="getMaskInfo"
      />
      <BaseInput :model-value="pellicle" label="PELLICLE" readonly />
    </section>

    <section
      class="ds-screen__card test-result-input__card test-result-input__card--inspection"
      aria-label="검사 정보"
    >
      <BaseInput :model-value="testDay" label="검사일자" readonly />
      <BaseDropdownList
        :model-value="eqpId"
        :options="eqpOptions"
        label="장비"
        @popup-show="resetSelection('eqpId')"
        @update:model-value="eqpId = selection($event)"
      />
      <BaseDropdownList
        :model-value="inspType"
        :options="inspTypeOptions"
        label="검사구분"
        @popup-show="resetSelection('inspType')"
        @update:model-value="inspType = selection($event)"
      />
      <BaseDropdownList
        :model-value="inspResult"
        :options="inspResultOptions"
        label="검사결과"
        @popup-show="resetSelection('inspResult')"
        @update:model-value="inspResult = selection($event)"
      />
      <BaseDropdownList
        :model-value="inspType2"
        :options="inspType2Options"
        label="검사내용"
        @popup-show="resetSelection('inspType2')"
        @update:model-value="inspType2 = selection($event)"
      />
      <BaseInput
        :model-value="serialNo"
        label="SERIAL No"
        type="text"
        inputmode="numeric"
        @input.capture="filterSerialInput"
        @update:model-value="serialNo = String($event ?? '').replace(/[^0-9]/g, '')"
      />
    </section>

    <section class="ds-screen__card test-result-input__card" aria-label="검사 내용 및 HOLD 사유">
      <BaseInput v-model="inspText" label="검사내용" />
      <BaseInput v-model="holdText" label="HOLD 사유" />
    </section>

    <BaseModal :open="loading" :closable="false" :overlay-closable="false" :width="160">
      <div class="test-result-input__loading" role="status" aria-label="처리중">
        <BaseLoading size="large" />
      </div>
    </BaseModal>
    <BaseModal
      :open="Boolean(dialog)"
      :title="dialog?.title"
      :overlay-closable="false"
      back-closable
      @update:open="!$event && closeDialog()"
    >
      <p class="test-result-input__message">{{ dialog?.message }}</p>
      <template #footer><BaseButton @click="closeDialog">확인</BaseButton></template>
    </BaseModal>
  </BaseScreen>
</template>

<script setup lang="ts">
import {
  BaseButton,
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

import { useTestResultInput } from '../composables/use-test-result-input';

const router = useRouter();
const device = useMainStore();
const ready = ref(false);
const maskInput = ref<InstanceType<typeof BaseInput>>();
async function focusMask() {
  await nextTick();
  maskInput.value?.focus();
  maskInput.value?.select();
}

const {
  maskTag,
  pellicle,
  testDay,
  serialNo,
  eqpId,
  inspType,
  inspType2,
  inspResult,
  eqpOptions,
  inspTypeOptions,
  inspType2Options,
  inspResultOptions,
  inspText,
  holdText,
  maskLoaded,
  loading,
  dialog,
  getMaskInfo,
  resetSelection,
  submit,
  closeDialog,
} = useTestResultInput({
  device,
  focus: () => focusMask(),
});

function selection(value: BaseDropdownValue): string | undefined {
  return typeof value === 'string' ? value : undefined;
}
function filterSerialInput(value: unknown, event?: Event): void {
  const input = (value instanceof Event ? value : event)?.target;
  if (input instanceof HTMLInputElement) input.value = input.value.replace(/[^0-9]/g, '');
}
function closePage() {
  if (loading.value) return;
  if (router.options.history.state.back) router.back();
  else void router.replace({ path: `/${ROUTE.main}` });
}
const removeRouteGuard = router.beforeEach((_to, from) => {
  if (from.path !== `/${ROUTE.testResultInput}`) return;
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
    await focusMask();
  } catch (error) {
    dialog.value = {
      title: '에  러',
      message: error instanceof Error ? error.message : String(error),
    };
  }
});
</script>

<style scoped>
.test-result-input {
  min-height: 0;
  overflow: hidden;
}
.test-result-input :deep(.ds-screen__content) {
  padding-bottom: 4px;
  overscroll-behavior-y: contain;
}
.test-result-input :deep(.ds-screen__actions) {
  flex-wrap: wrap;
}
.test-result-input :deep(.ds-screen__actions .ds-btn) {
  flex-shrink: 0;
  min-width: max-content;
  --ds-btn-height: var(--component-button-height-md);
  --ds-btn-font-size: var(--typography-size-14px);
  --ds-btn-line-height: var(--typography-height-20px);
}
.test-result-input__card {
  flex: none;
  align-items: stretch;
  padding: 7px;
}
.test-result-input__card--inspection {
  min-height: 250px;
}
.test-result-input__card :deep(.ds-field--horizontal) {
  --ds-field-label-width: 65px;
}
.test-result-input__card > :deep(.ds-field--horizontal) {
  flex: none;
}
.test-result-input__card :deep(.ds-input--readonly) {
  --ds-input-focus-border-color: var(--ds-input-control-border);
}
.test-result-input__message {
  margin: 0;
  white-space: pre-line;
}
.test-result-input__loading {
  display: flex;
  justify-content: center;
  padding: 12px;
}
</style>
