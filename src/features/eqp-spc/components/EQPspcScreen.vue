<template>
  <BaseModal
    class="eqp-spc-modal"
    :open="true"
    :title="EQP_SPC_TITLE"
    :aria-label="EQP_SPC_TITLE"
    :width="EQP_SPC_MODAL_WIDTH"
    :closable="false"
    :overlay-closable="false"
  >
    <div class="eqp-spc-fields">
      <div v-for="(row, rowIndex) in EQP_SPC_ROWS" :key="rowIndex" class="eqp-spc-row">
        <BaseInput
          v-for="field in row"
          :id="`eqp-spc-${field.key}`"
          :key="field.key"
          :label="field.label"
          :model-value="fields[field.key]"
          readonly
        />
      </div>
    </div>
    <template #footer>
      <BaseButton class="eqp-spc-ok" variant="link" size="large" @click="emit('ok')">
        Ok
      </BaseButton>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { BaseButton, BaseInput, BaseModal } from 'src/components/base';

import { EQP_SPC_ROWS, EQP_SPC_TITLE, type EQPspcFields } from '../eqp-spc';

const EQP_SPC_MODAL_WIDTH = 'min(408px, calc(100vw - 2 * var(--spacing-space-2)))';

defineProps<{ fields: EQPspcFields }>();
const emit = defineEmits<{ ok: [] }>();
</script>

<style src="../eqp-spc.css"></style>
