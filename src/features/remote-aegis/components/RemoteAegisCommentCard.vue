<template>
  <section class="ds-screen__card" aria-label="LOT Comment">
    <BaseInput
      mode="textarea"
      layout="horizontal"
      label="LOT Comment"
      :model-value="noticeText"
      :rows="3"
      readonly
      tabindex="-1"
    />
  </section>
</template>

<script setup lang="ts">
import { BaseInput } from 'src/components/base';

defineOptions({ name: 'RemoteAegisCommentCard' });

defineProps<{
  noticeText: string;
}>();
</script>
