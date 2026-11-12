<template>
  <BaseModal
    :open="open"
    title="PR EMPTY INTERLOCK"
    :closable="false"
    :overlay-closable="false"
    back-closable
    @update:open="handleOpenChange"
  >
    <BaseInput
      :model-value="txtPREMPTYTimeResult"
      label="TIME"
      readonly
      data-testid="txt-prempty-time-result"
    />

    <BaseInput
      :model-value="txtPREMPTYLevelResult"
      label="ALARM_LEVEL"
      readonly
      data-testid="txt-prempty-level-result"
    />

    <BaseInput
      :model-value="txtPREMPTYMcahineResult"
      label="MACHINE"
      readonly
      data-testid="txt-prempty-mcahine-result"
    />

    <BaseInput
      :model-value="txtPREMPTYModelResult"
      label="MODEL"
      readonly
      data-testid="txt-prempty-model-result"
    />

    <BaseInput
      :model-value="txtPREMPTYFacilityResult"
      label="FACILITY"
      readonly
      data-testid="txt-prempty-facility-result"
    />

    <BaseInput
      :model-value="txtPREMPTYPumpidResult"
      label="PUMP_ID"
      readonly
      data-testid="txt-prempty-pumpid-result"
    />

    <BaseInput
      :model-value="txtPREMPTYPumpnameResult"
      label="PUMP_NAME"
      readonly
      data-testid="txt-prempty-pumpname-result"
    />

    <BaseInput
      :model-value="txtPREMPTYDescResult"
      label="DESC"
      readonly
      data-testid="txt-prempty-desc-result"
    />
    <template #footer>
      <BaseButton
        variant="link"
        size="medium"
        label="Ok"
        data-testid="btn-ok"
        :loading="loading"
        @click="setData"
      />
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { BaseButton, BaseInput, BaseModal } from 'src/components/base';
import type {
  PremptyDialogEmits,
  PremptyDialogProps,
} from 'src/features/prempty/types/prempty-interlock.types';

import { usePREmpty } from '../composables/usePrempty';

defineOptions({ name: 'PremptyDialog' });

const props = defineProps<PremptyDialogProps>();
const emit = defineEmits<PremptyDialogEmits>();

const {
  txtPREMPTYTimeResult,
  txtPREMPTYLevelResult,
  txtPREMPTYMcahineResult,
  txtPREMPTYModelResult,
  txtPREMPTYFacilityResult,
  txtPREMPTYPumpidResult,
  txtPREMPTYPumpnameResult,
  txtPREMPTYDescResult,
  loading,
  setData,
  finish,
} = usePREmpty(
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
