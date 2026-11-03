<template>
  <!--
    PRESERVE: Keep DOM order exactly as legacy: Header -> Card -> Comment area -> Footer.
    PRESERVE: Keep literal strings for titles and labels unless explicitly noted in STRINGS.
  -->
  <BaseScreen
    class="comment-view-page"
    :title="STRINGS.TITLE"
    :ok-label="STRINGS.CONFIRM_LABEL"
    :cancel-label="cancelLabel"
    :ok-disabled="isLoading || isSubmitting"
    :ok-loading="isSubmitting"
    @ok="onOk"
    @cancel="onCancel"
  >
    <div class="comment-form ds-screen__card">
      <div class="form-group">
        <!-- legacy txt_lot_no is display-only -->
        <BaseInput
          class="comment-input comment-input--readonly"
          :label="STRINGS.LOT_LABEL"
          :model-value="serviceLotId"
          readonly
        />
      </div>

      <div class="form-row">
        <div class="form-group">
          <!-- legacy txt_process_num = operation + subOperation -->
          <BaseInput
            class="comment-input comment-input--readonly"
            :label="STRINGS.PROCESS_NUMBER_LABEL"
            :model-value="processNumberDisplay"
            readonly
          />
        </div>
        <div class="input-field-standalone">
          <!-- legacy txt_process_step from response PROCESSSTEP -->
          <BaseInput
            class="comment-input comment-input--readonly"
            :model-value="processStep"
            readonly
          />
        </div>
      </div>

      <div class="form-group">
        <BaseInput
          class="comment-input comment-input--readonly"
          :label="STRINGS.NO_LABEL"
          :model-value="serviceCommentNo"
          readonly
        />
      </div>

      <div class="form-group">
        <!-- legacy txt_operator displays DeviceInfo.OPERATOR_ID (read-only) -->
        <BaseInput
          class="comment-input comment-input--readonly"
          data-testid="comment-operator"
          :label="STRINGS.OPERATOR_LABEL"
          :model-value="operatorIdDisplay"
          readonly
        />
      </div>

      <div class="form-group">
        <!-- edit_password editable only when OK is visible -->
        <BaseInput
          v-model="password"
          class="comment-input"
          :label="STRINGS.PASSWORD_LABEL"
          type="password"
          :disabled="!showOk"
        />
      </div>
    </div>

    <div class="comment-empty ds-screen__card">
      <div v-if="!commentText" class="empty-state" aria-live="polite">
        <span class="empty-icon" aria-hidden="true">i</span>
        <h2 class="empty-title">EMPTY</h2>
        <p class="empty-description">해당 결과가 없습니다</p>
      </div>
      <div v-else class="comment-area">
        <BaseInput v-model="commentText" mode="textarea" readonly class="comment-box" />
      </div>
    </div>

    <template #footer>
      <template v-if="showOk">
        <BaseButton
          class="comment-action"
          :loading="isSubmitting"
          :disabled="isLoading || isSubmitting"
          block
          @click="onOk"
        >
          {{ STRINGS.CONFIRM_LABEL }}
        </BaseButton>
        <BaseButton class="comment-action" variant="tertiary" block @click="onCancel">
          {{ STRINGS.CANCEL_LABEL }}
        </BaseButton>
      </template>
      <BaseButton v-else class="comment-action" variant="tertiary" block @click="onCancel">
        {{ STRINGS.CLOSE_LABEL }}
      </BaseButton>
    </template>
  </BaseScreen>
</template>

<script setup lang="ts">
import { BaseButton, BaseInput, BaseScreen } from 'src/components/base';
import { inject } from 'vue';
import { routerKey } from 'vue-router';

import { useCommentView } from '../composables/useCommentView';
import { COMMENT_VIEW_DEFAULTS } from '../constants/comment-view.constants';
import type { CommentService } from '../services/comment.service';
import type { OperatorContext } from '../types/comment.types';

const props = withDefaults(
  defineProps<{
    lotId?: string;
    operation?: string;
    subOperation?: string;
    commentNo?: string;
    service?: CommentService;
    operatorContext?: OperatorContext;
    /** Optional: pass operation sequence if available (legacy key may be "operSeq") */
    operSequence?: string;
    /** Optional: whether to prefill server-returned PW into the password field (default: true) */
    prefillPassword?: boolean;
    /** Optional: automatically create the production HTTP service if none is supplied (default: true) */
    autoCreateService?: boolean;
  }>(),
  {
    lotId: '',
    operation: '',
    subOperation: '',
    commentNo: '',
    service: undefined,
    operatorContext: undefined,
    operSequence: '',
    prefillPassword: COMMENT_VIEW_DEFAULTS.PREFILL_PASSWORD,
    autoCreateService: COMMENT_VIEW_DEFAULTS.AUTO_CREATE_SERVICE,
  },
);
const emit = defineEmits<{
  (e: 'error', message: string): void;
  (e: 'finished'): void;
}>();
const router = inject(routerKey, null);

function handleFinished(): void {
  emit('finished');
  if (router) void router.back();
}

// All business logic (ensureOperatorContext, setupProdServiceIfNeeded, load, onOk)
// lives in the useCommentView composable. The page only wires props/emits to it
// and renders the legacy fields with Quasar controls.
const {
  // State
  commentText,
  password,
  processStep,
  showOk,
  cancelLabel,
  isLoading,
  isSubmitting,
  errorMessage,
  // Computed
  serviceLotId,
  serviceCommentNo,
  processNumberDisplay,
  operatorIdDisplay,
  // Actions
  onOk,
  onCancel,
  setupProdServiceIfNeeded,
  // Strings
  STRINGS,
} = useCommentView({
  lotId: props.lotId,
  operation: props.operation,
  subOperation: props.subOperation,
  commentNo: props.commentNo,
  operSequence: props.operSequence,
  service: props.service,
  operatorContext: props.operatorContext,
  prefillPassword: props.prefillPassword,
  autoCreateService: props.autoCreateService,
  onError: (msg: string) => emit('error', msg),
  onFinished: handleFinished,
});

// `cancelLabel`, `errorMessage` and `setupProdServiceIfNeeded` are consumed by tests
// via `wrapper.vm`; referencing them here keeps the setup-scope bindings (and lint) happy.
defineExpose({
  setupProdServiceIfNeeded,
  errorMessage,
  cancelLabel,
});
</script>

<style src="../styles/comment-view.css" scoped></style>
