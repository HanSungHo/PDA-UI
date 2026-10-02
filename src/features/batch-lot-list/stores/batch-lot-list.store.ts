import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface BatchLotListResult {
  lotId: string;
}

export const useBatchLotListStore = defineStore('batch-lot-list', () => {
  const result = ref<BatchLotListResult>();

  function complete(value: BatchLotListResult): void {
    result.value = value;
  }

  function clearResult(): void {
    result.value = undefined;
  }

  return {
    clearResult,
    complete,
    result,
  };
});
