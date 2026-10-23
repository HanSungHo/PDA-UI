<template>
  <AlarmCommonPopup />
  <StepperIdleDialog
    :open="stepperIdleOpen"
    :receiver-message="stepperIdleMessage"
    @update:open="closeStepperIdlePopup"
    @confirm="closeStepperIdlePopup"
  />
</template>

<script setup lang="ts">
import AlarmCommonPopup from '../features/alarm-common-popup/components/AlarmCommonPopup.vue';
import StepperIdleDialog from '../features/stepper-idle/components/StepperIdleDialog.vue';
import { closeStepperIdlePopup, stepperIdlePopup } from '../services/udp-receiver.service';

const { open: stepperIdleOpen, receiverMessage: stepperIdleMessage } = stepperIdlePopup;
</script>
