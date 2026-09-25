import { defineStore } from 'pinia';
import { ref } from 'vue';

import {
  mockWaferSkipInput,
  type WaferSkipInput,
  type WaferSkipResult,
} from '../types/wafer-skip.types';

const MAX_REASON_COUNT = 11; //based on legacy app logic

export interface WaferSkipIntentExtras {
  waferQty: string;
  machineQty: string;
  reasonList: string;
}

interface ReasonListItem {
  typeValue: string;
}

export const useWaferSkipStore = defineStore('wafer-skip', () => {
  const input = ref<WaferSkipInput>();
  const result = ref<WaferSkipResult>();

  function start(extras: WaferSkipIntentExtras): void {
    input.value = {
      waferQty: extras.waferQty,
      machineQty: extras.machineQty,
      reasonList: parseReasonList(extras.reasonList),
    };
    result.value = undefined;
  }

  function loadMock(): void {
    input.value = {
      ...mockWaferSkipInput,
      reasonList: [...mockWaferSkipInput.reasonList],
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
    loadMock,
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
      const reason = (item as ReasonListItem)?.typeValue;
      return typeof reason === 'string' ? [reason] : [];
    });
  } catch {
    return [];
  }
}
