import { computed, nextTick, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import {
  COMMENT_VIEW_DEFAULTS,
  COMMENT_VIEW_ERRORS,
  COMMENT_VIEW_FLAGS,
  COMMENT_VIEW_PERMISSIONS,
  COMMENT_VIEW_STRINGS,
} from '../constants/comment-view.constants';
import { type CommentViewMockScenario,createMockCommentService } from '../mocks/comment-view.mock';
import type { CommentService } from '../services/comment.service';
import type {
  CommentRequest,
  CommentResponse,
  CommentSetRequest,
  OperatorContext,
} from '../types/comment.types';

export interface UseCommentViewParams {
  lotId?: string;
  operation?: string;
  subOperation?: string;
  commentNo?: string;
  operSequence?: string;
  service?: CommentService;
  operatorContext?: OperatorContext;
  prefillPassword?: boolean;
  autoCreateService?: boolean;
  useMockService?: boolean;
  mockScenario?: CommentViewMockScenario;
  onError?: (message: string) => void;
  onFinished?: () => void;
}

export function useCommentView(params: UseCommentViewParams) {
  const {
    lotId: propLotId,
    operation: propOperation,
    subOperation: propSubOperation,
    commentNo: propCommentNo,
    operSequence: propOperSequence,
    service: propService,
    operatorContext: propOperatorContext,
    prefillPassword = COMMENT_VIEW_DEFAULTS.PREFILL_PASSWORD,
    autoCreateService = COMMENT_VIEW_DEFAULTS.AUTO_CREATE_SERVICE,
    useMockService = false,
    mockScenario = 'current-writable',
    onError,
    onFinished,
  } = params;

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
  const mockEnabled = useMockService || String(route.query.mock ?? '').toLowerCase() === 'true';
  const selectedMockScenario =
    (route.query.scenario as CommentViewMockScenario | undefined) ?? mockScenario;

  const serviceRef = ref<CommentService | undefined>(propService);
  const operatorCtxRef = ref<OperatorContext | undefined>(propOperatorContext);

  // ========================================================================
  // Helpers
  // ========================================================================

  /**
   * Fallback so the page can be opened directly via route during development/qa.
   * In production this should be injected by the host screen.
   */
  function ensureOperatorContext(): OperatorContext {
    if (operatorCtxRef.value) return operatorCtxRef.value;

    const query = route.query;
    const mockDefaults = mockEnabled
      ? {
          facility: 'KFAB',
          operatorId: 'OPERATOR-01',
          operatorName: 'Demo Operator',
          permission: 'C',
        }
      : {
          facility: '',
          operatorId: '',
          operatorName: '',
          permission: '',
        };
    const fallback: OperatorContext = {
      facility: String(query.facility ?? mockDefaults.facility),
      operatorId: String(query.operatorId ?? mockDefaults.operatorId),
      operatorName: String(query.operatorName ?? mockDefaults.operatorName),
      permission: String(query.permission ?? mockDefaults.permission),
    };
    operatorCtxRef.value = fallback;
    return fallback;
  }

  /**
   * Build the common request body shared between {@link load} (COMMENT)
   * and {@link onOk} (COMMENTSET), eliminating field duplication.
   */
  function buildBaseRequest(ctx: OperatorContext): CommentRequest {
    return {
      LOTID: propLotId || String(route.params.lotId ?? ''),
      FACILITY: ctx.facility,
      OPERATION: propOperation || String(route.params.operation ?? ''),
      SUBOPERATION: propSubOperation || String(route.params.subOperation ?? ''),
      COMMENTNO: propCommentNo || String(route.params.commentNo ?? ''),
      OPERSEQUENCE: propOperSequence ?? COMMENT_VIEW_DEFAULTS.OPERSEQUENCE,
      OPERATORID: ctx.operatorId,
    };
  }

  // ========================================================================
  // Computed (display)
  // ========================================================================

  const serviceLotId = computed(() => propLotId || String(route.params.lotId ?? ''));
  const serviceCommentNo = computed(() => propCommentNo || String(route.params.commentNo ?? ''));
  const processNumberDisplay = computed(() => `${propOperation ?? ''}${propSubOperation ?? ''}`);
  const operatorIdDisplay = computed(() => operatorCtxRef.value?.operatorId ?? '');
  const operatorOptions = computed(() => {
    const id = operatorCtxRef.value?.operatorId ?? '';
    return [{ label: id, value: id }];
  });

  // ========================================================================
  // Core operations
  // ========================================================================

  async function load() {
    const ctx = ensureOperatorContext();
    const req: CommentRequest = buildBaseRequest(ctx);

    isLoading.value = true;
    errorMessage.value = '';
    try {
      const svc = serviceRef.value ?? propService;
      if (!svc) throw new Error(COMMENT_VIEW_ERRORS.NO_SERVICE_AVAILABLE);
      const res: CommentResponse = await svc.comment(req);

      commentText.value = res.DESCRIPTION ?? '';
      processStep.value = res.PROCESSSTEP ?? '';
      const shouldPrefill = prefillPassword;
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
      onError?.(msg);
    } finally {
      isLoading.value = false;
    }
  }

  async function onOk() {
    const ctx = ensureOperatorContext();
    const baseReq = buildBaseRequest(ctx);
    const req: CommentSetRequest = {
      ...baseReq,
      OPERNAME: ctx.operatorName,
      PASSWORD: password.value,
    };

    if (isSubmitting.value) return;

    isSubmitting.value = true;
    errorMessage.value = '';
    try {
      const svc = serviceRef.value ?? propService;
      if (!svc) throw new Error(COMMENT_VIEW_ERRORS.NO_SERVICE_AVAILABLE);
      await svc.commentSet(req);
      onFinished?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : COMMENT_VIEW_ERRORS.UNKNOWN_ERROR;
      errorMessage.value = msg;
      onError?.(msg);
    } finally {
      isSubmitting.value = false;
      await nextTick();
    }
  }

  function onCancel() {
    onFinished?.();
  }

  async function setupProdServiceIfNeeded() {
    // Only create the production HTTP service when none is provided and auto-creation is enabled.
    if (!serviceRef.value && autoCreateService) {
      try {
        const mod = await import('../services/comment.service.http');
        serviceRef.value = mod.createHttpCommentService();
      } catch {
        // leave undefined so load() will emit NO_SERVICE_AVAILABLE
      }
    }
  }

  function setupMockServiceIfNeeded() {
    if (!serviceRef.value && mockEnabled) {
      serviceRef.value = createMockCommentService(selectedMockScenario);
    }
  }

  onMounted(async () => {
    if (mockEnabled) {
      setupMockServiceIfNeeded();
    } else {
      await setupProdServiceIfNeeded();
    }
    void load();
  });

  // ========================================================================
  // Public API
  // ========================================================================

  return {
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
    // Functions
    load,
    onOk,
    onCancel,
    ensureOperatorContext,
    setupProdServiceIfNeeded,
    setupMockServiceIfNeeded,
    // Helpers (exposed for testing)
    buildBaseRequest,
    // Ref access
    serviceRef,
    operatorCtxRef,
    // Strings
    STRINGS,
  };
}
