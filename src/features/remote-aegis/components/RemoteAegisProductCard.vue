<template>
  <section class="ds-screen__card" aria-label="AEGIS 진행 정보">
    <!-- Row 1: 진행장비 & 조회 -->
    <div class="ds-screen__card-row">
      <BaseInput
        ref="machineInputRef"
        class="ds-screen__card-field"
        label="진행장비"
        layout="horizontal"
        uppercase
        :model-value="machineInput"
        :disabled="isLoading"
        @update:model-value="onMachineInput"
        @keydown.enter.prevent="$emit('machine-enter')"
      >
        <template #append>
          <QIcon name="sym_o_search" aria-hidden="true" />
        </template>
      </BaseInput>
      <BaseButton
        variant="secondary"
        size="small"
        label="조회"
        :disabled="isLoading"
        @click="$emit('search-machine')"
      />
    </div>

    <!-- Row 2: LOCAL & REMOTE Mode Buttons -->
    <div class="ds-screen__actions">
      <BaseButton
        variant="secondary"
        size="small"
        label="LOCAL"
        :disabled="isLoading"
        @click="$emit('change-local')"
      />
      <BaseButton
        variant="secondary"
        size="small"
        label="REMOTE"
        :disabled="isLoading"
        @click="$emit('change-remote')"
      />
    </div>

    <!-- Row 3: LOTID & 조회 -->
    <div class="ds-screen__card-row">
      <BaseInput
        ref="lotInputRef"
        class="ds-screen__card-field"
        label="LOTID"
        layout="horizontal"
        uppercase
        :model-value="lotIdInput"
        :disabled="isLoading"
        @update:model-value="onLotInput"
        @keydown.enter.prevent="$emit('lot-enter')"
      >
        <template #append>
          <QIcon name="sym_o_search" aria-hidden="true" />
        </template>
      </BaseInput>
      <BaseButton
        variant="secondary"
        size="small"
        label="조회"
        :disabled="isLoading"
        @click="$emit('search-lot')"
      />
    </div>

    <!-- Row 4: PORT, 초기화, & Port State Badge -->
    <div class="ds-screen__card-row">
      <BaseDropdownList
        class="ds-screen__card-field"
        label="PORT"
        layout="horizontal"
        :model-value="selectedPort || undefined"
        :options="portSelectOptions"
        :disabled="isLoading || portOptions.length === 0"
        @update:model-value="onPortChange"
      />
      <BaseButton
        variant="secondary"
        size="small"
        label="초기화"
        :disabled="!isClearPortEnabled || isLoading"
        @click="$emit('clear-port')"
      />
      <div
        v-if="portState"
        :class="['remote-aegis-port-badge', `remote-aegis-port-badge--${portStatusKind}`]"
        aria-label="PORT 상태"
      >
        {{ portState }}
      </div>
    </div>

    <!-- Row 5: 진행 Recipe -->
    <BaseInput
      label="진행 Recipe"
      layout="horizontal"
      uppercase
      :model-value="recipeInput"
      :disabled="isLoading"
      @update:model-value="onRecipeInput"
    />

    <!-- Row 6: 생산장비 & WF선택 -->
    <div class="ds-screen__card-row">
      <BaseInput
        class="ds-screen__card-field"
        label="생산장비"
        layout="horizontal"
        uppercase
        :model-value="prodMachineInput"
        :disabled="isLoading"
        @update:model-value="onProdMachineInput"
      />
      <BaseButton
        variant="secondary"
        size="small"
        label="WF선택"
        :disabled="isLoading"
        @click="$emit('select-wafer')"
      />
    </div>

    <!-- Row 7: 측정 장수 & 선택된 WF 리스트 -->
    <div class="ds-screen__card-row">
      <BaseInput
        class="ds-screen__card-field"
        label="측정 장수"
        layout="horizontal"
        :model-value="waferCount"
        readonly
        tabindex="-1"
      />
      <BaseInput
        class="ds-screen__card-field"
        aria-label="측정 Wafer 목록"
        layout="horizontal"
        :model-value="selectedWaferList"
        readonly
        tabindex="-1"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { QIcon } from 'quasar';
import {
  BaseButton,
  BaseDropdownList,
  type BaseDropdownValue,
  BaseInput,
  type BaseInputValue,
  type BaseOption,
} from 'src/components/base';
import { computed, nextTick, ref } from 'vue';

import type { AegisPortStatusKind } from '../types/remote-aegis.types';

defineOptions({ name: 'RemoteAegisProductCard' });

const props = defineProps<{
  machineInput: string;
  lotIdInput: string;
  selectedPort: string;
  portOptions: string[];
  portState: string;
  portStatusKind: AegisPortStatusKind;
  recipeInput: string;
  prodMachineInput: string;
  waferCount: string;
  selectedWaferList: string;
  isClearPortEnabled: boolean;
  isLoading: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:machineInput', val: string): void;
  (e: 'update:lotIdInput', val: string): void;
  (e: 'update:selectedPort', val: string): void;
  (e: 'update:recipeInput', val: string): void;
  (e: 'update:prodMachineInput', val: string): void;
  (e: 'machine-enter'): void;
  (e: 'search-machine'): void;
  (e: 'change-local'): void;
  (e: 'change-remote'): void;
  (e: 'lot-enter'): void;
  (e: 'search-lot'): void;
  (e: 'clear-port'): void;
  (e: 'select-wafer'): void;
}>();

const machineInputRef = ref<{ $el?: HTMLElement; focus?: () => void } | HTMLElement | null>(null);
const lotInputRef = ref<{ $el?: HTMLElement; focus?: () => void } | HTMLElement | null>(null);

const portSelectOptions = computed<BaseOption[]>(() =>
  props.portOptions.map((p) => ({ label: p, value: p })),
);

function onMachineInput(val: BaseInputValue): void {
  emit('update:machineInput', val != null ? String(val) : '');
}

function onLotInput(val: BaseInputValue): void {
  emit('update:lotIdInput', val != null ? String(val) : '');
}

function onPortChange(val: BaseDropdownValue): void {
  emit('update:selectedPort', val != null ? String(val) : '');
}

function onRecipeInput(val: BaseInputValue): void {
  emit('update:recipeInput', val != null ? String(val) : '');
}

function onProdMachineInput(val: BaseInputValue): void {
  emit('update:prodMachineInput', val != null ? String(val) : '');
}

function focusMachine(): void {
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

function focusLot(): void {
  void nextTick(() => {
    const raw = lotInputRef.value;
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
  focusMachine,
  focusLot,
  /** Returns true when the LOT input (or its wrapper) contains the currently active element. */
  isLotFocused: (): boolean => {
    const raw = lotInputRef.value;
    const el =
      raw && '$el' in raw && raw.$el instanceof HTMLElement
        ? raw.$el
        : raw instanceof HTMLElement
          ? raw
          : null;
    return el ? el.contains(document.activeElement) : false;
  },
  /** Returns true when the machine input (or its wrapper) contains the currently active element. */
  isMachineFocused: (): boolean => {
    const raw = machineInputRef.value;
    const el =
      raw && '$el' in raw && raw.$el instanceof HTMLElement
        ? raw.$el
        : raw instanceof HTMLElement
          ? raw
          : null;
    return el ? el.contains(document.activeElement) : false;
  },
});
</script>

<style scoped>
.remote-aegis-port-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: var(--component-input-height-md);
  min-width: var(--size-60px);
  padding: 0 var(--radius-10);
  border-radius: var(--radius-4);
  font-size: var(--font-size-12px);
  font-weight: var(--weight-font-bold);
  text-transform: uppercase;
}

.remote-aegis-port-badge--init {
  background-color: var(--semantic-red-600);
  color: var(--text-text-white);
}

.remote-aegis-port-badge--run {
  background-color: var(--semantic-blue-400);
  color: var(--text-text-white);
}

.remote-aegis-port-badge--pending {
  background-color: var(--orange-400);
  color: var(--text-text-primary);
}

.remote-aegis-port-badge--ready {
  background-color: var(--background-background-success);
  color: var(--text-text-primary);
}

.remote-aegis-port-badge--reserved {
  background-color: var(--utility-yellow-yellow-bg);
  color: var(--utility-yellow-yellow-text);
  border: 1px solid var(--utility-yellow-yellow-border);
}

.remote-aegis-port-badge--complete {
  background-color: var(--primary-teal-500);
  color: var(--text-text-white);
}

.remote-aegis-port-badge--idle {
  background-color: var(--gray-500);
  color: var(--text-text-white);
}

.remote-aegis-port-badge--none {
  display: none;
}
</style>
