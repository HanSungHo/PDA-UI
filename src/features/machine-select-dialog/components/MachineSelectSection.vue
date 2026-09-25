<template>
  <section class="machine-select-section" :class="{ 'machine-select-section--exposure': exposure }">
    <BaseRadio
      class="machine-select-radio"
      :class="{ 'machine-select-radio--exposure': exposure }"
      :label="radioLabel"
      :model-value="selected"
      @update:model-value="$emit('select')"
    />
    <BaseInput
      class="machine-select-field"
      :class="{ 'machine-select-field--exposure': exposure }"
      label="기준장비"
      :model-value="standardMachine"
      readonly
    />
    <BaseInput
      class="machine-select-field"
      :class="{ 'machine-select-field--exposure': exposure }"
      label="선택장비"
      :model-value="selectMachine"
      autocomplete="off"
      :disabled="!selected"
      @update:model-value="$emit('update:selectMachine', String($event).toUpperCase())"
      @keyup.enter="$emit('enter')"
    />
    <BaseInput
      class="machine-select-field"
      :class="{ 'machine-select-field--exposure': exposure }"
      label="RECIPE"
      :model-value="recipe"
      readonly
    />
  </section>
</template>

<script setup lang="ts">
import BaseInput from '../../../components/base/input/BaseInput.vue';
import BaseRadio from '../../../components/base/radio/BaseRadio.vue';

defineProps<{
  exposure?: boolean;
  radioLabel: string;
  recipe: string;
  selected: boolean;
  selectMachine: string;
  standardMachine: string;
}>();

defineEmits<{
  enter: [];
  select: [];
  'update:selectMachine': [value: string];
}>();
</script>
