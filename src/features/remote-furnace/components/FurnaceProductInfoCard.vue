<template>
  <section class="furnace-card" aria-label="Product and Machine Info">
    <!-- Row 1: LOT & BATCH -->
    <div class="furnace-card__row">
      <BaseInput
        class="furnace-card__field furnace-card__field--half"
        label="LOT"
        :model-value="lotId"
        readonly
        tabindex="-1"
      />
      <BaseInput
        class="furnace-card__field furnace-card__field--half"
        label="BATCH"
        :model-value="batchId"
        readonly
        tabindex="-1"
      />
    </div>

    <!-- Row 2: RECIPE -->
    <div class="furnace-card__row">
      <BaseInput
        :class="['furnace-card__field', { 'furnace-card__field--changed': isRecipeChanged }]"
        label="RECIPE"
        :model-value="recipe"
        readonly
        tabindex="-1"
      />
    </div>

    <!-- Row 3: 진행 RCP -->
    <div class="furnace-card__row">
      <BaseDropdownList
        class="furnace-card__field"
        label="진행 RCP"
        :model-value="selectedRecipe || undefined"
        :options="recipeSelectOptions"
        :disabled="isRecipeDisabled || isLoading"
        @update:model-value="onRecipeChange"
      />
    </div>

    <!-- Row 4: 기준장비 -->
    <div class="furnace-card__row">
      <BaseInput
        :class="[
          'furnace-card__field',
          { 'furnace-card__field--changed': isStandardMachineChanged },
        ]"
        label="기준장비"
        :model-value="standardMachine"
        readonly
        tabindex="-1"
      />
    </div>

    <!-- Row 5: 진행장비 & exMachine -->
    <div class="furnace-card__row furnace-card__row--machine">
      <BaseInput
        id="furnace-processing-machine-input"
        ref="machineInputRef"
        class="furnace-card__field furnace-card__field--machine"
        label="진행장비"
        :model-value="processingMachine"
        :disabled="isMachineDisabled || isLoading"
        autocapitalize="characters"
        autocomplete="off"
        @update:model-value="onMachineInput"
        @keydown.enter.prevent="onMachineEnter"
      />
      <div v-if="exMachine" class="furnace-card__ex-machine" title="EX MACHINE">
        {{ exMachine }}
      </div>
    </div>

    <!-- Row 6: PORT & 초기화 Button & Port State Badge -->
    <div class="furnace-card__row furnace-card__row--port">
      <div class="furnace-card__port-select-wrap">
        <BaseDropdownList
          class="furnace-card__field furnace-card__field--port"
          label="PORT"
          :model-value="selectedPort || undefined"
          :options="portSelectOptions"
          :disabled="isPortDisabled || isLoading"
          @update:model-value="onPortChange"
        />
      </div>

      <div class="furnace-card__port-actions">
        <BaseButton
          class="furnace-card__btn-clear-port"
          variant="secondary"
          size="medium"
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
  exMachine: string;
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
