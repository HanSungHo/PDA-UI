<template>
  <section class="remote-meas-card remote-meas-card--comment" aria-label="작업성 코멘트 정보">
    <div class="remote-meas-card__row remote-meas-card__row--action">
      <BaseInput
        class="remote-meas-card__field"
        label="Comment"
        :model-value="commentQty != null ? String(commentQty) : ''"
        disabled
      >
        <template #suffix>개</template>
      </BaseInput>

      <BaseButton
        class="remote-meas-card__btn-action"
        variant="secondary"
        size="medium"
        label="읽기"
        :disabled="!isReadCommentEnabled || isLoading"
        @click="$emit('read-comment')"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { BaseButton, BaseInput } from 'src/components/base';

defineOptions({ name: 'RemoteMeasCommentCard' });

defineProps<{
  commentQty: number;
  nwCommentQty?: number;
  isReadCommentEnabled: boolean;
  isLoading: boolean;
}>();

defineEmits<{
  (e: 'read-comment'): void;
}>();
</script>
