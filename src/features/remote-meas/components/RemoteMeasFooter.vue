<template>
  <footer class="remote-meas-footer" aria-label="하단 실행 버튼">
    <BaseButton
      class="remote-meas-footer__btn"
      variant="primary"
      size="large"
      label="START"
      :disabled="!isStartBtnEnabled || isLoading"
      @click="$emit('start')"
    />
    <BaseButton
      class="remote-meas-footer__btn"
      variant="secondary"
      size="large"
      :label="COMMON_FIELD.NEGATIVEBTNSTR"
      :disabled="isLoading"
      @click="$emit('cancel')"
    />
  </footer>
</template>

<script setup lang="ts">
import { BaseButton } from 'src/components/base';
import { COMMON_FIELD } from 'src/constants/common-strings';

defineOptions({ name: 'RemoteMeasFooter' });

defineProps<{
  isStartBtnEnabled: boolean;
  isLoading: boolean;
}>();

defineEmits<{
  (e: 'start'): void;
  (e: 'cancel'): void;
}>();
</script>
