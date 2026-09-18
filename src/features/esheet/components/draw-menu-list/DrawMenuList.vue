<template>
  <aside class="draw-menu-list" :class="{ 'draw-menu-list--closed': !open }" :aria-hidden="!open">
    <button
      type="button"
      class="draw-menu-list__overlay"
      aria-label="Close draw menu"
      @click="emit('close')"
    />

    <section class="draw-menu-list__panel" role="dialog" aria-modal="true" :aria-label="title">
      <header class="draw-menu-list__header">
        <button type="button" class="draw-menu-list__back" aria-label="Back" @click="emit('close')">
          <ArrowLeftOutlined aria-hidden="true" />
        </button>
        <h1 class="draw-menu-list__title">{{ title }}</h1>
      </header>

      <nav class="draw-menu-list__actions" aria-label="Draw menu actions">
        <BaseDrawerItem
          v-for="action in actions"
          :key="action.id"
          :data-action-id="action.id"
          :label="action.label"
          :value="action.id"
          :selected="action.selected"
          :disabled="action.disabled"
          @select="handleSelect"
        />
      </nav>
    </section>
  </aside>
</template>

<script setup lang="ts">
import { ArrowLeftOutlined } from '@ant-design/icons-vue';
import { BaseDrawerItem } from 'src/components/base';
import { computed } from 'vue';

import { useDrawMenuActions } from '../../composables/use-draw-menu-actions';
import type { DrawMenuListEmits, DrawMenuListProps } from './draw-menu-list.types';

defineOptions({ name: 'DrawMenuList' });

const props = defineProps<DrawMenuListProps>();
const emit = defineEmits<DrawMenuListEmits>();

const actions = computed(() =>
  useDrawMenuActions({
    lotId: props.lotId,
    factoryName: props.factoryName,
    productName: props.productName,
    routeName: props.routeName,
    area: props.area,
    row: props.row,
    selectedAction: props.selectedAction,
  }),
);

function handleSelect(actionId: string | number): void {
  const action = actions.value.find((item) => item.id === actionId);

  if (!action) return;

  emit('select-action', action);
}
</script>

<style scoped src="./draw-menu-list.css" />
