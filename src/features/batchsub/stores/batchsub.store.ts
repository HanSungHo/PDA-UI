import { defineStore } from 'pinia';
import { ref } from 'vue';

import type { BatchsubResult } from '../types/batchsub.types';

export const useBatchsubStore = defineStore('batchsub', () => {
  const result = ref<BatchsubResult>();

  function complete(value: BatchsubResult): void {
    result.value = value;
  }

  function cancel(): void {
    complete({ JALOTNAME: '' });
  }

  function clearResult(): void {
    result.value = undefined;
  }

  return {
    result,
    complete,
    cancel,
    clearResult,
  };
});
