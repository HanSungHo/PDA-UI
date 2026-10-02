import { defineStore } from 'pinia';
import { ref } from 'vue';

import { type WaferSkipInput, type WaferSkipResult } from '../types/wafer-skip.types';

const MAX_REASON_COUNT = 11; //based on legacy app logic

export interface WaferSkipIntentExtras {
  lotId?: string;
  waferQty: string;
  machineQty: string;
  reasonList: string;
}

interface ReasonListItem {
  TYPEVALUE?: string;
}

export const useWaferSkipStore = defineStore('wafer-skip', () => {
  const input = ref<WaferSkipInput>();
  const result = ref<WaferSkipResult>();

  function start(extras: WaferSkipIntentExtras): void {
    input.value = {
      lotId: extras.lotId ?? '',
      waferQty: extras.waferQty,
      machineQty: extras.machineQty,
      reasonList: parseReasonList(extras.reasonList),
    };
    result.value = undefined;
  }

  function complete(value: WaferSkipResult): void {
    result.value = value;
  }

  function clear(): void {
    input.value = undefined;
  }
  function clearResult(): void {
    result.value = undefined;
  }

  return {
    clear,
    clearResult,
    complete,
    input,
    result,
    start,
  };
});

function parseReasonList(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.slice(0, MAX_REASON_COUNT).flatMap((item) => {
      const reasonItem = item as ReasonListItem;
      const reason = reasonItem.TYPEVALUE;
      return typeof reason === 'string' ? [reason] : [];
    });
  } catch {
    return [];
  }
}
