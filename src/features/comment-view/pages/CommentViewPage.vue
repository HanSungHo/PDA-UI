<template>
  <!--
    PRESERVE: Keep DOM order exactly as legacy: Header -> Card -> Comment area -> Footer.
    PRESERVE: Keep literal strings for titles and labels unless explicitly noted in STRINGS.
  -->
  <div class="comment-view-legacy">
    <div class="header">
      <button class="back-btn" aria-label="Back" @click="$emit('finished')">
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
      </button>
      <span class="title">{{ STRINGS.TITLE }}</span>
    </div>

    <div class="container">
      <div class="card">
        <div class="form-group">
          <span class="label">{{ STRINGS.LOT_LABEL }}</span>
          <!-- legacy txt_lot_no is display-only -->
          <BaseInputField :model-value="serviceLotId" :disabled="true" />
        </div>

        <div class="form-row">
          <div class="form-group">
            <span class="label">{{ STRINGS.PROCESS_NUMBER_LABEL }}</span>
            <!-- legacy txt_process_num = operation + subOperation -->
            <BaseInputField :model-value="processNumberDisplay" :disabled="true" />
          </div>
          <div class="input-field-standalone">
            <!-- legacy txt_process_step from response PROCESSSTEP -->
            <BaseInputField :model-value="processStep" :disabled="true" />
          </div>
        </div>

        <div class="form-group">
          <span class="label">{{ STRINGS.NO_LABEL }}</span>
          <BaseInputField :model-value="serviceCommentNo" :disabled="true" />
        </div>

        <div class="form-group">
          <span class="label">{{ STRINGS.OPERATOR_LABEL }}</span>
          <div class="select-wrapper">
            <!-- legacy txt_operator displays DeviceInfo.OPERATOR_ID (read-only) -->
            <BaseDropdownList
              :model-value="operatorIdDisplay"
              :options="operatorOptions"
              readonly
            />
          </div>
        </div>

        <div class="form-group">
          <span class="label">{{ STRINGS.PASSWORD_LABEL }}</span>
          <!-- edit_password editable only when OK is visible -->
          <BaseInputField v-model="password" type="password" :disabled="!showOk" />
        </div>
      </div>

      <div class="comment-area">
        <!-- legacy txt_comment is TextView display-only -->
        <BaseTextAreaField
          v-model="commentText"
          :disabled="true"
          class="comment-box"
          :placeholder="STRINGS.COMMENT_PLACEHOLDER"
        />
      </div>

      <div class="bottom-section">
        <template v-if="showOk">
          <BaseButton
            :loading="isSubmitting"
            :disabled="isLoading || isSubmitting"
            block
            @click="onOk"
          >
            {{ STRINGS.CONFIRM_LABEL }}
          </BaseButton>
          <BaseButton block @click="onCancel">{{ STRINGS.CANCEL_LABEL }}</BaseButton>
        </template>
        <template v-else>
          <BaseButton block @click="onCancel">
            {{ STRINGS.CLOSE_LABEL }}
          </BaseButton>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { BaseButton, BaseDropdownList, BaseInputField } from 'src/components/base';
import { BaseTextAreaField } from 'src/components/base/text-area-field';
import { computed, nextTick, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import {
  COMMENT_VIEW_DEFAULTS,
  COMMENT_VIEW_ERRORS,
  COMMENT_VIEW_FLAGS,
  COMMENT_VIEW_PERMISSIONS,
  COMMENT_VIEW_STRINGS,
} from '../constants/comment-view.constants';
import type { CommentService } from '../services/comment.service';
import type { OperatorContext } from '../types/comment.types';
import type { CommentRequest, CommentResponse, CommentSetRequest } from '../types/comment.types';

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
    prefillPassword: COMMENT_VIEW_DEFAULTS.PREFILL_PASSWORD,
    autoCreateService: COMMENT_VIEW_DEFAULTS.AUTO_CREATE_SERVICE,
  },
);
const emit = defineEmits<{
  (e: 'error', message: string): void;
  (e: 'finished'): void;
}>();

const STRINGS = COMMENT_VIEW_STRINGS;

const commentText = ref('');
const password = ref('');
const processStep = ref('');
const showOk = ref(false);
const cancelLabel = ref<string>(STRINGS.CLOSE_LABEL);
const isLoading = ref(false);
const isSubmitting = ref(false);
const errorMessage = ref('');

// Use a safe route fallback when the component is rendered outside a router
// (e.g. unit tests or isolated development previews).
const route = useRoute() ?? { params: {}, query: {} };

// processNum was unused in the original port; keep it removed to satisfy linter

const serviceRef = ref<CommentService | undefined>(props.service);
const operatorCtxRef = ref<OperatorContext | undefined>(props.operatorContext);

// Fallback so the page can be opened directly via route during development/qa.
// In production this should be injected by the host screen.
function ensureOperatorContext(): OperatorContext {
  if (operatorCtxRef.value) return operatorCtxRef.value;

  const query = route.query;
  const fallback: OperatorContext = {
    facility: String(query.facility ?? ''),
    operatorId: String(query.operatorId ?? ''),
    operatorName: String(query.operatorName ?? ''),
    permission: String(query.permission ?? ''),
  };
  operatorCtxRef.value = fallback;
  return fallback;
}

const serviceLotId = computed(() => props.lotId || String(route.params.lotId ?? ''));
const serviceCommentNo = computed(() => props.commentNo || String(route.params.commentNo ?? ''));
const processNumberDisplay = computed(() => `${props.operation ?? ''}${props.subOperation ?? ''}`);
const operatorIdDisplay = computed(() => operatorCtxRef.value?.operatorId ?? '');
const operatorOptions = computed(() => {
  const id = operatorCtxRef.value?.operatorId ?? '';
  return [{ label: id, value: id }];
});

async function load() {
  const ctx = ensureOperatorContext();

  const req: CommentRequest = {
    LOTID: props.lotId || String(route.params.lotId ?? ''),
    FACILITY: ctx.facility,
    OPERATION: props.operation || String(route.params.operation ?? ''),
    SUBOPERATION: props.subOperation || String(route.params.subOperation ?? ''),
    COMMENTNO: props.commentNo || String(route.params.commentNo ?? ''),
    OPERSEQUENCE: props.operSequence ?? COMMENT_VIEW_DEFAULTS.OPERSEQUENCE,
    OPERATORID: ctx.operatorId,
  };

  isLoading.value = true;
  errorMessage.value = '';
  try {
    const svc = serviceRef.value ?? props.service;
    if (!svc) throw new Error(COMMENT_VIEW_ERRORS.NO_SERVICE_AVAILABLE);
    const res: CommentResponse = await svc.comment(req);

    commentText.value = res.DESCRIPTION ?? '';
    processStep.value = res.PROCESSSTEP ?? '';
    const shouldPrefill = props.prefillPassword;
    password.value = shouldPrefill ? (res.PW ?? '') : '';

    if (res.ISCURRENT !== COMMENT_VIEW_FLAGS.IS_CURRENT.YES) {
      showOk.value = false;
      cancelLabel.value = STRINGS.CLOSE_LABEL;
    } else if (
      res.WORKCODE === COMMENT_VIEW_FLAGS.WORK_CODE.WRITE &&
      res.ISCHECK === COMMENT_VIEW_FLAGS.IS_CHECK.NO
    ) {
      const perm = ctx.permission ?? '';
      if (
        COMMENT_VIEW_PERMISSIONS.COMMENT_OK.includes(
          perm as (typeof COMMENT_VIEW_PERMISSIONS.COMMENT_OK)[number],
        )
      ) {
        showOk.value = true;
        cancelLabel.value = STRINGS.CANCEL_LABEL;
      } else {
        showOk.value = false;
        cancelLabel.value = STRINGS.CLOSE_LABEL;
      }
    } else {
      showOk.value = false;
      cancelLabel.value = STRINGS.CLOSE_LABEL;
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : COMMENT_VIEW_ERRORS.UNKNOWN_ERROR;
    errorMessage.value = msg;
    emit('error', msg);
  } finally {
    isLoading.value = false;
  }
}

async function onOk() {
  const ctx = ensureOperatorContext();
  const req = {
    LOTID: props.lotId,
    FACILITY: ctx.facility,
    OPERATION: props.operation,
    SUBOPERATION: props.subOperation,
    COMMENTNO: props.commentNo,
    OPERATORID: ctx.operatorId,
    OPERNAME: ctx.operatorName,
    OPERSEQUENCE: props.operSequence ?? COMMENT_VIEW_DEFAULTS.OPERSEQUENCE,
    PASSWORD: password.value,
  };

  if (isSubmitting.value) return;

  isSubmitting.value = true;
  errorMessage.value = '';
  try {
    const svc = serviceRef.value ?? props.service;
    if (!svc) throw new Error(COMMENT_VIEW_ERRORS.NO_SERVICE_AVAILABLE);
    await svc.commentSet(req as CommentSetRequest);
    emit('finished');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : COMMENT_VIEW_ERRORS.UNKNOWN_ERROR;
    errorMessage.value = msg;
    emit('error', msg);
  } finally {
    isSubmitting.value = false;
    await nextTick();
  }
}

function onCancel() {
  emit('finished');
}

async function setupProdServiceIfNeeded() {
  // Only create the production HTTP service when none is provided and auto-creation is enabled.
  if (!serviceRef.value && props.autoCreateService) {
    try {
      const mod = await import('../services/comment.service.http');
      serviceRef.value = mod.createHttpCommentService();
    } catch {
      // leave undefined so load() will emit NO_SERVICE_AVAILABLE
    }
  }
}

// Test helper kept for backward compatibility with existing tests.
// It is intentionally a no-op; production wiring is created by setupProdServiceIfNeeded.
function setupMockServiceIfNeeded() {
  return;
}

defineExpose({ setupMockServiceIfNeeded });

onMounted(async () => {
  await setupProdServiceIfNeeded();
  void load();
});
</script>

<style src="../styles/comment-view.css" scoped></style>
