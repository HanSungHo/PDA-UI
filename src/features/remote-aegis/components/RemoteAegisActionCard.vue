<template>
  <section class="ds-screen__card" aria-label="실행 제어">
    <div class="ds-screen__actions">
      <BaseButton
        variant="tertiary"
        size="medium"
        label="START"
        :disabled="!isStartEnabled || isLoading"
        @click="$emit('start')"
      />
      <BaseButton
        variant="tertiary"
        size="medium"
        label="닫기"
        :disabled="isLoading"
        @click="$emit('cancel')"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { BaseButton } from 'src/components/base';

defineOptions({ name: 'RemoteAegisActionCard' });

defineProps<{
  isStartEnabled: boolean;
  isLoading: boolean;
}>();

defineEmits<{
  (e: 'start'): void;
  (e: 'cancel'): void;
}>();
</script>
