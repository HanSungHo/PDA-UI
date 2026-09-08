<template>
  <nav
    v-bind="$attrs"
    class="ds-pagination"
    :class="{ 'ds-pagination--loading': props.loading }"
    :aria-label="props.ariaLabel"
    :aria-busy="props.loading || undefined"
  >
    <APagination
      :current="currentPage"
      :page-size="props.pageSize"
      :total="props.total"
      :page-size-options="props.pageSizeOptions"
      :show-size-changer="props.showSizeChanger"
      :show-quick-jumper="props.showQuickJumper"
      :show-total="props.showTotal"
      :disabled="props.disabled || props.loading"
      :simple="props.simple"
      :size="props.size"
      @change="handleChange"
      @show-size-change="handlePageSizeChange"
    />
  </nav>
</template>

<script setup lang="ts">
import { Pagination as APagination } from 'ant-design-vue';
import { computed } from 'vue';

import { basePaginationDefaults } from './base-pagination.constants';
import type { BasePaginationEmits, BasePaginationProps } from './base-pagination.types';

defineOptions({ name: 'BasePagination', inheritAttrs: false });

const props = withDefaults(defineProps<BasePaginationProps>(), basePaginationDefaults);
const emit = defineEmits<BasePaginationEmits>();

const totalPages = computed(() => {
  const total = Math.max(props.total, 0);
  const pageSize = Math.max(props.pageSize, 1);

  return Math.max(Math.ceil(total / pageSize), 1);
});

const currentPage = computed(() =>
  Math.min(Math.max(Math.trunc(props.modelValue), 1), totalPages.value),
);

function handleChange(page: number, pageSize: number): void {
  const nextPage = Math.min(Math.max(Math.trunc(page), 1), totalPages.value);

  emit('update:modelValue', nextPage);
  emit('change', nextPage, pageSize);
}

function handlePageSizeChange(page: number, pageSize: number): void {
  emit('update:pageSize', pageSize);
  emit('pageSizeChange', pageSize, page);
}
</script>

<style scoped src="./base-pagination.css"></style>
