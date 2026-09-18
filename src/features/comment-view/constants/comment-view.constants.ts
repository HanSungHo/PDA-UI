/**
 * UI labels for the Comment View migrated from legacy activity_comment_view.html.
 * Keep literal strings exactly as legacy unless explicitly requested.
 */
export const COMMENT_VIEW_STRINGS = {
  TITLE: 'COMMENT VIEW',
  LOT_LABEL: 'LOT No.',
  PROCESS_NUMBER_LABEL: 'Process Number',
  NO_LABEL: 'No.',
  OPERATOR_LABEL: 'Operator',
  PASSWORD_LABEL: 'Password',
  COMMENT_PLACEHOLDER: 'Enter comment...',
  CONFIRM_LABEL: '확인',
  CANCEL_LABEL: '취소',
  CLOSE_LABEL: 'CLOSE',
} as const;

/**
 * Legacy flag values returned by the COMMENT API and used for permission logic.
 */
export const COMMENT_VIEW_FLAGS = {
  IS_CURRENT: {
    YES: 'Y',
    NO: 'N',
  },
  WORK_CODE: {
    WRITE: 'W',
  },
  IS_CHECK: {
    YES: 'Y',
    NO: 'N',
  },
} as const;

/**
 * Operator permissions that allow the OK (comment confirm) action.
 * Legacy: DeviceInfo.PERMISSION must be one of these.
 */
export const COMMENT_VIEW_PERMISSIONS = {
  COMMENT_OK: ['C', 'H', 'B'] as const,
} as const;

/**
 * Shared error keys/messages used by the Comment View page.
 */
export const COMMENT_VIEW_ERRORS = {
  NO_SERVICE_AVAILABLE: 'NO_SERVICE_AVAILABLE',
  UNKNOWN_ERROR: 'Unknown error',
} as const;

/**
 * Legacy defaults that keep the migrated behaviour aligned with CommentViewActivity.kt.
 */
export const COMMENT_VIEW_DEFAULTS = {
  /** Legacy always prefills the server-returned password into the password field. */
  PREFILL_PASSWORD: true,
  /** Legacy initialises operSequence to an empty string. */
  OPERSEQUENCE: '',
  /** Create the production HTTP service automatically when none is injected. */
  AUTO_CREATE_SERVICE: true,
} as const;
