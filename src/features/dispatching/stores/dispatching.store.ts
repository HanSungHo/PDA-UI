import { defineStore } from 'pinia';
import { ref } from 'vue';

import type { DispatchingRow } from '../types/dispatching.types';

export interface DispatchingScreenState {
  hiddenColumns: string[];
  machineName: string;
  reserved: boolean;
  rows: DispatchingRow[];
  selectedRowIndexes: number[];
  wet: string;
}

export const useDispatchingStore = defineStore('dispatching', () => {
  const state = ref<DispatchingScreenState>();

  function save(value: DispatchingScreenState): void {
    state.value = {
      ...value,
      hiddenColumns: [...value.hiddenColumns],
      rows: [...value.rows],
      selectedRowIndexes: [...value.selectedRowIndexes],
    };
  }

  function clear(): void {
    state.value = undefined;
  }

  return { clear, save, state };
});
