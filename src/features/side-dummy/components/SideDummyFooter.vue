<template>
  <footer class="side-dummy-footer" role="toolbar" aria-label="사이드 더미 작업">
    <BaseButton
      class="side-dummy-footer__btn"
      variant="primary"
      size="large"
      label="IN"
      :disabled="!isBtnInEnabled || isLoading"
      @click="$emit('in')"
    />
    <BaseButton
      class="side-dummy-footer__btn"
      variant="secondary"
      size="large"
      label="OUT"
      :disabled="!isBtnOutEnabled || isLoading"
      @click="$emit('out')"
    />
    <BaseButton
      class="side-dummy-footer__btn"
      variant="tertiary"
      size="large"
      label="닫기"
      :disabled="isLoading"
      @click="$emit('close')"
    />
  </footer>
</template>

<script setup lang="ts">
import BaseButton from 'src/components/base/button/BaseButton.vue';

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
