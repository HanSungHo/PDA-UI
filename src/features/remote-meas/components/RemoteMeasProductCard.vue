<template>
  <section class="remote-meas-card remote-meas-card--product" aria-label="계측 진행 정보">
    <!-- Row 1: LOT No. & PORT 상태 -->
    <div class="remote-meas-card__row">
      <BaseInput class="remote-meas-card__field" label="LOT No." :model-value="lotId" disabled />
      <BaseInput
        class="remote-meas-card__field"
        label="PORT 상태"
        :model-value="portState || ''"
        disabled
      />
    </div>

    <!-- Row 2: 진행장비 -->
    <div class="remote-meas-card__row">
      <BaseInput
        ref="machineInputRef"
        class="remote-meas-card__field"
        label="진행장비"
        :model-value="procEqpId"
        :disabled="isMachineDisabled || isLoading"
        placeholder="장비명 입력"
        @update:model-value="onMachineInput"
        @keydown.enter.prevent="onMachineEnter"
      />
    </div>

    <!-- Row 3: PORT & 초기화 -->
    <div class="remote-meas-card__row remote-meas-card__row--action">
      <BaseDropdownList
        class="remote-meas-card__field"
        label="PORT"
        :model-value="selectedPort || undefined"
        :options="portOptions"
        :disabled="isPortDisabled || isLoading || portOptions.length === 0"
        @update:model-value="onPortChange"
      />
      <BaseButton
        class="remote-meas-card__btn-action"
        variant="secondary"
        size="medium"
        label="초기화"
        :disabled="!isClearPortEnabled || isLoading"
        @click="$emit('clear-port')"
      />
    </div>

    <!-- Row 4: FLAG -->
    <div class="remote-meas-card__row">
      <BaseDropdownList
        class="remote-meas-card__field"
        label="FLAG"
        :model-value="selectedFlag || undefined"
        :options="flagOptions"
        :disabled="isLoading"
        @update:model-value="onFlagChange"
      />
    </div>

    <!-- Row 5: 진행 RCP -->
    <div class="remote-meas-card__row">
      <BaseInput
        class="remote-meas-card__field"
        label="진행 RCP"
        :model-value="recipeName"
        disabled
      />
    </div>

    <!-- Row 6: 생산장비 & WF 선택 -->
    <div class="remote-meas-card__row remote-meas-card__row--action">
      <BaseInput
        class="remote-meas-card__field"
        label="생산장비"
        :model-value="prodMachine"
        :disabled="isLoading"
        placeholder="생산장비 입력"
        @update:model-value="onProdMachineInput"
        @keydown.enter.prevent="onProdMachineEnter"
      />
      <BaseButton
        class="remote-meas-card__btn-action"
        variant="secondary"
        size="medium"
        label="WF 선택"
        :disabled="isLoading"
        @click="$emit('select-wafer')"
      />
    </div>

    <!-- Row 7: 측정 장수 & 선택된 WF 리스트 -->
    <div class="remote-meas-card__row remote-meas-card__row--action">
      <BaseInput
        class="remote-meas-card__field"
        label="측정 장수"
        :model-value="waferCount != null ? String(waferCount) : ''"
        disabled
      />
      <BaseInput
        class="remote-meas-card__field"
        aria-label="선택 WF"
        :model-value="selectedWaferList"
        disabled
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { BaseButton, BaseDropdownList, BaseInput } from 'src/components/base';
import type { BaseDropdownValue, BaseOption } from 'src/components/base/dropdown-list';
import type { BaseInputValue } from 'src/components/base/input';
import { ref } from 'vue';

defineOptions({ name: 'RemoteMeasProductCard' });

defineProps<{
  lotId: string;
  portState: string;
  portStatusKind?: string;
  procEqpId: string;
  isMachineDisabled: boolean;
  selectedPort: string;
  portOptions: BaseOption[];
  isPortDisabled: boolean;
  isClearPortEnabled: boolean;
  selectedFlag: string;
  flagOptions: BaseOption[];
  recipeName: string;
  prodMachine: string;
  waferCount: number;
  selectedWaferList: string;
  isLoading: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:procEqpId', val: string): void;
  (e: 'update:selectedPort', val: string): void;
  (e: 'update:selectedFlag', val: string): void;
  (e: 'update:prodMachine', val: string): void;
  (e: 'machine-enter'): void;
  (e: 'prod-machine-enter'): void;
  (e: 'clear-port'): void;
  (e: 'select-wafer'): void;
}>();

const machineInputRef = ref<{ focus?: () => void } | null>(null);

function onMachineInput(val: BaseInputValue): void {
  emit('update:procEqpId', val != null ? String(val) : '');
}

function onProdMachineInput(val: BaseInputValue): void {
  emit('update:prodMachine', val != null ? String(val) : '');
}

function onMachineEnter(): void {
  emit('machine-enter');
}

function onProdMachineEnter(): void {
  emit('prod-machine-enter');
}

function onPortChange(val: BaseDropdownValue): void {
  emit('update:selectedPort', val != null ? String(val) : '');
}

function onFlagChange(val: BaseDropdownValue): void {
  emit('update:selectedFlag', val != null ? String(val) : '');
}

defineExpose({
  focusMachineInput: () => machineInputRef.value?.focus?.(),
});
</script>
