<template>
  <BaseFieldShell
    :class="['ds-search', `ds-search--${size}`, { 'ds-search--readonly': readonly }]"
    :control-id="controlId"
    :label-id="labelId"
    :message-id="messageId"
    :label="label"
    :message="message"
    :required="required"
    :status="status"
    :block="block"
  >
    <AInput
      ref="inputRef"
      :id="controlId"
      class="ds-search__control"
      :value="modelValue"
      :disabled="isStructurallyDisabled"
      :readonly="readonly"
      :autofocus="autofocus"
      :placeholder="placeholder"
      :size="antSize"
      :status="antStatus"
      :aria-label="label ? undefined : ariaLabel"
      :aria-labelledby="label ? labelId : undefined"
      :aria-describedby="message ? messageId : undefined"
      :aria-invalid="status === 'error' || undefined"
      :aria-required="required || undefined"
      :aria-readonly="readonly || undefined"
      :aria-busy="loading || undefined"
      @update:value="handleUpdate"
      @change="handleChange"
      @press-enter="handleSearch"
      @focus="emit('focus', $event)"
      @blur="emit('blur', $event)"
    >
      <template #prefix>
        <button
          type="button"
          class="ds-search__action"
          aria-label="Search"
          :disabled="isValueLocked"
          @click="handleSearch"
        >
          <SearchOutlined class="ds-search__icon" aria-hidden="true" />
        </button>
      </template>
      <template v-if="loading || showClear" #suffix>
        <LoadingOutlined v-if="loading" class="ds-search__icon" aria-hidden="true" />
        <button
          v-else
          type="button"
          class="ds-search__clear"
          aria-label="Clear search"
          @click="handleClear"
        >
          <CloseOutlined aria-hidden="true" />
        </button>
      </template>
    </AInput>
  </BaseFieldShell>
</template>

<script setup lang="ts">
import { CloseOutlined, LoadingOutlined, SearchOutlined } from '@ant-design/icons-vue';
import { Input as AInput } from 'ant-design-vue';
import { computed, nextTick, onBeforeUnmount, ref } from 'vue';

import type { BaseComponentSize } from '../shared/base-field.types';
import BaseFieldShell from '../shared/BaseFieldShell.vue';
import { useBaseField } from '../shared/use-base-field';
import {
  baseSearchDefaults,
  type BaseSearchEmits,
  type BaseSearchProps,
} from './base-search.types';

defineOptions({ name: 'BaseSearch' });
const props = withDefaults(defineProps<BaseSearchProps>(), baseSearchDefaults);
const emit = defineEmits<BaseSearchEmits>();
// Ant Design exposes focus at runtime but omits it from the public component instance type.
interface AntInputFocusHandle {
  focus: () => void;
}
const inputRef = ref<AntInputFocusHandle | null>(null);
const { controlId, labelId, messageId, status, message, isStructurallyDisabled, isValueLocked } =
  useBaseField(props, 'base-search');

type AntInputSize = 'small' | 'middle' | 'large';
type AntInputStatus = 'warning' | 'error' | undefined;
const sizeMap: Record<BaseComponentSize, AntInputSize> = {
  small: 'small',
  medium: 'middle',
  large: 'large',
};
const antSize = computed(() => sizeMap[props.size]);
const antStatus = computed<AntInputStatus>(() =>
  status.value === 'warning' || status.value === 'error' ? status.value : undefined,
);
const showClear = computed(
  () => props.clearable && props.modelValue.trim().length > 0 && !isValueLocked.value,
);
let searchTimer: ReturnType<typeof setTimeout> | undefined;

function cancelPendingSearch(): void {
  if (searchTimer !== undefined) clearTimeout(searchTimer);
  searchTimer = undefined;
}

function scheduleSearch(value: string): void {
  cancelPendingSearch();
  if (props.debounce <= 0) {
    emit('search', value);
    return;
  }
  searchTimer = setTimeout(() => {
    emit('search', value);
    searchTimer = undefined;
  }, props.debounce);
}

function handleUpdate(value: string): void {
  if (isValueLocked.value) return;
  emit('update:modelValue', value);
  scheduleSearch(value);
}
function handleChange(event: Event): void {
  if (isValueLocked.value) return;
  emit('change', (event.target as HTMLInputElement).value, event);
}
function handleSearch(event: KeyboardEvent | MouseEvent): void {
  if (isValueLocked.value) return;
  cancelPendingSearch();
  emit('search', props.modelValue, event);
}
async function handleClear(): Promise<void> {
  if (isValueLocked.value) return;
  cancelPendingSearch();
  emit('update:modelValue', '');
  emit('clear');
  await nextTick();
  inputRef.value?.focus();
}

onBeforeUnmount(cancelPendingSearch);
</script>

<style src="./base-search.css"></style>
