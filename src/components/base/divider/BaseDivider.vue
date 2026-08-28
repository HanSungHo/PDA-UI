<template>
  <ADivider
    class="base-divider"
    :type="type"
    :orientation="orientation"
    :dashed="resolvedVariant === 'dashed'"
    :variant="resolvedVariant"
    :plain="plain"
    role="separator"
    :aria-orientation="type"
  >
    <slot v-if="type === 'horizontal'" />
  </ADivider>
</template>

<script setup lang="ts">
import { Divider as ADivider } from 'ant-design-vue';
import { computed } from 'vue';

import { baseDividerDefaults, resolveDividerVariant } from './base-divider.constants';
import type { BaseDividerProps } from './base-divider.types';

defineOptions({ name: 'BaseDivider' });

const props = withDefaults(defineProps<BaseDividerProps>(), baseDividerDefaults);

const resolvedVariant = computed(() => resolveDividerVariant(props.dashed, props.variant));
</script>

<style scoped src="./base-divider.css" />
