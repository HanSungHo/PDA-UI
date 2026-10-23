<template>
  <BaseScreen class="eqp-spc-screen" title="#EQPSPC INTERLOCK#">
    <section class="ds-screen__card eqp-spc-card" aria-label="EQPSPC INTERLOCK">
      <div v-for="(row, rowIndex) in EQP_SPC_ROWS" :key="rowIndex" class="eqp-spc-row">
        <div v-for="field in row" :key="field.key" class="eqp-spc-field">
          <label :for="`eqp-spc-${field.key}`" class="eqp-spc-label">{{ field.label }}</label>
          <BaseInput
            :id="`eqp-spc-${field.key}`"
            class="eqp-spc-value"
            :model-value="fields[field.key]"
            :aria-label="field.label"
            readonly
          />
        </div>
      </div>
    </section>
    <template #footer>
      <BaseButton class="eqp-spc-ok" variant="primary" size="large" @click="emit('ok')">
        Ok
      </BaseButton>
    </template>
  </BaseScreen>
</template>

<script setup lang="ts">
import { BaseButton, BaseInput, BaseScreen } from 'src/components/base';

import { EQP_SPC_ROWS, type EQPspcFields } from '../eqp-spc';

defineProps<{ fields: EQPspcFields }>();
const emit = defineEmits<{ ok: [] }>();
</script>

<style src="../eqp-spc.css"></style>
