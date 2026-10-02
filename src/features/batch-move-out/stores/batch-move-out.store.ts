import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface BatchMoveOutResult {
  ok: true;
  lotId?: string;
}

export const useBatchMoveOutStore = defineStore('batch-move-out', () => {
  const result = ref<BatchMoveOutResult>();

  function complete(value: BatchMoveOutResult): void {
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
