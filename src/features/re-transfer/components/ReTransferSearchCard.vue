<template>
  <section class="ds-screen__card" aria-label="LOT No 검색">
    <div class="ds-screen__card-row">
      <BaseInput
        ref="lotInputRef"
        class="ds-screen__card-field"
        layout="horizontal"
        label="LOT No"
        :model-value="lotId"
        :disabled="isLoading"
        @update:model-value="onLotInput"
        @keydown.enter.prevent="$emit('lot-enter')"
      >
        <template #append>
          <QIcon name="sym_o_search" class="re-transfer-search-icon" aria-hidden="true" />
        </template>
      </BaseInput>
      <BaseButton
        class="re-transfer-btn-search"
        variant="secondary"
        size="small"
        label="조회"
        :disabled="isLoading"
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

defineOptions({ name: 'ReTransferSearchCard' });

interface Props {
  lotId: string;
  isLoading: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:lotId', value: string): void;
  (e: 'search-lot'): void;
  (e: 'lot-enter'): void;
}>();

interface InputFocusable {
  focus: () => void;
  select: () => void;
}

const lotInputRef = ref<InputFocusable | null>(null);

function onLotInput(val: BaseInputValue): void {
  emit('update:lotId', String(val ?? '').toUpperCase());
}

function focusLot(): void {
  lotInputRef.value?.focus();
  lotInputRef.value?.select();
}

defineExpose({
  focusLot,
});
</script>

<style scoped>
.re-transfer-btn-search {
  flex: 0 0 auto;
  white-space: nowrap;
}

.re-transfer-search-icon {
  font-size: var(--component-icon-size-sm);
  color: var(--icon-icon-secondary);
}
</style>
