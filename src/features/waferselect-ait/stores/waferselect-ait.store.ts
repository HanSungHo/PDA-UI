import { defineStore } from 'pinia';
import { ref } from 'vue';

import type { WaferSelectAitInput, WaferSelectAitResult } from '../types/waferselect-ait.types';

export const useWaferSelectAitStore = defineStore('waferselect-ait', () => {
  const input = ref<WaferSelectAitInput>();
  const result = ref<WaferSelectAitResult>();

  function start(extras: WaferSelectAitInput): void {
    input.value = { ...extras };
    result.value = undefined;
  }

  function complete(value: WaferSelectAitResult): void {
    result.value = value;
    input.value = undefined;
  }

  function cancel(): void {
    input.value = undefined;
    result.value = undefined;
  }

  function consumeResult(): WaferSelectAitResult | undefined {
    const value = result.value;
    result.value = undefined;
    return value;
  }

  return { input, result, start, complete, cancel, consumeResult };
});
