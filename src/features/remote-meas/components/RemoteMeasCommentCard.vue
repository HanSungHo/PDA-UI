<template>
  <section class="ds-screen__card remote-meas-card--comment" aria-label="작업성 코멘트 정보">
    <div class="ds-screen__card-row remote-meas-card__row--action">
      <BaseInput
        class="remote-meas-card__field"
        label="Comment"
        layout="horizontal"
        :model-value="commentQty != null && commentQty !== 0 ? String(commentQty) : ''"
        disabled
      >
        <template #suffix>개</template>
      </BaseInput>

      <BaseButton
        class="remote-meas-card__btn-action"
        variant="secondary"
        size="small"
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
