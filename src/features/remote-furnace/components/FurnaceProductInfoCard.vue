<template>
  <section class="ds-screen__card" aria-label="Product and Machine Info">
    <!-- Row 1: LOT & BATCH -->
    <div class="ds-screen__card-row furnace-card__row--lot-batch">
      <BaseInput
        class="ds-screen__card-field furnace-card__field--lot"
        label="LOT"
        layout="horizontal"
        :model-value="lotId"
        readonly
        tabindex="-1"
      />
      <BaseInput
        class="ds-screen__card-field furnace-card__field--batch"
        label="BATCH"
        layout="horizontal"
        :model-value="batchId"
        readonly
        tabindex="-1"
      />
    </div>

    <!-- Row 2: RECIPE -->
    <BaseInput
      :class="['furnace-card__field', { 'furnace-card__field--changed': isRecipeChanged }]"
      label="RECIPE"
      layout="horizontal"
      :model-value="recipe"
      readonly
      tabindex="-1"
    />

    <!-- Row 3: 진행 RCP -->
    <BaseDropdownList
      class="furnace-card__field"
      label="진행 RCP"
      :model-value="selectedRecipe || undefined"
      :options="recipeSelectOptions"
      :disabled="isRecipeDisabled || isLoading"
      @update:model-value="onRecipeChange"
    />

    <!-- Row 4: 기준장비 -->
    <BaseInput
      :class="['furnace-card__field', { 'furnace-card__field--changed': isStandardMachineChanged }]"
      label="기준장비"
      layout="horizontal"
      :model-value="standardMachine"
      readonly
      tabindex="-1"
    />

    <!-- Row 5: 진행장비 (single full-width input matching Figma) -->
    <div class="furnace-card__row">
      <BaseInput
        id="furnace-processing-machine-input"
        ref="machineInputRef"
        class="furnace-card__field furnace-card__field--machine"
        label="진행장비"
        layout="horizontal"
        :model-value="processingMachine"
        :disabled="isMachineDisabled || isLoading"
        autocapitalize="characters"
        autocomplete="off"
        @update:model-value="onMachineInput"
        @keydown.enter.prevent="onMachineEnter"
      />
      <span v-if="exMachine" class="furnace-card__ex-machine" aria-label="EX MACHINE">
        {{ exMachine }}
      </span>
    </div>

    <!-- Row 6: PORT & 초기화 Button -->
    <div class="ds-screen__card-row furnace-card__row--port">
      <BaseDropdownList
        class="ds-screen__card-field furnace-card__field--port"
        label="PORT"
        :model-value="selectedPort || undefined"
        :options="portSelectOptions"
        :disabled="isPortDisabled || isLoading"
        @update:model-value="onPortChange"
      />
      <BaseButton
        class="furnace-card__btn-clear-port"
        variant="secondary"
        size="small"
        label="초기화"
        :disabled="isClearPortDisabled || isLoading"
        @click="$emit('clear-port')"
      />
      <div
        v-if="portState"
        :class="['furnace-card__port-badge', `furnace-card__port-badge--${portStatusKind}`]"
      >
        {{ portState }}
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import {
  BaseButton,
  BaseDropdownList,
  type BaseDropdownValue,
  BaseInput,
  type BaseInputValue,
  type BaseOption,
} from 'src/components/base';
import { computed, nextTick, ref } from 'vue';

import type { PortStatusKind } from '../types/remote-furnace.types';

defineOptions({ name: 'FurnaceProductInfoCard' });

const machineInputRef = ref<{ $el?: HTMLElement } | HTMLElement | null>(null);

const props = defineProps<{
  lotId: string;
  batchId: string;
  recipe: string;
  isRecipeChanged?: boolean;
  selectedRecipe: string;
  recipeOptions: string[];
  standardMachine: string;
  isStandardMachineChanged: boolean;
  processingMachine: string;
  exMachine?: string;
  selectedPort: string;
  portOptions: string[];
  portState: string;
  portStatusKind: PortStatusKind;
  isMachineDisabled: boolean;
  isPortDisabled: boolean;
  isRecipeDisabled: boolean;
  isClearPortDisabled: boolean;
  isLoading: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:processing-machine', val: string): void;
  (e: 'machine-enter'): void;
  (e: 'recipe-change', recipe: string): void;
  (e: 'port-change', port: string): void;
  (e: 'clear-port'): void;
}>();

const recipeSelectOptions = computed<BaseOption[]>(() =>
  props.recipeOptions.map((r) => ({ label: r, value: r })),
);

const portSelectOptions = computed<BaseOption[]>(() =>
  props.portOptions.map((p) => ({ label: p, value: p })),
);

function onMachineInput(val: BaseInputValue): void {
  const str = typeof val === 'string' ? val : val != null ? String(val) : '';
  emit('update:processing-machine', str.toUpperCase());
}

function onMachineEnter(): void {
  emit('machine-enter');
}

function onRecipeChange(val: BaseDropdownValue): void {
  if (typeof val === 'string') {
    emit('recipe-change', val);
  }
}

function onPortChange(val: BaseDropdownValue): void {
  if (typeof val === 'string') {
    emit('port-change', val);
  }
}

function focusMachineInput(): void {
  void nextTick(() => {
    const raw = machineInputRef.value;
    const target =
      raw && '$el' in raw && raw.$el instanceof HTMLElement
        ? raw.$el
        : raw instanceof HTMLElement
          ? raw
          : null;
    const input =
      target?.querySelector<HTMLInputElement>('input') ?? (target as HTMLInputElement | null);
    input?.focus?.();
    input?.select?.();
  });
}

defineExpose({
  focusMachineInput,
});
</script>
