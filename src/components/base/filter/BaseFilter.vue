<template>
  <div
    class="ds-filter"
    :class="[
      `ds-filter--${size}`,
      {
        'ds-filter--disabled': disabled,
        'ds-filter--readonly': readonly,
        'ds-filter--loading': loading,
      },
    ]"
    :aria-disabled="disabled || undefined"
    :aria-busy="loading || undefined"
  >
    <div class="ds-filter__items" role="list" :aria-label="ariaLabel">
      <span
        v-for="item in modelValue"
        :key="item.id"
        class="ds-filter__chip"
        :class="{ 'ds-filter__chip--disabled': item.disabled }"
        role="listitem"
      >
        <span class="ds-filter__content">
          <span class="ds-filter__key">{{ item.key }}</span>
          <span class="ds-filter__value">{{ item.value }}</span>
        </span>
        <button
          v-if="canRemove(item)"
          :ref="(element) => setRemoveButtonRef(item.id, element)"
          type="button"
          class="ds-filter__remove"
          :aria-label="`Remove ${item.key}: ${item.value} filter`"
          @click="removeFilter(item)"
        >
          <CloseOutlined aria-hidden="true" />
        </button>
      </span>
    </div>

    <BaseButton
      v-if="clearable && modelValue.length > 0"
      data-testid="clear-filters"
      variant="link"
      size="xs"
      :disabled="isInteractionBlocked"
      :label="clearLabel"
      @click="clearFilters"
    >
      <template #suffix><MinusCircleOutlined aria-hidden="true" /></template>
    </BaseButton>

    <BaseButton
      v-if="addable"
      data-testid="add-filter"
      variant="link"
      size="xs"
      :disabled="isInteractionBlocked"
      :label="addLabel"
      @click="emit('add')"
    >
      <template #suffix><PlusCircleOutlined aria-hidden="true" /></template>
    </BaseButton>
  </div>
</template>

<script setup lang="ts">
/**
 * BaseFilter owns filter chips and their add/remove/clear actions only.
 * Search, sort and view controls from the design reference belong to a higher-level toolbar.
 * TODO(Jira): confirm the temporary item contract when the Filter ticket is available.
 */
import { CloseOutlined, MinusCircleOutlined, PlusCircleOutlined } from '@ant-design/icons-vue';
import { type ComponentPublicInstance, computed, nextTick } from 'vue';

import BaseButton from '../button/BaseButton.vue';
import {
  baseFilterDefaults,
  type BaseFilterEmits,
  type BaseFilterItem,
  type BaseFilterProps,
} from './base-filter.types';

defineOptions({ name: 'BaseFilter' });

const props = withDefaults(defineProps<BaseFilterProps>(), baseFilterDefaults);
const emit = defineEmits<BaseFilterEmits>();

const isInteractionBlocked = computed(() => props.disabled || props.readonly || props.loading);
const removeButtonRefs = new Map<string, HTMLButtonElement>();

function setRemoveButtonRef(id: string, element: Element | ComponentPublicInstance | null): void {
  if (element instanceof HTMLButtonElement) {
    removeButtonRefs.set(id, element);
    return;
  }
  removeButtonRefs.delete(id);
}

function canRemove(item: BaseFilterItem): boolean {
  return !isInteractionBlocked.value && !item.disabled;
}

function emitValue(value: BaseFilterItem[]): void {
  emit('update:modelValue', value);
  emit('change', value);
}

async function removeFilter(item: BaseFilterItem): Promise<void> {
  if (!canRemove(item)) return;
  const removableIds = props.modelValue.filter(canRemove).map(({ id }) => id);
  const removedPosition = removableIds.indexOf(item.id);
  const focusTargetId = removableIds[removedPosition + 1] ?? removableIds[removedPosition - 1];
  const nextValue = props.modelValue.filter(({ id }) => id !== item.id);
  emitValue(nextValue);
  emit('remove', item);
  await nextTick();
  if (focusTargetId) removeButtonRefs.get(focusTargetId)?.focus();
}

function clearFilters(): void {
  if (isInteractionBlocked.value || props.modelValue.length === 0) return;
  emitValue([]);
  emit('clear');
}
</script>

<style src="./base-filter.css"></style>
