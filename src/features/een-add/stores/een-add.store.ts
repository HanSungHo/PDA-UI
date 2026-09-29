import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useEenAddStore = defineStore('een-add', () => {
  const returnLotId = ref('');

  function setReturnLotId(lotId: string): void {
    returnLotId.value = lotId;
  }

  function consumeReturnLotId(): string {
    const lotId = returnLotId.value;
    returnLotId.value = '';
    return lotId;
  }

  return { consumeReturnLotId, setReturnLotId };
});
