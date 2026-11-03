import { defineStore } from 'pinia';
import { ref } from 'vue';

import type { WetAutoSessionState } from '../types/wet-auto.types';

export const useWetAutoStore = defineStore('wet-auto', () => {
  const sessionState = ref<WetAutoSessionState>();

  function copySessionState(state: WetAutoSessionState): WetAutoSessionState {
    return {
      ...state,
      equipment: state.equipment ? { ...state.equipment } : undefined,
      frontLot: { ...state.frontLot },
      rearLot: { ...state.rearLot },
      bayOptions: [...state.bayOptions],
      stockerOptions: [...state.stockerOptions],
    };
  }

  function saveSessionState(state: WetAutoSessionState): void {
    sessionState.value = copySessionState(state);
  }

  function consumeSessionState(): WetAutoSessionState | undefined {
    const state = sessionState.value;
    sessionState.value = undefined;
    return state ? copySessionState(state) : undefined;
  }

  function clearSessionState(): void {
    sessionState.value = undefined;
  }

  return { saveSessionState, consumeSessionState, clearSessionState };
});
