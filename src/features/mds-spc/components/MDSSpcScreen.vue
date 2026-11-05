<template>
  <!--
    Figma activity_mdsspcactivity (360: 7496:78151, 432: 7790:81996): a modal with a 12px margin
    on each side, 408px wide at the 432 frame.
  -->
  <BaseModal
    class="mds-spc-modal"
    :open="true"
    :title="title"
    :aria-label="title"
    :width="MDS_SPC_MODAL_WIDTH"
    :closable="false"
    :overlay-closable="false"
  >
    <div class="mds-spc-fields">
      <div
        v-for="(row, rowIndex) in MDS_SPC_FIELD_ROWS"
        :key="rowIndex"
        class="mds-spc-row"
        :class="{
          'mds-spc-row--three': row.length === 3,
          'mds-spc-row--identity': rowIndex < MDS_SPC_ROWS.length,
        }"
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

import {
  MDS_SPC_FIELD_ROWS,
  MDS_SPC_FIELD_TONES,
  MDS_SPC_ROWS,
  type MDSSpcFields,
} from '../mds-spc';

// The viewport less a 12px margin per side, up to the 408px modal of the 432 frame.
const MDS_SPC_MODAL_WIDTH = 'min(408px, calc(100vw - 2 * var(--spacing-space-2)))';

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
