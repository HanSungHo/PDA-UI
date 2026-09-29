import { defineStore } from 'pinia';
import { ref } from 'vue';

import { waferSelectMocks } from '../mocks/wafer-select.mock';
import {
  defaultWaferSelectInput,
  type WaferSelectInput,
  type WaferSelectResult,
} from '../types/wafer-select.types';

export interface WaferSelectIntentExtras {
  SEQUENCE?: string;
  FIXEDCOUNT?: string | number;
  LOTID?: string;
  CATEGORY?: string;
  EDITABLE?: string;
  AREA?: string;
  EXISTWAFERLIST?: string;
  DISABLEWAFERLIST?: string;
  SELECTWAFERLIST?: string;
}

export const useWaferSelectStore = defineStore('wafer-select', () => {
  const input = ref<WaferSelectInput>();
  const result = ref<WaferSelectResult>();

  function start(extras: WaferSelectIntentExtras): void {
    input.value = normalizeInput(extras);
    result.value = undefined;
  }

  function complete(value: WaferSelectResult): void {
    result.value = value;
  }

  function clear(): void {
    input.value = undefined;
    result.value = undefined;
  }

  function clearResult(): void {
    result.value = undefined;
  }
  function loadMock(mockName: 'basic' | 'diffArea' | 'readonly' | 'count' | 'disabled'): void {
    switch (mockName) {
      case 'basic':
        start(waferSelectMocks.basic());
        break;

      case 'diffArea':
        start(waferSelectMocks.diffArea());
        break;

      case 'readonly':
        start(waferSelectMocks.readonly());
        break;

      case 'count':
        start(waferSelectMocks.count());
        break;

      case 'disabled':
        start(waferSelectMocks.disabled());
        break;
    }
  }

  return {
    clear,
    clearResult,
    complete,
    input,
    result,
    start,

    loadMock,
  };
});

function normalizeInput(extras: WaferSelectIntentExtras): WaferSelectInput {
  const category = normalizeCategory(extras.CATEGORY);
  const fixedCount = Number(extras.FIXEDCOUNT ?? 0);

  return {
    ...defaultWaferSelectInput,
    sequence: extras.SEQUENCE?.trim() ?? '',
    fixedCount: Number.isFinite(fixedCount) && fixedCount > 0 ? fixedCount : 0,
    lotId: extras.LOTID?.trim() ?? '',
    category,
    editable: extras.EDITABLE !== 'N',
    area: extras.AREA?.trim() ?? '',
    existingWaferList: extras.EXISTWAFERLIST ?? '',
    disableWaferList: extras.DISABLEWAFERLIST ?? '',
    selectWaferList: extras.SELECTWAFERLIST ?? '',
  };
}

function normalizeCategory(value: string | undefined): WaferSelectInput['category'] {
  if (value === 'COUNT' || value === 'SLOT') {
    return value;
  }

  return '';
}
