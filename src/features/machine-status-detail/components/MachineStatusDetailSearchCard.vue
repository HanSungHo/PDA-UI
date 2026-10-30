<template>
  <section class="ds-screen__card" aria-label="장비 검색">
    <div class="ds-screen__card-row">
      <BaseInput
        ref="eqpInputRef"
        class="ds-screen__card-field"
        layout="horizontal"
        label="장비"
        :model-value="eqpId"
        :disabled="isLoading"
        @update:model-value="onEqpInput"
        @keydown.enter.prevent="$emit('eqp-enter')"
      >
        <template #append>
          <QIcon name="sym_o_search" class="machine-status-detail-search-icon" aria-hidden="true" />
        </template>
      </BaseInput>
      <BaseButton
        class="machine-status-detail-btn-action"
        variant="secondary"
        size="small"
        label="조회"
        :disabled="isLoading"
        @click="$emit('search-eqp')"
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

defineOptions({ name: 'MachineStatusDetailSearchCard' });

interface Props {
  eqpId: string;
  isLoading: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:eqpId', value: string): void;
  (e: 'search-eqp'): void;
  (e: 'eqp-enter'): void;
}>();

interface InputFocusable {
  focus: () => void;
  select: () => void;
}

const eqpInputRef = ref<InputFocusable | null>(null);

function onEqpInput(val: BaseInputValue): void {
  emit('update:eqpId', String(val ?? '').toUpperCase());
}

function focusEqp(): void {
  eqpInputRef.value?.focus();
  eqpInputRef.value?.select();
}

defineExpose({
  focusEqp,
});
</script>

<style scoped>
.machine-status-detail-btn-action {
  flex: 0 0 auto;
  white-space: nowrap;
}

.machine-status-detail-search-icon {
  font-size: var(--ds-search-icon-size);
  color: var(--ds-search-icon-color);
}
</style>
