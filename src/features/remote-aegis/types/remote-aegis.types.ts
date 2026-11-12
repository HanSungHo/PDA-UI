export type AegisPortStatusKind =
  | 'none'
  | 'init'
  | 'run'
  | 'pending'
  | 'ready'
  | 'reserved'
  | 'complete'
  | 'idle';

export type AegisMode = 'LOCAL' | 'REMOTE';

export type RemoteAegisFocusTarget = 'machine' | 'lot' | null;

export interface AegisServiceResult<T = Record<string, unknown>> {
  ok: boolean;
  message: string;
  data?: T;
  /** When true, the response was successful but COMMENTITEMS.ITEM was malformed (Android parity). */
  parseError?: boolean;
}

export interface RemoteEqpInfoData {
  pCount: string;
  portName: string;
  pmMessage: string;
  mainEqpId: string;
}

export interface MachinePortStatusData {
  portStateName: string;
  ackMsg: string;
}

export interface AegisLotInfoItem {
  lotHoldState: string;
  lotProcessState: string;
  jobCode: string;
  productQuantity: string;
  operDesc: string;
  operCode: string;
  productSpecName: string;
  recipe: string;
  machineName: string;
  fab: string;
  engineerName: string;
  ownerCode: string;
  safeLaunchLot: string;
  inlineSampleMessage: string;
}

export interface AegisCommentItem {
  isCheck: string;
  trackType: string;
}

export interface SlotInfoData {
  waferList: string;
}

export interface AegisRemoteStartPayload {
  machineName: string;
  recipe: string;
  portName: string;
  runNo: string;
  prodEqp: string;
  slot: string;
  userId?: string;
  userName?: string;
}

export interface AegisConfirmDialogState {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
}
