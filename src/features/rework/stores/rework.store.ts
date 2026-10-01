import { defineStore } from 'pinia';
import { ref } from 'vue';

import type { ReworkResult } from '../types/rework.types';

/**
 * Mirrors the legacy ReworkActivity result contract:
 *   - success → setResult(RESULT_OK)  + finish()
 *   - cancel  → finish()  (RESULT_CANCELED by default)
 *
 * The caller screen reads `result` after router.back() to decide whether
 * it needs to refresh (same pattern as wafer-select / wafer-skip stores).
 */
export const useReworkStore = defineStore('rework', () => {
  const result = ref<ReworkResult>();

  function complete(value: ReworkResult): void {
    result.value = value;
  }

  function cancel(lotId: string): void {
    result.value = { status: 'canceled', lotId };
  }

  function clearResult(): void {
    result.value = undefined;
  }

  return {
    cancel,
    clearResult,
    complete,
    result,
  };
});
