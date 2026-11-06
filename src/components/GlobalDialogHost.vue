<template>
  <AlarmCommonPopup />
  <EQPspcOverlay v-if="activeEQPspcEvent" :key="activeEQPspcEvent.id" :event="activeEQPspcEvent" />
  <MDSSpcOverlay v-if="activeMDSSpcEvent" :key="activeMDSSpcEvent.id" :event="activeMDSSpcEvent" />
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
  <PremptyDialog
    :open="premptyPopup.open.value"
    :receiver-message="premptyPopup.receiverMessage.value"
    @update:open="closePremptyPopup"
    @confirm="closePremptyPopup"
  />
  <OkDialog
    :open="okDialog.isOpen.value"
    :title="okDialog.title.value"
    :message="okDialog.message.value"
    :confirm-label="okDialog.confirmLabel.value"
    @confirm="okDialog.confirm"
  />
  <OkCancelDialog
    :open="okCancelDialog.isOpen.value"
    :title="okCancelDialog.title.value"
    :message="okCancelDialog.message.value"
    :ok-label="okCancelDialog.okLabel.value"
    :cancel-label="okCancelDialog.cancelLabel.value"
    @ok="okCancelDialog.ok"
    @cancel="okCancelDialog.cancel"
  />
</template>

<script setup lang="ts">
import AlarmCommonPopup from '../features/alarm-common-popup/components/AlarmCommonPopup.vue';
import EQPspcOverlay from '../features/eqp-spc/components/EQPspcOverlay.vue';
import { activeEQPspcEvent } from '../features/eqp-spc/eqp-spc.service';
import MDSSpcOverlay from '../features/mds-spc/components/MDSSpcOverlay.vue';
import { activeMDSSpcEvent } from '../features/mds-spc/mds-spc.service';
import PremptyDialog from '../features/prempty/components/PremptyDialog.vue';
import RecipeInterlockDialog from '../features/recipe-interlock/components/RecipeInterlockDialog.vue';
import StepperIdleDialog from '../features/stepper-idle/components/StepperIdleDialog.vue';
import { okCancelDialog } from '../services/ok-cancel-dialog.service';
import { okDialog } from '../services/ok-dialog.service';
import {
  closePremptyPopup,
  closeRecipeInterlockPopup,
  closeStepperIdlePopup,
  premptyPopup,
  recipeInterlockPopup,
  stepperIdlePopup,
} from '../services/udp-receiver.service';
import OkCancelDialog from './OkCancelDialog.vue';
import OkDialog from './OkDialog.vue';

const { open: stepperIdleOpen, receiverMessage: stepperIdleMessage } = stepperIdlePopup;
</script>
