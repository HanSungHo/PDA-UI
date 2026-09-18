export const DRAW_MENU_ACTION_ID = {
  auto: 'auto',
  batch: 'batch',
  batchAuto: 'batch-auto',
  comment: 'comment',
  etchInsp: 'etch-insp',
  furnaceAuto: 'furnace-auto',
  lotStatus: 'lot-status',
  moveIn: 'move-in',
  moveOut: 'move-out',
  rcpSearch: 'rcp-search',
  rework: 'rework',
  sampleRelease: 'sample-release',
  settingEen: 'setting-een',
  split: 'split',
} as const;

export type DrawMenuActionId = (typeof DRAW_MENU_ACTION_ID)[keyof typeof DRAW_MENU_ACTION_ID];

export const DRAW_MENU_ACTION_TARGET = {
  eenAdd: 'een-add',
  eenSetting: 'een-setting',
} as const;

export type DrawMenuActionTarget =
  (typeof DRAW_MENU_ACTION_TARGET)[keyof typeof DRAW_MENU_ACTION_TARGET];

export const DRAW_MENU_ACTION_LABELS: ReadonlyArray<{ id: DrawMenuActionId; label: string }> = [
  { id: DRAW_MENU_ACTION_ID.moveIn, label: 'MOVE IN' },
  { id: DRAW_MENU_ACTION_ID.moveOut, label: 'MOVE OUT' },
  { id: DRAW_MENU_ACTION_ID.batch, label: 'BATCH 생성' },
  { id: DRAW_MENU_ACTION_ID.comment, label: 'COMMENT' },
  { id: DRAW_MENU_ACTION_ID.settingEen, label: 'EEN 설정' },
  { id: DRAW_MENU_ACTION_ID.rework, label: 'REWORK' },
  { id: DRAW_MENU_ACTION_ID.split, label: 'SPLIT' },
  { id: DRAW_MENU_ACTION_ID.lotStatus, label: 'LOT 상태' },
  { id: DRAW_MENU_ACTION_ID.rcpSearch, label: '계측 RCP 조회' },
  { id: DRAW_MENU_ACTION_ID.auto, label: '자동화' },
  { id: DRAW_MENU_ACTION_ID.batchAuto, label: 'ETCH BATCH 자동화' },
  { id: DRAW_MENU_ACTION_ID.furnaceAuto, label: 'Furnace 자동화' },
  { id: DRAW_MENU_ACTION_ID.sampleRelease, label: 'SAMPLE RELEASE' },
  { id: DRAW_MENU_ACTION_ID.etchInsp, label: 'ETCH 완성 검사' },
];

export const EEN_COMMENT_COUNT_FOR_ADD = '0';
export const CURRENT_ROW_FLAG = 'Y';
export const INITIAL_MARKING_OPERATION = '10005';

export const LOT_STATUS = {
  hold: 'HOLD',
  reserved: '예약',
  run: 'RUN',
  wait: 'WAIT',
} as const;

export const AREA = {
  diff: 'DIFF',
  end: 'END',
} as const;

export const LOT_PAYLOAD_ACTION_IDS: readonly DrawMenuActionId[] = [
  DRAW_MENU_ACTION_ID.moveIn,
  DRAW_MENU_ACTION_ID.moveOut,
  DRAW_MENU_ACTION_ID.rework,
  DRAW_MENU_ACTION_ID.split,
  DRAW_MENU_ACTION_ID.lotStatus,
  DRAW_MENU_ACTION_ID.rcpSearch,
  DRAW_MENU_ACTION_ID.auto,
  DRAW_MENU_ACTION_ID.batchAuto,
  DRAW_MENU_ACTION_ID.furnaceAuto,
  DRAW_MENU_ACTION_ID.sampleRelease,
  DRAW_MENU_ACTION_ID.etchInsp,
];

export const NON_CURRENT_DISABLED_ACTION_IDS: readonly DrawMenuActionId[] = [
  DRAW_MENU_ACTION_ID.moveIn,
  DRAW_MENU_ACTION_ID.moveOut,
  DRAW_MENU_ACTION_ID.rework,
  DRAW_MENU_ACTION_ID.split,
  DRAW_MENU_ACTION_ID.batchAuto,
  DRAW_MENU_ACTION_ID.furnaceAuto,
];

export const RUN_DISABLED_ACTION_IDS: readonly DrawMenuActionId[] = [
  DRAW_MENU_ACTION_ID.moveIn,
  DRAW_MENU_ACTION_ID.auto,
  DRAW_MENU_ACTION_ID.batchAuto,
  DRAW_MENU_ACTION_ID.furnaceAuto,
];

export const HOLD_DISABLED_ACTION_IDS: readonly DrawMenuActionId[] = [
  DRAW_MENU_ACTION_ID.moveIn,
  DRAW_MENU_ACTION_ID.moveOut,
  DRAW_MENU_ACTION_ID.rework,
  DRAW_MENU_ACTION_ID.split,
  DRAW_MENU_ACTION_ID.auto,
  DRAW_MENU_ACTION_ID.batchAuto,
  DRAW_MENU_ACTION_ID.furnaceAuto,
];

export const BATCH_AREAS: readonly string[] = [AREA.diff, AREA.end];
