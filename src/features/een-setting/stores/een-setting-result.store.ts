import { defineStore } from 'pinia';
import { ref } from 'vue';

import type { EENSettingItem } from '../types/een-setting.types';

export interface EENModifyResultPayload {
  lotId: string;
  item: EENSettingItem;
}

export const useEENSettingResultStore = defineStore('eenSettingResult', () => {
  const pendingModifyResult = ref<EENModifyResultPayload | null>(null);

  function publishModifyResult(result: EENModifyResultPayload): void {
    pendingModifyResult.value = structuredClone(result);
  }

  function consumeModifyResult(lotId: string): EENModifyResultPayload | null {
    const result = pendingModifyResult.value;
    pendingModifyResult.value = null;

    return result?.lotId === lotId ? result : null;
  }

  return { pendingModifyResult, publishModifyResult, consumeModifyResult };
});
