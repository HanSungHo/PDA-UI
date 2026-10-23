<template>
  <AlarmCommonPopup />
  <EQPspcOverlay v-if="activeEQPspcEvent" :key="activeEQPspcEvent.id" :event="activeEQPspcEvent" />
  <StepperIdleDialog
    :open="stepperIdleOpen"
    :receiver-message="stepperIdleMessage"
    @update:open="closeStepperIdlePopup"
    @confirm="closeStepperIdlePopup"
  />
  <RecipeInterlockDialog
    :open="recipeInterlockPopup.open.value"
    :receiver-message="recipeInterlockPopup.receiverMessage.value"
    @update:open="closeRecipeInterlockPopup"
    @confirm="closeRecipeInterlockPopup"
  />
</template>

<script setup lang="ts">
import AlarmCommonPopup from '../features/alarm-common-popup/components/AlarmCommonPopup.vue';
import EQPspcOverlay from '../features/eqp-spc/components/EQPspcOverlay.vue';
import { activeEQPspcEvent } from '../features/eqp-spc/eqp-spc.service';
import RecipeInterlockDialog from '../features/recipe-interlock/components/RecipeInterlockDialog.vue';
import StepperIdleDialog from '../features/stepper-idle/components/StepperIdleDialog.vue';
import {
  closeRecipeInterlockPopup,
  closeStepperIdlePopup,
  recipeInterlockPopup,
  stepperIdlePopup,
} from '../services/udp-receiver.service';

const { open: stepperIdleOpen, receiverMessage: stepperIdleMessage } = stepperIdlePopup;
</script>
