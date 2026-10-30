<template>
  <section class="ds-screen__card" aria-label="Chamber 일괄변경 및 장비 INFORM">
    <BaseCheckbox
      label="Chamber 장비까지 일괄변경"
      :model-value="isChamberChecked"
      :disabled="isLoading"
      @update:model-value="onChamberToggle"
    />

    <BaseButton
      variant="tertiary"
      size="large"
      label="장비 INFORM"
      block
      :disabled="isLoading"
      @click="$emit('machine-inform')"
    />
  </section>
</template>

<script setup lang="ts">
import BaseButton from 'src/components/base/button/BaseButton.vue';
import BaseCheckbox from 'src/components/base/checkbox/BaseCheckbox.vue';

defineOptions({ name: 'MachineStatusDetailChamberCard' });

interface Props {
  isChamberChecked: boolean;
  isLoading: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:isChamberChecked', value: boolean): void;
  (e: 'machine-inform'): void;
}>();

function onChamberToggle(value: boolean): void {
  emit('update:isChamberChecked', value);
}
</script>
