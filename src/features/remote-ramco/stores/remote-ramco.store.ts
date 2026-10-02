import { defineStore } from 'pinia';
import { ref } from 'vue';

import type { RemoteLotDetails } from '../composables/useRemoteRamco';
import type { WetRemoteEqpInfoResponse } from '../types/remote-ramco.types';

export interface RemoteRamcoSessionState {
  equipmentInput: string;
  selectedRecipe: string;
  recipes?: string[];
  selectedPort: string;
  ports?: string[];
  portState: string;
  portAck: string;
  frontLot: RemoteLotDetails;
  rearLot: RemoteLotDetails;
  rearLotInput: string;
  rearLotEnabled: boolean;
  clearPortEnabled: boolean;
  startEnabled: boolean;
  equipment?: WetRemoteEqpInfoResponse;
  commentSide?: 'front' | 'rear';
}

const RAMCO_SESSION_KEY = 'hf_remote_ramco_session';

export const useRemoteRamcoStore = defineStore('remote-ramco', () => {
  const returnLotId = ref('');

  function setReturnLotId(lotId: string): void {
    returnLotId.value = lotId;
  }

  function consumeReturnLotId(): string {
    const lotId = returnLotId.value;
    returnLotId.value = '';
    return lotId;
  }

  function saveSessionState(state: RemoteRamcoSessionState): void {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(RAMCO_SESSION_KEY, JSON.stringify(state));
    }
  }

  function consumeSessionState(): RemoteRamcoSessionState | null {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return null;
    }
    const raw = window.sessionStorage.getItem(RAMCO_SESSION_KEY);
    if (!raw) {
      return null;
    }
    window.sessionStorage.removeItem(RAMCO_SESSION_KEY);
    try {
      return JSON.parse(raw) as RemoteRamcoSessionState;
    } catch {
      return null;
    }
  }

  return {
    returnLotId,
    setReturnLotId,
    consumeReturnLotId,
    saveSessionState,
    consumeSessionState,
  };
});
