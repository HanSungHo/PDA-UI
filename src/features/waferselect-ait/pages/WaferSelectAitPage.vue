<template>
  <BaseScreen class="waferselect-ait" title="WAFER 선택">
    <div class="waferselect-ait__form">
      <section class="waferselect-ait__card waferselect-ait__lot" aria-label="LOT No.">
        <BaseInput
          :model-value="lotNo"
          label="LOT No."
          uppercase
          :disabled="!editable"
          @update:model-value="lotNo = String($event ?? '')"
        />
        <BaseButton
          data-testid="select-all"
          class="waferselect-ait__select-all"
          :class="{ 'waferselect-ait__select-all--hidden': !editable }"
          :aria-hidden="!editable || undefined"
          :disabled="!editable"
          variant="secondary"
          size="small"
          @click="onSingleClick(selectAll)"
          >전체선택</BaseButton
        >
      </section>

      <section class="waferselect-ait__card waferselect-ait__grid" aria-label="WAFER">
        <BaseButton
          v-for="(slot, index) in slots"
          :key="slot.slotNo"
          class="waferselect-ait__slot"
          :class="{ 'waferselect-ait__slot--view-only': !editable }"
          :variant="slot.selected ? 'primary' : 'tertiary'"
          :disabled="slot.disabled || !editable"
          :aria-pressed="slot.selected"
          :aria-label="slot.waferName || slot.slotNo"
          @click="toggleWafer(index)"
          >{{ slot.waferName ? slot.slotNo : '' }}</BaseButton
        >
      </section>

      <section class="waferselect-ait__card waferselect-ait__result-row" aria-label="WAFER 선택">
        <div
          class="waferselect-ait__result"
          data-testid="wafer-result"
          tabindex="0"
          role="region"
          aria-label="선택 WAFER"
          aria-live="polite"
        >
          {{ selectedWaferList }}
        </div>
        <BaseButton
          v-if="editable"
          data-testid="reset-wafer"
          variant="secondary"
          size="small"
          @click="onSingleClick(resetWafer)"
          >정정</BaseButton
        >
      </section>
    </div>

    <BaseModal
      :open="Boolean(error)"
      :overlay-closable="false"
      back-closable
      @update:open="!$event && (error = '')"
      @after-close="continuePreselection"
    >
      <template #title
        ><span class="waferselect-ait__error-title">{{ '에  러' }}</span></template
      >
      <p class="waferselect-ait__error">{{ error }}</p>
      <template #footer><BaseButton @click="error = ''">확인</BaseButton></template>
    </BaseModal>

    <template #footer>
      <BaseButton v-if="editable" data-testid="confirm" @click="onSingleClick(confirm)"
        >확인</BaseButton
      >
      <BaseButton data-testid="cancel" variant="tertiary" @click="onSingleClick(cancel)"
        >취소</BaseButton
      >
    </template>
  </BaseScreen>
</template>

<script setup lang="ts">
import { BaseButton, BaseInput, BaseModal, BaseScreen } from 'src/components/base';
import { ROUTE } from 'src/constants/routes';
import { onBeforeRouteLeave, useRouter } from 'vue-router';

import { useWaferSelectAit } from '../composables/use-waferselect-ait';
import { useWaferSelectAitStore } from '../stores/waferselect-ait.store';
import type { WaferSelectAitInput, WaferSelectAitResult } from '../types/waferselect-ait.types';

const props = defineProps<{ input?: WaferSelectAitInput }>();
const emit = defineEmits<{
  select: [result: WaferSelectAitResult];
  cancel: [];
}>();
const router = useRouter();
const store = useWaferSelectAitStore();
const input: WaferSelectAitInput = props.input ?? store.input ?? {};
const {
  lotNo,
  editable,
  slots,
  selectedWaferList,
  error,
  continuePreselection,
  toggleWafer,
  selectAll,
  resetWafer,
  sendWaferList,
} = useWaferSelectAit(input);
let confirmed = false;
let lastClickTime = 0;

function onSingleClick(action: () => void): void {
  const now = Date.now();
  if (now - lastClickTime <= 1000) return;
  action();
  lastClickTime = now;
}

function closePage(): void {
  if (props.input) return;
  if (router.options.history.state.back) router.back();
  else void router.replace(`/${ROUTE.main}`);
}

function confirm(): void {
  if (!editable || confirmed) return;
  const result = sendWaferList();
  confirmed = true;
  if (!props.input) store.complete(result);
  emit('select', result);
  closePage();
}

function cancel(): void {
  if (!props.input) store.cancel();
  emit('cancel');
  closePage();
}

onBeforeRouteLeave(() => {
  if (error.value) {
    error.value = '';
    return false;
  }
  if (!props.input && !confirmed) store.cancel();
});
</script>

<style scoped src="../styles/waferselect-ait.css"></style>
