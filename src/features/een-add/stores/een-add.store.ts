import { defineStore } from 'pinia';
import { ref } from 'vue';

import type { EenAddSettingResult } from '../types/een-add.types';

export const useEenAddStore = defineStore('een-add', () => {
  const returnLotId = ref('');
  const settingResult = ref<EenAddSettingResult | null>(null);

  function setReturnLotId(lotId: string): void {
    returnLotId.value = lotId;
  }

  function consumeReturnLotId(): string {
    const lotId = returnLotId.value;
    returnLotId.value = '';
    return lotId;
  }

  function setSettingResult(result: EenAddSettingResult): void {
    settingResult.value = structuredClone(result);
  }

  function consumeSettingResult(lotId: string): EenAddSettingResult | null {
    const result = settingResult.value;
    settingResult.value = null;

    return result?.lotId === lotId ? result : null;
  }

  return { consumeReturnLotId, consumeSettingResult, setReturnLotId, setSettingResult };
});
