<template>
  <section class="ds-screen__card" aria-label="반송 상세 정보">
    <!-- 1. 현재 STK -->
    <BaseInput label="현재 STK" :model-value="currentStk" layout="horizontal" disabled />

    <!-- Divider -->
    <div class="re-transfer-detail-divider" aria-hidden="true" />

    <!-- 2. 다음 FAB -->
    <BaseDropdownList
      label="다음 FAB"
      layout="horizontal"
      :model-value="selectedFab || undefined"
      :options="fabOptions"
      :disabled="isLoading || fabs.length === 0"
      @update:model-value="onFabSelect"
    />

    <!-- 3. 다음 BAY -->
    <BaseDropdownList
      label="다음 BAY"
      layout="horizontal"
      :model-value="selectedBay || undefined"
      :options="bayOptions"
      :disabled="isLoading || bays.length === 0"
      @update:model-value="onBaySelect"
    />

    <!-- 4. 다음 STK -->
    <BaseDropdownList
      label="다음 STK"
      layout="horizontal"
      :model-value="selectedStocker || undefined"
      :options="stockerOptions"
      :disabled="isLoading || stockers.length === 0"
      @update:model-value="onStockerSelect"
    />

    <!-- 5. 출고 PORT -->
    <BaseDropdownList
      label="출고 PORT"
      layout="horizontal"
      :model-value="selectedPort || undefined"
      :options="portOptions"
      :disabled="isLoading || ports.length === 0"
      @update:model-value="onPortSelect"
    />

    <!-- 6. 알려줄 PDA -->
    <BaseDropdownList
      label="알려줄 PDA"
      layout="horizontal"
      :model-value="selectedPda || undefined"
      :options="pdaOptions"
      :disabled="isLoading || pdas.length === 0"
      @update:model-value="onPdaSelect"
    />
  </section>
</template>

<script setup lang="ts">
import type { BaseDropdownValue, BaseOption } from 'src/components/base/dropdown-list';
import BaseDropdownList from 'src/components/base/dropdown-list/BaseDropdownList.vue';
import BaseInput from 'src/components/base/input/BaseInput.vue';
import { computed } from 'vue';

defineOptions({ name: 'ReTransferDetailCard' });

interface Props {
  currentStk: string;
  fabs: string[];
  selectedFab: string | null;
  bays: string[];
  selectedBay: string | null;
  stockers: string[];
  selectedStocker: string | null;
  ports: string[];
  selectedPort: string | null;
  pdas: string[];
  selectedPda: string | null;
  isLoading: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'select-fab', fab: string): void;
  (e: 'select-bay', bay: string): void;
  (e: 'update:selectedStocker', stocker: string): void;
  (e: 'update:selectedPort', port: string): void;
  (e: 'update:selectedPda', pda: string): void;
}>();

const fabOptions = computed<BaseOption[]>(() => props.fabs.map((f) => ({ label: f, value: f })));

const bayOptions = computed<BaseOption[]>(() => props.bays.map((b) => ({ label: b, value: b })));

const stockerOptions = computed<BaseOption[]>(() =>
  props.stockers.map((s) => ({ label: s, value: s })),
);

const portOptions = computed<BaseOption[]>(() => props.ports.map((p) => ({ label: p, value: p })));

const pdaOptions = computed<BaseOption[]>(() => props.pdas.map((p) => ({ label: p, value: p })));

function onFabSelect(val: BaseDropdownValue | undefined): void {
  emit('select-fab', val != null ? String(val) : '');
}

function onBaySelect(val: BaseDropdownValue | undefined): void {
  emit('select-bay', val != null ? String(val) : '');
}

function onStockerSelect(val: BaseDropdownValue | undefined): void {
  emit('update:selectedStocker', val != null ? String(val) : '');
}

function onPortSelect(val: BaseDropdownValue | undefined): void {
  emit('update:selectedPort', val != null ? String(val) : '');
}

function onPdaSelect(val: BaseDropdownValue | undefined): void {
  emit('update:selectedPda', val != null ? String(val) : '');
}
</script>

<style scoped>
.re-transfer-detail-divider {
  width: 100%;
  height: 1px;
  background-color: var(--border-border-primary);
  margin: var(--spacing-space-1) 0;
}
</style>
