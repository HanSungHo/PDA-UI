<template>
  <footer class="furnace-footer" aria-label="Action Controls">
    <div class="furnace-footer__container">
      <!-- Button 1: START / NO BATCH -->
      <BaseButton
        class="furnace-footer__button furnace-footer__button--start"
        variant="primary"
        size="large"
        :label="startLabel"
        :disabled="isStartDisabled || isLoading"
        :loading="isLoading && loadingAction === 'START'"
        @click="$emit('start')"
      />

      <!-- Button 2: RESTART / 온도설정 -->
      <BaseButton
        class="furnace-footer__button furnace-footer__button--restart"
        variant="secondary"
        size="large"
        :label="restartLabel"
        :disabled="isRestartDisabled || isLoading"
        :loading="isLoading && loadingAction === 'RESTART'"
        @click="$emit('restart')"
      />

      <!-- Button 3: 취소 -->
      <BaseButton
        class="furnace-footer__button furnace-footer__button--cancel"
        variant="tertiary"
        size="large"
        label="취소"
        :disabled="isLoading"
        @click="$emit('cancel')"
      />
    </div>
  </footer>
</template>

<script setup lang="ts">
import { BaseButton } from 'src/components/base';

defineOptions({ name: 'FurnaceActionFooter' });

defineProps<{
  startLabel: string;
  restartLabel: string;
  isStartDisabled: boolean;
  isRestartDisabled: boolean;
  isLoading: boolean;
  loadingAction?: 'START' | 'RESTART' | null;
}>();

defineEmits<{
  (e: 'start'): void;
  (e: 'restart'): void;
  (e: 'cancel'): void;
}>();
</script>
