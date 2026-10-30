<template>
  <section class="ds-screen__card" aria-label="장비 상태 변경 입력">
    <!-- 1. COMMENT (AutoCompleteTextView parity) -->
    <BaseInput
      label="COMMENT"
      :model-value="comment"
      layout="horizontal"
      :disabled="isLoading"
      list="machine-status-detail-comment-options"
      @update:model-value="onCommentInput"
      @keydown.enter.prevent="$emit('comment-enter')"
    />
    <datalist v-if="commentOptions.length > 0" id="machine-status-detail-comment-options">
      <option v-for="item in commentOptions" :key="item" :value="item" />
    </datalist>

    <!-- 2. 장비상태 -->
    <BaseDropdownList
      label="장비상태"
      :model-value="selectedEqpState || undefined"
      :options="statusOptions"
      :disabled="isLoading"
      @update:model-value="onEqpStateChange"
    />

    <!-- 3. DOWN CODE -->
    <BaseDropdownList
      label="DOWN CODE"
      :model-value="selectedDownCode || undefined"
      :options="downCodeOptions"
      :disabled="isLoading"
      @update:model-value="onDownCodeChange"
    />

    <!-- 4. 작업자 -->
    <BaseInput label="작업자" :model-value="operator" layout="horizontal" disabled />
  </section>
</template>

<script setup lang="ts">
import type { BaseInputValue } from 'src/components/base';
import type { BaseDropdownValue, BaseOption } from 'src/components/base/dropdown-list';
import BaseDropdownList from 'src/components/base/dropdown-list/BaseDropdownList.vue';
import BaseInput from 'src/components/base/input/BaseInput.vue';

defineOptions({ name: 'MachineStatusDetailChangeCard' });

interface Props {
  comment: string;
  commentOptions: string[];
  selectedEqpState: string;
  statusOptions: BaseOption[];
  selectedDownCode: string;
  downCodeOptions: BaseOption[];
  operator: string;
  isLoading: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:comment', value: string): void;
  (e: 'update:selectedEqpState', value: string): void;
  (e: 'update:selectedDownCode', value: string): void;
  (e: 'comment-enter'): void;
}>();

function onCommentInput(val: BaseInputValue): void {
  emit('update:comment', String(val ?? ''));
}

function onEqpStateChange(val: BaseDropdownValue): void {
  emit('update:selectedEqpState', val != null ? String(val) : '');
}

function onDownCodeChange(val: BaseDropdownValue): void {
  emit('update:selectedDownCode', val != null ? String(val) : '');
}
</script>
