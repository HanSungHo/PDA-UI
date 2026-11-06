import { defineStore } from 'pinia';
import { ref } from 'vue';

import type { MachineStatusBayItem, MachineStatusEqpItem } from '../types/machine-status.types';

export const useMachineStatusStore = defineStore('machine-status', () => {
  const bays = ref<MachineStatusBayItem[]>([]);
  const selectedBay = ref<string | null>(null);
  const eqpId = ref('');
  const rows = ref<MachineStatusEqpItem[]>([]);
  const isLoading = ref(false);
  const hasLoadedBays = ref(false);
  const hasDetailResult = ref(false);

  function markDetailResultOk(): void {
    hasDetailResult.value = true;
  }

  function consumeDetailResult(): boolean {
    const result = hasDetailResult.value;
    hasDetailResult.value = false;
    return result;
  }

  function resetState(): void {
    bays.value = [];
    selectedBay.value = null;
    eqpId.value = '';
    rows.value = [];
    isLoading.value = false;
    hasLoadedBays.value = false;
    hasDetailResult.value = false;
  }

  return {
    bays,
    selectedBay,
    eqpId,
    rows,
    isLoading,
    hasLoadedBays,
    markDetailResultOk,
    consumeDetailResult,
    resetState,
  };
});
