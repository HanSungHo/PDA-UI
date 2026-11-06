<template>
  <!--
    PRESERVE: Keep DOM order exactly as legacy: Header -> Card -> Comment area -> Footer.
    PRESERVE: Keep literal strings for titles and labels unless explicitly noted in STRINGS.
  -->
  <BaseScreen
    :title="STRINGS.TITLE"
    :ok-label="STRINGS.CONFIRM_LABEL"
    :cancel-label="cancelLabel"
    :ok-disabled="isLoading || isSubmitting"
    :ok-loading="isSubmitting"
    @ok="onOk"
    @cancel="onCancel"
  >
    <div class="ds-screen__card">
      <!-- legacy txt_lot_no is display-only -->
      <BaseInput
        size="small"
        block
        :label="STRINGS.LOT_LABEL"
        :model-value="serviceLotId"
        readonly
      />

      <div class="ds-screen__card-row">
        <!-- legacy txt_process_num = operation + subOperation -->
        <BaseInput
          size="small"
          :label="STRINGS.PROCESS_NUMBER_LABEL"
          :model-value="processNumberDisplay"
          readonly
        />
        <!-- legacy txt_process_step from response PROCESSSTEP -->
        <BaseInput size="small" :model-value="processStep" readonly />
      </div>

      <BaseInput
        size="small"
        block
        :label="STRINGS.NO_LABEL"
        :model-value="serviceCommentNo"
        readonly
      />

      <!-- legacy txt_operator displays DeviceInfo.OPERATOR_ID (read-only) -->
      <BaseInput
        size="small"
        block
        data-testid="comment-operator"
        :label="STRINGS.OPERATOR_LABEL"
        :model-value="operatorIdDisplay"
        readonly
      />

      <!-- edit_password editable only when OK is visible -->
      <BaseInput
        v-model="password"
        size="small"
        block
        :label="STRINGS.PASSWORD_LABEL"
        type="password"
        :disabled="!showOk"
      />
    </div>

    <div class="comment-result ds-screen__card">
      <BaseEmptyState v-if="!commentText" aria-live="polite" />
      <BaseInput v-else v-model="commentText" mode="textarea" size="small" block readonly />
    </div>

    <template #footer>
      <template v-if="showOk">
        <BaseButton
          size="medium"
          :loading="isSubmitting"
          :disabled="isLoading || isSubmitting"
          @click="onOk"
        >
          {{ STRINGS.CONFIRM_LABEL }}
        </BaseButton>
        <BaseButton size="medium" variant="tertiary" @click="onCancel">
          {{ STRINGS.CANCEL_LABEL }}
        </BaseButton>
      </template>
      <BaseButton v-else size="medium" variant="tertiary" @click="onCancel">
        {{ STRINGS.CLOSE_LABEL }}
      </BaseButton>
    </template>
  </BaseScreen>
</template>

<script setup lang="ts">
import { BaseButton, BaseEmptyState, BaseInput, BaseScreen } from 'src/components/base';
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
