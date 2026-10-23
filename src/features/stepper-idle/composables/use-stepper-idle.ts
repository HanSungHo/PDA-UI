import { computed } from 'vue';

import { parseStepperIdleMessage } from '../utils/stepper-idle-parser';

/**
 * Composable for StepperIdle dialog.
 * Encapsulates UDP message parsing and derived display data.
 *
 * Mirrors legacy StepperIDLEActivity.kt — receives raw receiverMessage,
 * parses INTERLOCKMANAGER XML, and exposes structured display fields.
 */
export function useStepperIdle(receiverMessage: () => string) {
  const data = computed(() => parseStepperIdleMessage(receiverMessage()));

  const sTime = computed(() => data.value.sTime);
  const sEqpid = computed(() => data.value.sEqpid);
  const sLotid = computed(() => data.value.sLotid);
  const sWafer = computed(() => data.value.sWafer);

  return { sTime, sEqpid, sLotid, sWafer };
}
