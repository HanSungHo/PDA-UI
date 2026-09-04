<template>
  <Breadcrumb class="ds-breadcrumb" :separator="separator" :aria-label="ariaLabel">
    <BreadcrumbItem v-if="showHomeIcon" class="ds-breadcrumb__home" :separator="separator">
      <HomeOutlined class="ds-breadcrumb__home-icon" aria-hidden="true" />
    </BreadcrumbItem>

    <BreadcrumbItem
      v-for="(item, index) in items"
      :key="`${item.label}-${index}`"
      :separator="isCurrentItem(index) ? '' : undefined"
      :class="{
        'ds-breadcrumb__item--current': isCurrentItem(index),
        'ds-breadcrumb__item--disabled': item.disabled,
      }"
      :aria-current="isCurrentItem(index) ? 'page' : undefined"
      :aria-disabled="item.disabled || undefined"
    >
      <span class="ds-breadcrumb__item-content">
        <slot name="icon" :item="item" :index="index">
          <slot name="item-icon" :item="item" :index="index" />
        </slot>

        <RouterLink
          v-if="item.to && !isCurrentItem(index) && !item.disabled"
          :to="item.to"
          class="ds-breadcrumb__label"
        >
          {{ item.label }}
        </RouterLink>

        <span v-else class="ds-breadcrumb__label">
          {{ item.label }}
        </span>
      </span>
    </BreadcrumbItem>
  </Breadcrumb>
</template>

<script setup lang="ts">
import { HomeOutlined } from '@ant-design/icons-vue';
import { Breadcrumb, BreadcrumbItem } from 'ant-design-vue';
import { RouterLink } from 'vue-router';

import { baseBreadcrumbDefaults, type BaseBreadcrumbProps } from './base-breadcrumb.types';

defineOptions({
  name: 'BaseBreadcrumb',
});

const props = withDefaults(defineProps<BaseBreadcrumbProps>(), baseBreadcrumbDefaults);

function isCurrentItem(index: number): boolean {
  return index === props.items.length - 1;
}
</script>

<style src="./base-breadcrumb.css"></style>
