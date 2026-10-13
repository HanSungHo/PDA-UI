import { defineStore } from 'pinia';
import { ref } from 'vue';

import type { RemoteFurnaceKjDraft } from '../types/remote-furnace-kj.types';

export const useRemoteFurnaceKjStore = defineStore('remote-furnace-kj', () => {
  const returnLotId = ref('');
  const draft = ref<RemoteFurnaceKjDraft>();

  function setReturnLotId(lotId: string): void {
    returnLotId.value = lotId;
  }

  function consumeReturnLotId(): string {
    const lotId = returnLotId.value;
    returnLotId.value = '';
    return lotId;
  }

  function setDraft(value: RemoteFurnaceKjDraft): void {
    draft.value = value;
  }

  function consumeDraft(lotId: string): RemoteFurnaceKjDraft | undefined {
    if (draft.value?.lotId !== lotId) {
      draft.value = undefined;
      return undefined;
    }
    const value = draft.value;
    draft.value = undefined;
    return value;
  }

  return { returnLotId, setReturnLotId, consumeReturnLotId, draft, setDraft, consumeDraft };
});
