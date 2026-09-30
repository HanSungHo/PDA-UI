import { ROUTE } from 'src/constants/routes';

import type { ActivityMainAction, ActivityMainVisibilityState } from './activity-main.types';

export const ACTIVITY_MAIN_ACTION_ID = {
  login: 'btn_login',
  esheet: 'btn_esheet',
  dispatching: 'btn_dispatching',
  diffParam: 'btn_diff_param',
  wetAuto: 'btn_wet_auto',
  shelfIncoming: 'btn_shelf_incoming',
  prChange: 'btn_pr_change',
  rcp: 'btn_rcp',
  merge: 'btn_merge',
  autoMerge: 'btn_auto_merge',
  sampleRelease: 'btn_sampleRelese',
  chat: 'btn_chat',
  sendMessage: 'btn_sendMessage',
  gas: 'btn_Gas',
  waferMaterialCheck: 'btn_WafeMaterialCheck',
  esdMaster: 'btn_ESD_Master',
  maskBulkChange: 'btn_mask_location2',
  split: 'btn_split',
  sideDummy: 'btn_side_dmm',
  lotStatus: 'btn_lot_status',
  maskLocation: 'btn_mask_location',
  machineStatus: 'btn_machine_status',
  lotStatusByBay: 'btn_lot_status_by_bay',
  etch: 'btn_etch',
  batch: 'btn_batch',
  testResultInput: 'btn_test_result_input',
  furnaceRemote: 'btn_Furnace_remote',
  measRemote: 'btn_Meas_remote',
  cvdTest: 'btn_CVD_TEST',
  operationProgress: 'btn_add_operation_progress',
  inputScopeData: 'btn_input_scope_data',
  wipInquiry: 'btn_wip_inquiry',
  systemSetting: 'btn_system_setting',
  setting: 'btn_setting',
  out: 'btn_out',
} as const;

export const ACTIVITY_MAIN_HEADER_ACTIONS: ActivityMainAction[] = [
  {
    id: ACTIVITY_MAIN_ACTION_ID.systemSetting,
    label: 'System Setting',
    target: ROUTE.systemSetting,
    column: 'header',
    visibility: 'always',
  },
];

export const ACTIVITY_MAIN_LEFT_ACTIONS: ActivityMainAction[] = [
  {
    id: ACTIVITY_MAIN_ACTION_ID.login,
    label: 'LOG IN',
    target: ROUTE.login,
    column: 'left',
    visibility: 'always',
    large: true,
  },
  {
    id: ACTIVITY_MAIN_ACTION_ID.esheet,
    label: 'eSheet',
    target: ROUTE.esheet,
    column: 'left',
    visibility: 'always',
  },
  {
    id: ACTIVITY_MAIN_ACTION_ID.dispatching,
    label: 'Dispatching',
    target: ROUTE.dispatching,
    column: 'left',
    visibility: 'always',
  },
  {
    id: ACTIVITY_MAIN_ACTION_ID.diffParam,
    label: 'Diff 계측 Para',
    target: ROUTE.diffParam,
    column: 'left',
    visibility: 'always',
  },
  {
    id: ACTIVITY_MAIN_ACTION_ID.wetAuto,
    label: 'Wet 자동화',
    target: ROUTE.wetAuto,
    column: 'left',
    visibility: 'always',
  },
  {
    id: ACTIVITY_MAIN_ACTION_ID.shelfIncoming,
    label: 'Shelf 입고',
    target: ROUTE.shelfIncoming,
    column: 'left',
    visibility: 'always',
  },
  {
    id: ACTIVITY_MAIN_ACTION_ID.prChange,
    label: 'PR 교체',
    target: ROUTE.prChange,
    column: 'left',
    visibility: 'always',
  },
  {
    id: ACTIVITY_MAIN_ACTION_ID.rcp,
    label: '계측 Rcp 조회',
    target: ROUTE.rcpInquire,
    column: 'left',
    visibility: 'always',
  },
  {
    id: ACTIVITY_MAIN_ACTION_ID.merge,
    label: 'Merge',
    target: ROUTE.merge,
    column: 'left',
    visibility: 'always',
  },
  {
    id: ACTIVITY_MAIN_ACTION_ID.autoMerge,
    label: 'Auto Merge',
    target: ROUTE.autoMerge,
    column: 'left',
    visibility: 'always',
  },
  {
    id: ACTIVITY_MAIN_ACTION_ID.sampleRelease,
    label: 'Sample Release',
    target: ROUTE.sampleRelease,
    column: 'left',
    visibility: 'always',
  },
  {
    id: ACTIVITY_MAIN_ACTION_ID.chat,
    label: '채팅',
    target: ROUTE.chat,
    column: 'left',
    visibility: 'always',
  },
  {
    id: ACTIVITY_MAIN_ACTION_ID.sendMessage,
    label: '메시지 보내기',
    target: ROUTE.sendMessage,
    column: 'left',
    visibility: 'hidden',
  },
  {
    id: ACTIVITY_MAIN_ACTION_ID.gas,
    label: 'GAS 사용량 입력',
    target: ROUTE.gas,
    column: 'left',
    visibility: 'gasInput',
  },
  {
    id: ACTIVITY_MAIN_ACTION_ID.waferMaterialCheck,
    label: 'W/F 자재 정보 Check',
    target: ROUTE.waferMaterialCheck,
    column: 'left',
    visibility: 'always',
    textSize: 'small',
  },
  {
    id: ACTIVITY_MAIN_ACTION_ID.esdMaster,
    label: 'ESD 이력 관리',
    target: ROUTE.esdMaster,
    column: 'left',
    visibility: 'always',
  },
  {
    id: ACTIVITY_MAIN_ACTION_ID.maskBulkChange,
    label: 'Mask 일괄 변경',
    target: ROUTE.maskBulkChange,
    column: 'left',
    visibility: 'always',
  },
];

export const ACTIVITY_MAIN_RIGHT_ACTIONS: ActivityMainAction[] = [
  {
    id: ACTIVITY_MAIN_ACTION_ID.split,
    label: 'Split',
    target: ROUTE.split,
    column: 'right',
    visibility: 'always',
  },
  {
    id: ACTIVITY_MAIN_ACTION_ID.sideDummy,
    label: 'Side Dummy',
    target: ROUTE.sideDummy,
    column: 'right',
    visibility: 'always',
  },
  {
    id: ACTIVITY_MAIN_ACTION_ID.lotStatus,
    label: 'Lot 상태',
    target: ROUTE.lotStatus,
    column: 'right',
    visibility: 'always',
  },
  {
    id: ACTIVITY_MAIN_ACTION_ID.maskLocation,
    label: 'Mask 위치 지정',
    target: ROUTE.maskLocation,
    column: 'right',
    visibility: 'always',
  },
  {
    id: ACTIVITY_MAIN_ACTION_ID.machineStatus,
    label: '장비 상태',
    target: ROUTE.machineStatus,
    column: 'right',
    visibility: 'always',
  },
  {
    id: ACTIVITY_MAIN_ACTION_ID.lotStatusByBay,
    label: 'Bay별 Lot 현황',
    target: ROUTE.lotStatusByBay,
    column: 'right',
    visibility: 'always',
  },
  {
    id: ACTIVITY_MAIN_ACTION_ID.etch,
    label: 'Etch 조건표',
    target: ROUTE.etch,
    column: 'right',
    visibility: 'always',
  },
  {
    id: ACTIVITY_MAIN_ACTION_ID.batch,
    label: 'Batch',
    target: ROUTE.batch,
    column: 'right',
    visibility: 'always',
  },
  {
    id: ACTIVITY_MAIN_ACTION_ID.testResultInput,
    label: '검사 결과 입력',
    target: ROUTE.testResultInput,
    column: 'right',
    visibility: 'always',
  },
  {
    id: ACTIVITY_MAIN_ACTION_ID.furnaceRemote,
    label: 'DIFF Test 자동화',
    target: ROUTE.furnaceRemote,
    column: 'right',
    visibility: 'always',
  },
  {
    id: ACTIVITY_MAIN_ACTION_ID.measRemote,
    label: '계측장비 자동화',
    target: ROUTE.measRemote,
    column: 'right',
    visibility: 'always',
  },
  {
    id: ACTIVITY_MAIN_ACTION_ID.cvdTest,
    label: 'CVD 데이터',
    target: ROUTE.cvdTest,
    column: 'right',
    visibility: 'always',
  },
  {
    id: ACTIVITY_MAIN_ACTION_ID.operationProgress,
    label: '공정 진행 이력 등록',
    target: ROUTE.operationProgress,
    column: 'right',
    visibility: 'hidden',
  },
  {
    id: ACTIVITY_MAIN_ACTION_ID.inputScopeData,
    label: 'Scope Data 입력',
    target: ROUTE.inputScopeData,
    column: 'right',
    visibility: 'always',
  },
  {
    id: ACTIVITY_MAIN_ACTION_ID.wipInquiry,
    label: '재공 조회',
    target: ROUTE.wipInquiry,
    column: 'right',
    visibility: 'always',
  },
];

export const ACTIVITY_MAIN_FOOTER_ACTIONS: ActivityMainAction[] = [
  {
    id: ACTIVITY_MAIN_ACTION_ID.setting,
    label: '환경 설정',
    target: ROUTE.setting,
    column: 'footer',
    visibility: 'always',
  },
  {
    id: ACTIVITY_MAIN_ACTION_ID.out,
    label: '종료',
    target: ROUTE.exit,
    column: 'footer',
    visibility: 'always',
  },
];

export function getVisibleActivityMainActions(
  state: ActivityMainVisibilityState,
  actions: ActivityMainAction[] = [...ACTIVITY_MAIN_LEFT_ACTIONS, ...ACTIVITY_MAIN_RIGHT_ACTIONS],
): ActivityMainAction[] {
  return actions.filter((action) => {
    if (action.visibility === 'hidden') return false;
    if (action.visibility === 'gasInput') return state.gasInput === 'Y';

    return true;
  });
}
