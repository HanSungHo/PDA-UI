import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { useMainStore } from 'src/features/main/stores/main.store';
import { computed, ref, watch } from 'vue';

import { DeviceInfo } from '~/constants/deviceinfo';

import { sendIntlkPopupCheck } from '../services/prempty-interlock.service';

dayjs.extend(customParseFormat);

export function usePREmpty(receiverMessage: () => string, onFinish: () => void) {
  const mainStore = useMainStore();
  const currentMessage = computed(receiverMessage);

  const txtPREMPTYTimeResult = ref<string>('');
  const txtPREMPTYLevelResult = ref<string>('');
  const txtPREMPTYMcahineResult = ref<string>('');
  const txtPREMPTYModelResult = ref<string>('');
  const txtPREMPTYFacilityResult = ref<string>('');
  const txtPREMPTYPumpidResult = ref<string>('');
  const txtPREMPTYPumpnameResult = ref<string>('');
  const txtPREMPTYDescResult = ref<string>('');

  const loading = ref<boolean>(false);
  const errorMessage = ref<string>('');
  let closing = false;

  function resetFields(): void {
    txtPREMPTYTimeResult.value = '';
    txtPREMPTYLevelResult.value = '';
    txtPREMPTYMcahineResult.value = '';
    txtPREMPTYModelResult.value = '';
    txtPREMPTYFacilityResult.value = '';
    txtPREMPTYPumpidResult.value = '';
    txtPREMPTYPumpnameResult.value = '';
    txtPREMPTYDescResult.value = '';
  }

  function parseReceiverMessage(message: string | null | undefined): void {
    resetFields();
    if (!message || !message.includes('INTERLOCKMANAGER')) {
      return;
    }

    const newReceiverMessage = message.split(/<Table[^>]*>/i);

    for (let data = 1; data < newReceiverMessage.length; data++) {
      const currentSegment = newReceiverMessage[data];

      if (!currentSegment) continue;

      const arryReceiverMessage = currentSegment.split('</');

      const timeSegment = arryReceiverMessage[0];
      if (timeSegment) {
        const time = timeSegment.substring(timeSegment.lastIndexOf('>') + 1);

        if (time > '0') {
          const plusIndex = time.indexOf('+');

          const normalizedTime =
            plusIndex !== -1
              ? time.substring(0, plusIndex).replace('T', ' ')
              : time.replace('T', ' ');

          txtPREMPTYTimeResult.value += normalizedTime;
        }
      }

      const levelSegment = arryReceiverMessage[2];
      if (levelSegment) {
        const alarmLevel = levelSegment.substring(levelSegment.lastIndexOf('>') + 1);

        if (alarmLevel > '0') {
          txtPREMPTYLevelResult.value += alarmLevel;
        }
      }

      const eqpidSegment = arryReceiverMessage[3];
      if (eqpidSegment) {
        const eqpidValue = eqpidSegment.substring(eqpidSegment.lastIndexOf('>') + 1);

        if (eqpidValue > '0') {
          txtPREMPTYMcahineResult.value += eqpidValue;
        }
      }

      const modelSegment = arryReceiverMessage[4];
      if (modelSegment) {
        const modelValue = modelSegment.substring(modelSegment.lastIndexOf('>') + 1);

        if (modelValue > '0') {
          txtPREMPTYModelResult.value += modelValue;
        }
      }

      const facilitySegment = arryReceiverMessage[5];
      if (facilitySegment) {
        const facilityValue = facilitySegment.substring(facilitySegment.lastIndexOf('>') + 1);

        if (facilityValue > '0') {
          txtPREMPTYFacilityResult.value += facilityValue;
        }
      }

      const pumpIdSegment = arryReceiverMessage[8];
      if (pumpIdSegment) {
        const pumpIDValue = pumpIdSegment.substring(pumpIdSegment.lastIndexOf('>') + 1);

        if (pumpIDValue > '0') {
          txtPREMPTYPumpidResult.value += pumpIDValue;
        }
      }

      const pumpNameSegment = arryReceiverMessage[9];
      if (pumpNameSegment) {
        const pumpNameValue = pumpNameSegment.substring(pumpNameSegment.lastIndexOf('>') + 1);

        if (pumpNameValue > '0') {
          txtPREMPTYPumpnameResult.value += pumpNameValue;
        }
      }

      const descSegment = arryReceiverMessage[10];
      if (descSegment) {
        const descValue = descSegment.substring(descSegment.lastIndexOf('>') + 1);

        if (descValue.length > 0 && (descValue.includes('[') || descValue.includes(']'))) {
          const match = descValue.match(/\[(.*?)\]/);

          if (match?.[1]) {
            txtPREMPTYDescResult.value += match[1];
          }
        }
      }
    }
  }

  watch(
    currentMessage,
    (newVal) => {
      closing = false;
      parseReceiverMessage(newVal);
    },
    { immediate: true },
  );

  function finish(): void {
    if (closing) return;
    closing = true;
    onFinish();
  }

  async function setData(): Promise<void> {
    if (loading.value) {
      return;
    }

    loading.value = true;
    errorMessage.value = '';

    try {
      const sDeviceName = mainStore.deviceName || DeviceInfo.DEVICE_NAME;

      const originalTime = txtPREMPTYTimeResult.value;

      let sMasterTime = originalTime;

      const parsedDate = dayjs(originalTime, 'YYYY-MM-DD HH:mm:ss.SSS', true);

      if (parsedDate.isValid()) {
        sMasterTime = parsedDate.format('YYYY/MM/DD_HH:mm:ss');
      }

      const sEqpid = txtPREMPTYMcahineResult.value;

      const sUsers = mainStore.operatorId || DeviceInfo.OPERATOR_ID;

      const sCurrentTime = dayjs().format('YYYY/MM/DD_HH:mm:ss');

      const response = await sendIntlkPopupCheck({
        masterTime: sMasterTime,
        deviceName: sDeviceName,
        users: sUsers,
        currentTime: sCurrentTime,
        eqpId: sEqpid,
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
    txtPREMPTYTimeResult,
    txtPREMPTYLevelResult,
    txtPREMPTYMcahineResult,
    txtPREMPTYModelResult,
    txtPREMPTYFacilityResult,
    txtPREMPTYPumpidResult,
    txtPREMPTYPumpnameResult,
    txtPREMPTYDescResult,
    loading,
    errorMessage,
    setData,
    finish,
  };
}
