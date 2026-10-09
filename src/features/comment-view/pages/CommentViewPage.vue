<template>
  <!--
    PRESERVE: Keep DOM order exactly as legacy: Header -> Card -> Comment area -> Footer.
    PRESERVE: Keep literal strings for titles and labels unless explicitly noted in STRINGS.
  -->
  <div class="comment-view-legacy">
    <div class="header">
      <BaseButton
        class="back-btn"
        variant="link"
        size="xs"
        icon-only
        aria-label="Back"
        @click="$emit('finished')"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M19 12H5" />
          <path d="M12 19l-7-7 7-7" />
        </svg>
      </BaseButton>
      <span class="title">{{ STRINGS.TITLE }}</span>
    </div>

    <div class="container">
      <div class="card">
        <div class="form-group">
          <span class="label">{{ STRINGS.LOT_LABEL }}</span>
          <!-- legacy txt_lot_no is display-only -->
          <BaseInput
            class="comment-input comment-input--readonly"
            :model-value="serviceLotId"
            :disabled="true"
          />
        </div>

        <div class="form-row">
          <div class="form-group">
            <span class="label">{{ STRINGS.PROCESS_NUMBER_LABEL }}</span>
            <!-- legacy txt_process_num = operation + subOperation -->
            <BaseInput
              class="comment-input comment-input--readonly"
              :model-value="processNumberDisplay"
              :disabled="true"
            />
          </div>
          <div class="input-field-standalone">
            <!-- legacy txt_process_step from response PROCESSSTEP -->
            <BaseInput
              class="comment-input comment-input--readonly"
              :model-value="processStep"
              :disabled="true"
            />
          </div>
        </div>

        <div class="form-group">
          <span class="label">{{ STRINGS.NO_LABEL }}</span>
          <BaseInput
            class="comment-input comment-input--readonly"
            :model-value="serviceCommentNo"
            :disabled="true"
          />
        </div>

        <div class="form-group">
          <span class="label">{{ STRINGS.OPERATOR_LABEL }}</span>
          <div class="select-wrapper">
            <!-- legacy txt_operator displays DeviceInfo.OPERATOR_ID (read-only) -->
            <q-select
              class="comment-select"
              :model-value="operatorIdDisplay"
              :options="operatorOptions"
              option-label="label"
              option-value="value"
              emit-value
              map-options
              readonly
              hide-dropdown-icon
              dense
              outlined
            />
          </div>
        </div>

        <div class="form-group">
          <span class="label">{{ STRINGS.PASSWORD_LABEL }}</span>
          <!-- edit_password editable only when OK is visible -->
          <BaseInput v-model="password" class="comment-input" type="password" :disabled="!showOk" />
        </div>
      </div>

      <div class="comment-area">
        <!-- legacy txt_comment is TextView display-only -->
        <BaseInput v-model="commentText" mode="textarea" :disabled="true" class="comment-box" />
      </div>

      <div class="bottom-section">
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
          <BaseButton class="comment-action" block @click="onCancel">{{
            STRINGS.CANCEL_LABEL
          }}</BaseButton>
        </template>
        <template v-else>
          <BaseButton class="comment-action" block @click="onCancel">
            {{ STRINGS.CLOSE_LABEL }}
          </BaseButton>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { BaseButton, BaseInput } from 'src/components/base';

import { useCommentView } from '../composables/useCommentView';
import { COMMENT_VIEW_DEFAULTS } from '../constants/comment-view.constants';
import type { CommentViewMockScenario } from '../mocks/comment-view.mock';
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
    useMockService?: boolean;
    mockScenario?: CommentViewMockScenario;
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
    useMockService: false,
    mockScenario: 'current-writable',
  },
);
const emit = defineEmits<{
  (e: 'error', message: string): void;
  (e: 'finished'): void;
}>();

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
  operatorOptions,
  // Actions
  onOk,
  onCancel,
  setupProdServiceIfNeeded,
  setupMockServiceIfNeeded,
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
  useMockService: props.useMockService,
  mockScenario: props.mockScenario,
  onError: (msg: string) => emit('error', msg),
  onFinished: () => emit('finished'),
});

// `cancelLabel`, `errorMessage` and `setupProdServiceIfNeeded` are consumed by tests
// via `wrapper.vm`; referencing them here keeps the setup-scope bindings (and lint) happy.
defineExpose({
  setupMockServiceIfNeeded,
  setupProdServiceIfNeeded,
  errorMessage,
  cancelLabel,
});
</script>

<style src="../styles/comment-view.css" scoped></style>
