<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import BaseButton from '~/components/base/button/BaseButton.vue';
import BaseCheckbox from '~/components/base/checkbox/BaseCheckbox.vue';
import BaseModal from '~/components/base/modal/BaseModal.vue';

import type { WaferSelectPayload } from '../types/split.types';
import { SPLIT_MESSAGES } from '../types/split.types';

/**
 * Replaces WaferSelectActivity (view/cmm/WaferSelectActivity.kt) for the generic,
 * non-editable-lot-id wafer-picker flow used by Split (no CATEGORY/EDITABLE extras).
 * Input  = extras: LOTID, FIXEDCOUNT, EXISTWAFERLIST, DISABLEWAFERLIST, SELECTWAFERLIST
 * Output = SELECTEDWAFERLIST (emit confirm)
 *
 * Ported from WaferAdapter.kt + SelectWafer.kt:
 *  - a wafer listed in disableWaferList (already assigned to another row) is permanently disabled
 *  - wafers in selectWaferList start pre-checked (current row's existing selection)
 *  - at most fixedCount wafers may be selected; attempting to exceed it shows the same
 *    "선택한 WAFER개수가 지정된 개수를 초과하였습니다." error the Android adapter shows,
 *    instead of silently disabling the remaining checkboxes
 */
const props = defineProps<{
  open: boolean;
  payload: WaferSelectPayload | null;
}>();

const emit = defineEmits<{
  confirm: [wafers: string[]];
  cancel: [];
}>();

const selected = ref<string[]>([]);
const overflowError = ref(false);

watch(
  () => [props.open, props.payload] as const,
  ([open, payload]) => {
    if (open && payload) selected.value = [...payload.selectWaferList];
    overflowError.value = false;
  },
  { immediate: true },
);

const maxCount = computed(() => props.payload?.fixedCount ?? 0);

/** disableList.contains(waferName) in WaferAdapter — exact match here since our wafer tokens are discrete */
function isDisabled(wafer: string): boolean {
  return props.payload?.disableWaferList.includes(wafer) ?? true;
}

function toggle(wafer: string, checked: boolean): void {
  if (checked) {
    if (selected.value.includes(wafer)) return;
    if (selected.value.length >= maxCount.value) {
      overflowError.value = true;
      return;
    }
    selected.value.push(wafer);
  } else {
    selected.value = selected.value.filter((w) => w !== wafer);
  }
}

/** keeps the parent LOT's wafer order when returning the selection */
function onConfirm(): void {
  const order = props.payload?.existWaferList ?? [];
  emit(
    'confirm',
    order.filter((w) => selected.value.includes(w)),
  );
}
</script>

<template>
  <BaseModal :open="open" title="Wafer">
    <p class="wafer-dialog__summary">
      {{ payload?.lotId }} — {{ selected.length }} / {{ maxCount }}
    </p>

    <div class="wafer-dialog__list">
      <BaseCheckbox
        v-for="wafer in payload?.existWaferList ?? []"
        :key="wafer"
        :label="wafer"
        :model-value="selected.includes(wafer)"
        :disabled="isDisabled(wafer)"
        @update:model-value="(v: boolean) => toggle(wafer, v)"
      />
    </div>

    <div class="wafer-dialog__footer">
      <BaseButton label="확인" variant="primary" @click="onConfirm" />
      <BaseButton label="취소" variant="tertiary" @click="emit('cancel')" />
    </div>
  </BaseModal>

  <!-- OkDialog.show(...) equivalent for the WaferAdapter overflow click -->
  <BaseModal :open="overflowError" title="오류">
    <p style="white-space: pre-line">{{ SPLIT_MESSAGES.waferSelectOverflow }}</p>
    <BaseButton label="확인" variant="primary" @click="overflowError = false" />
  </BaseModal>
</template>

<style scoped>
.wafer-dialog__summary {
  margin-bottom: 12px;
  font-weight: 600;
}

.wafer-dialog__list {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  max-height: 320px;
  overflow-y: auto;
}

.wafer-dialog__footer {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
