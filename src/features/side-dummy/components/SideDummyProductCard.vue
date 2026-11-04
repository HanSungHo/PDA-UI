<template>
  <section class="ds-screen__card" aria-label="기기 및 LOT 검색">
    <!-- Row 1: EQP ID Input & Search Button -->
    <div class="ds-screen__card-row">
      <BaseInput
        ref="eqpInputRef"
        class="ds-screen__card-field"
        label="장비"
        layout="horizontal"
        :model-value="eqpId"
        :disabled="isLoading"
        @update:model-value="onEqpInput"
        @keydown.enter.prevent="$emit('eqp-enter')"
      >
        <template #suffix>
          <QIcon name="sym_o_search" size="18px" aria-hidden="true" />
        </template>
      </BaseInput>
      <BaseButton
        variant="secondary"
        size="small"
        label="조회"
        :disabled="isLoading"
        @click="$emit('search-eqp')"
      />
    </div>

    <!-- Row 2: LOT No Input & Search Button -->
    <div class="ds-screen__card-row">
      <BaseInput
        ref="lotInputRef"
        class="ds-screen__card-field"
        label="LOT"
        layout="horizontal"
        :model-value="lotId"
        :disabled="isLotDisabled || isLoading"
        @update:model-value="onLotInput"
        @keydown.enter.prevent="$emit('lot-enter')"
      >
        <template #suffix>
          <QIcon name="sym_o_search" size="18px" aria-hidden="true" />
        </template>
      </BaseInput>
      <BaseButton
        variant="secondary"
        size="small"
        label="조회"
        :disabled="!isLotSearchEnabled || isLoading"
        @click="$emit('search-lot')"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { QIcon } from 'quasar';
import type { BaseInputValue } from 'src/components/base';
import BaseButton from 'src/components/base/button/BaseButton.vue';
import BaseInput from 'src/components/base/input/BaseInput.vue';
import { ref } from 'vue';

interface Props {
  eqpId: string;
  lotId: string;
  isLotDisabled: boolean;
  isLotSearchEnabled: boolean;
  isLoading: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:eqpId', value: string): void;
  (e: 'update:lotId', value: string): void;
  (e: 'search-eqp'): void;
  (e: 'search-lot'): void;
  (e: 'eqp-enter'): void;
  (e: 'lot-enter'): void;
}>();

interface InputFocusable {
  focus: () => void;
  select: () => void;
}

const eqpInputRef = ref<InputFocusable | null>(null);
const lotInputRef = ref<InputFocusable | null>(null);

function onEqpInput(val: BaseInputValue): void {
  emit('update:eqpId', String(val ?? '').toUpperCase());
}

function onLotInput(val: BaseInputValue): void {
  emit('update:lotId', String(val ?? '').toUpperCase());
}

function focusEqp(): void {
  eqpInputRef.value?.focus();
  eqpInputRef.value?.select();
}

function focusLot(): void {
  lotInputRef.value?.focus();
  lotInputRef.value?.select();
}

defineExpose({
  focusEqp,
  focusLot,
});
</script>
