<template>
  <div class="ds-screen__actions" role="toolbar" aria-label="사이드 더미 작업">
    <BaseButton
      variant="primary"
      size="large"
      label="IN"
      :disabled="!isBtnInEnabled || isLoading"
      @click="$emit('in')"
    />
    <BaseButton
      variant="secondary"
      size="large"
      label="OUT"
      :disabled="!isBtnOutEnabled || isLoading"
      @click="$emit('out')"
    />
    <BaseButton
      variant="tertiary"
      size="large"
      label="닫기"
      :disabled="isLoading"
      @click="$emit('close')"
    />
  </div>
</template>

<script setup lang="ts">
import BaseButton from 'src/components/base/button/BaseButton.vue';

defineOptions({ name: 'SideDummyFooter' });

interface Props {
  isBtnInEnabled: boolean;
  isBtnOutEnabled: boolean;
  isLoading: boolean;
}

defineProps<Props>();

defineEmits<{
  (e: 'in'): void;
  (e: 'out'): void;
  (e: 'close'): void;
}>();
</script>
