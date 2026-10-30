<template>
  <!-- Figma activity_mdsspcactivity (7361:76450): a 340px modal over the current screen. -->
  <BaseModal
    :open="true"
    :title="title"
    :aria-label="title"
    :width="340"
    :closable="false"
    :overlay-closable="false"
  >
    <div class="mds-spc-fields">
      <div
        v-for="(row, rowIndex) in MDS_SPC_FIELD_ROWS"
        :key="rowIndex"
        class="mds-spc-row"
        :class="{ 'mds-spc-row--three': row.length === 3 }"
      >
        <BaseInput
          v-for="field in row"
          :id="`mds-spc-${field.key}`"
          :key="field.key"
          class="mds-spc-value"
          :class="{ 'mds-spc-value--spc-result': field.key === 'SpcResult' }"
          :model-value="fields[field.key]"
          :label="field.label"
          :tone="MDS_SPC_FIELD_TONES[field.key]"
          readonly
        />
      </div>

      <!-- Only the choices wait on MDSCONTENT / MDSINSERT; the values above are already loaded. -->
      <div class="mds-spc-choices" :aria-busy="isBusy || undefined">
        <BaseDropdownList
          id="mds-spc-measure"
          :disabled="isBusy"
          label="측정/검사 내용"
          :model-value="selectedMeasure"
          :options="measureOptions"
          @update:model-value="emit('update:selectedMeasure', $event)"
        />
        <BaseDropdownList
          id="mds-spc-action"
          :disabled="isBusy"
          label="조치 사항"
          :model-value="selectedAction"
          :options="actionOptions"
          @update:model-value="emit('update:selectedAction', $event)"
        />
      </div>
    </div>

    <!-- Android order: OK, then 저장 (Figma draws 저장 first; pending designer confirmation). -->
    <template #footer>
      <BaseButton variant="link" size="large" :disabled="isBusy" @click="emit('ok')">
        OK
      </BaseButton>
      <BaseButton variant="link" size="large" :loading="isBusy" @click="emit('save')">
        저장
      </BaseButton>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import type { BaseDropdownValue, BaseOption } from 'src/components/base';
import { BaseButton, BaseDropdownList, BaseInput, BaseModal } from 'src/components/base';

import { MDS_SPC_FIELD_ROWS, MDS_SPC_FIELD_TONES, type MDSSpcFields } from '../mds-spc';

defineProps<{
  fields: MDSSpcFields;
  title: string;
  measureOptions: BaseOption[];
  actionOptions: BaseOption[];
  selectedMeasure?: BaseDropdownValue;
  selectedAction?: BaseDropdownValue;
  isBusy: boolean;
}>();

const emit = defineEmits<{
  ok: [];
  save: [];
  'update:selectedMeasure': [value: BaseDropdownValue];
  'update:selectedAction': [value: BaseDropdownValue];
}>();
</script>

<style src="../mds-spc.css"></style>
