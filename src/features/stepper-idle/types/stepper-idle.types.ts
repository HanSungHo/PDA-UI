export interface StepperIdleData {
  /** 발생시간 — occurrence time parsed from UDP XML */
  sTime: string;
  /** 장비명 — equipment ID parsed from UDP XML */
  sEqpid: string;
  /** LOTNAME — lot ID parsed from UDP XML */
  sLotid: string;
  /** WAFER_NO — wafer number parsed from UDP XML */
  sWafer: string;
}

export interface StepperIdleDialogProps {
  /** v-model:open */
  open: boolean;
  /** Raw UDP receiver message string (INTERLOCKMANAGER XML) */
  receiverMessage: string;
}

export interface StepperIdleDialogEmits {
  (e: 'update:open', value: boolean): void;
  (e: 'confirm'): void;
}
