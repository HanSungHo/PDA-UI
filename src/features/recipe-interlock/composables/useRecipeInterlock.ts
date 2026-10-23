import { useMainStore } from 'src/features/main/stores/main.store';
import { computed, ref, watch } from 'vue';

import {
  formatCurrentTime,
  formatMasterTime,
  parseRecipeInterlockMessage,
  sendIntlkPopupCheck,
} from '../services/recipe-interlock.service';

export function useRecipeInterlock(receiverMessage: () => string, onFinish: () => void) {
  const mainStore = useMainStore();
  const currentMessage = computed(receiverMessage);

  const txtReceiverMACHINEValue = ref('');
  const txtReceiverLOTIDValue = ref('');
  const txtReceiverRemoteRecipeValue = ref('');
  const txtReceiverProcessRecipeValue = ref('');
  const txtReceiverTIMEValue = ref('');

  const loading = ref(false);
  const errorMessage = ref('');
  let closing = false;
  function loadFromMessage(msg?: string) {
    const data = parseRecipeInterlockMessage(msg);
    txtReceiverMACHINEValue.value = data.machine;
    txtReceiverLOTIDValue.value = data.lotid;
    txtReceiverRemoteRecipeValue.value = data.rRecipe;
    txtReceiverProcessRecipeValue.value = data.pRecipe;
    txtReceiverTIMEValue.value = data.time;
  }

  watch(
    currentMessage,
    (newVal) => {
      closing = false;
      loadFromMessage(newVal);
    },
    { immediate: true },
  );

  const isRecipeMismatch = computed(() => {
    return (
      Boolean(txtReceiverProcessRecipeValue.value) &&
      Boolean(txtReceiverRemoteRecipeValue.value) &&
      txtReceiverProcessRecipeValue.value !== txtReceiverRemoteRecipeValue.value
    );
  });

  function finish(): void {
    if (closing) return;
    closing = true;
    onFinish();
  }

  async function setData(): Promise<void> {
    if (loading.value) return;
    loading.value = true;
    errorMessage.value = '';

    const sMasterTime = formatMasterTime(txtReceiverTIMEValue.value);
    const sDeviceName = mainStore.deviceName || 'PDA';
    const sUsers = mainStore.operatorId || 'OPERATOR_ID';
    const sCurrentTime = formatCurrentTime();
    const sEqpid = txtReceiverMACHINEValue.value;
    const sRecipe = txtReceiverRemoteRecipeValue.value;

    try {
      const response = await sendIntlkPopupCheck({
        masterTime: sMasterTime,
        deviceName: sDeviceName,
        users: sUsers,
        currentTime: sCurrentTime,
        eqpId: sEqpid,
        recipe: sRecipe,
        lotId: 'NULL',
        slot: 'NULL',
      });

      if (!response.isSuccess && response.message) {
        errorMessage.value = response.message;
      }
    } catch (err) {
      errorMessage.value = err instanceof Error ? err.message : String(err);
    } finally {
      loading.value = false;
      finish();
    }
  }

  return {
    receiverMessage: currentMessage,
    txtReceiverMACHINEValue,
    txtReceiverLOTIDValue,
    txtReceiverRemoteRecipeValue,
    txtReceiverProcessRecipeValue,
    txtReceiverTIMEValue,
    isRecipeMismatch,
    loading,
    errorMessage,
    setData,
    finish,
    loadFromMessage,
  };
}
