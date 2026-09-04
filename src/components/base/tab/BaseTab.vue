<template>
  <div
    :id="controlId"
    class="ds-tab"
    :class="[
      `ds-tab--${sizeClass}`,
      {
        'ds-tab--block': block,
        'ds-tab--disabled': isStructurallyDisabled,
      },
    ]"
  >
    <div
      class="ds-tab__list"
      role="tablist"
      :aria-label="ariaLabel"
      :aria-disabled="isStructurallyDisabled || undefined"
    >
      <button
        v-for="item in items"
        :id="tabId(item.key)"
        :key="item.key"
        type="button"
        class="ds-tab__item"
        :class="{ 'ds-tab__item--active': isActive(item.key) }"
        role="tab"
        :aria-selected="isActive(item.key)"
        :aria-controls="panelId(item.key)"
        :aria-disabled="isItemDisabled(item) || undefined"
        :disabled="isItemDisabled(item)"
        :tabindex="isActive(item.key) ? 0 : -1"
        @click="select(item)"
      >
        <span class="ds-tab__text">{{ item.label }}</span>
        <span class="ds-tab__line" aria-hidden="true" />
      </button>
    </div>

    <div
      v-if="typeof activeItem?.content === 'string'"
      :id="panelId(activeItem.key)"
      class="ds-tab__content"
      role="tabpanel"
      :aria-labelledby="tabId(activeItem.key)"
    >
      {{ activeItem.content }}
    </div>

    <div
      v-else-if="activeItem?.content"
      :id="panelId(activeItem.key)"
      class="ds-tab__content"
      role="tabpanel"
      :aria-labelledby="tabId(activeItem.key)"
    >
      <component :is="activeItem.content" />
    </div>

    <slot v-else :item="activeItem" :value="activeValue" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { useBaseField } from '../shared/use-base-field';
import { BASE_TAB_SIZES, baseTabDefaults } from './base-tab.constants';
import type { BaseTabEmits, BaseTabItem, BaseTabProps, BaseTabValue } from './base-tab.types';

defineOptions({ name: 'BaseTab' });

const props = withDefaults(defineProps<BaseTabProps>(), baseTabDefaults);

const emit = defineEmits<BaseTabEmits>();

// CHANGED: Optional but recommended for clear scoped-slot typing.
defineSlots<{
  default(props: { item: BaseTabItem; value: BaseTabValue }): unknown;
}>();

const sizeClass = computed(() => (BASE_TAB_SIZES.includes(props.size) ? props.size : 'medium'));

const { controlId, isStructurallyDisabled, isValueLocked } = useBaseField(props, 'base-tab');

const firstEnabledItem = computed(() => props.items.find((item) => !item.disabled));
const activeItem = computed(() => {
  const selected = props.items.find((item) => item.key === props.modelValue);
  return selected && !selected.disabled ? selected : firstEnabledItem.value;
});

const activeValue = computed(() => activeItem.value?.key);

function isActive(key: BaseTabValue): boolean {
  return activeValue.value === key;
}

function isItemDisabled(item: BaseTabItem): boolean {
  return isStructurallyDisabled.value || Boolean(item.disabled);
}

function tabId(key: BaseTabValue): string {
  return `${controlId.value}-tab-${String(key)}`;
}

function panelId(key: BaseTabValue): string {
  return `${controlId.value}-panel-${String(key)}`;
}

function select(item: BaseTabItem): void {
  if (isItemDisabled(item) || isValueLocked.value || isActive(item.key)) {
    return;
  }

  emit('update:modelValue', item.key);
  emit('change', item.key);
}
</script>

<style scoped src="./base-tab.css" />

<!-- ## How to use

```vue
<script setup lang="ts">
import { ref } from 'vue';

const activeTab = ref('profile');

const items = [
  {
    key: 'profile',
    label: 'Profile',
  },
  {
    key: 'settings',
    label: 'Settings',
  },
];
</script>

<template>
  <BaseTab
    v-model="activeTab"
    :items="items"
  >
    <template #default="{ value }">
      <ProfileView v-if="value === 'profile'" />
      <SettingsView v-else-if="value === 'settings'" />
    </template>
  </BaseTab>
</template> -->
