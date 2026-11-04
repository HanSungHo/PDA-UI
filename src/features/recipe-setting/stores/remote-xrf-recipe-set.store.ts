import { defineStore } from 'pinia';
import { ref } from 'vue';

import type { RemoteXrfRecipeResult } from '../types/remote-xrf-recipe-set.types';

/**
 * Holds the 등록 (save) result until RemoteXrfActivity's parent screen is migrated
 * and can read it (equivalent to onActivityResult in Android). The parent screen
 * must call clearResult() after consuming it so stale results aren't re-read.
 */
export const useRemoteXrfRecipeSetStore = defineStore('remote-xrf-recipe-set', () => {
  const result = ref<RemoteXrfRecipeResult | null>(null);

  function setResult(value: RemoteXrfRecipeResult): void {
    result.value = value;
  }

  function clearResult(): void {
    result.value = null;
  }

  return { result, setResult, clearResult };
});
