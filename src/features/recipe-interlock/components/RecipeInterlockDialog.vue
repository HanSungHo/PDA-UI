<template>
  <BaseModal
    class="recipe-interlock-dialog"
    :open="open"
    title="RECIPE 진행 오류"
    width="100%"
    :closable="false"
    :overlay-closable="false"
    @update:open="handleOpenChange"
  >
    <template #title>
      <h1 class="recipe-interlock-title">RECIPE 진행 오류</h1>
    </template>

    <div class="recipe-interlock-container">
      <div class="recipe-interlock-banner" role="alert" aria-live="polite">
        <p class="recipe-interlock-banner-text" data-testid="txt-notice">
          예약된 Recipe 와 진행되는 Recipe가 다릅니다
        </p>
      </div>

      <BaseInput
        :model-value="txtReceiverMACHINEValue"
        label="장비명"
        readonly
        class="recipe-interlock-field"
        data-testid="txt-receiver-machine-value"
      />

      <BaseInput
        :model-value="txtReceiverLOTIDValue"
        label="LOTID"
        readonly
        class="recipe-interlock-field"
        data-testid="txt-receiver-lotid-value"
      />

      <BaseInput
        :model-value="txtReceiverRemoteRecipeValue"
        label="Remote Recipe"
        readonly
        class="recipe-interlock-field"
        data-testid="txt-receiver-remote-recipe-value"
      />

      <BaseInput
        :model-value="txtReceiverProcessRecipeValue"
        label="Process Recipe"
        readonly
        :class="[
          'recipe-interlock-field',
          { 'recipe-interlock-field--mismatch': isRecipeMismatch },
        ]"
        data-testid="txt-receiver-process-recipe-value"
      />

      <BaseInput
        :model-value="txtReceiverTIMEValue"
        label="발생 시간"
        readonly
        class="recipe-interlock-field"
        data-testid="txt-receiver-time-value"
      />
    </div>

    <template #footer>
      <BaseButton
        class="recipe-interlock-btn-ok"
        variant="link"
        size="large"
        :loading="loading"
        data-testid="btn-ok"
        @click="setData"
      >
        OK
      </BaseButton>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { BaseButton, BaseInput, BaseModal } from 'src/components/base';
import type {
  RecipeInterlockDialogEmits,
  RecipeInterlockDialogProps,
} from 'src/features/recipe-interlock/types/recipe-interlock.types';

import { useRecipeInterlock } from '../composables/useRecipeInterlock';

defineOptions({ name: 'RecipeInterlockDialog' });

const props = defineProps<RecipeInterlockDialogProps>();
const emit = defineEmits<RecipeInterlockDialogEmits>();

const {
  txtReceiverMACHINEValue,
  txtReceiverLOTIDValue,
  txtReceiverRemoteRecipeValue,
  txtReceiverProcessRecipeValue,
  txtReceiverTIMEValue,
  isRecipeMismatch,
  loading,
  setData,
  finish,
} = useRecipeInterlock(
  () => props.receiverMessage,
  () => {
    emit('update:open', false);
    emit('confirm');
  },
);

function handleOpenChange(open: boolean): void {
  if (!open) void finish();
}
</script>

<style src="../styles/recipe-interlock.css"></style>
