<script setup lang="ts">
import { computed } from 'vue';

import { type BaseTagAndChipProps } from './BaseTagsandChips.types';
const props = withDefaults(defineProps<BaseTagAndChipProps>(), {
  bordered: true,
  closable: true,
});
const tagClasses = computed(() => ['ds-tag', `ds-tag--${props.size}`, `ds-tag--${props.shape}`]);

const emit = defineEmits<{
  close: [event: MouseEvent];
}>();

const handleClose = (event: MouseEvent) => {
  emit('close', event);
};
</script>

<template>
  <ATag
    :color="color"
    :bordered="bordered"
    :closable="true"
    :class="tagClasses"
    @close="handleClose"
  >
    <template v-if="type == 'single'">
      {{ label }}
    </template>

    <template v-else>
      <span class="ds-tag__key">{{ label }}</span>
      <span class="ds-tag__separator"> : </span>
      <span class="ds-tag__value">{{ value }}</span>
    </template>
  </ATag>
</template>

<style src="./base-tagsandchips.css"></style>
