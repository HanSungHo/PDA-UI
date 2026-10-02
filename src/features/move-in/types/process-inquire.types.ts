export type MeasureStatus = 'Y' | 'N' | 'C';

export interface MeasureRow {
  id: string;
  subOperation: string;
  processName: string;
  status: MeasureStatus;
  description: string;
}

export interface ProcessInquireForm {
  lotNo: string;
  job: string;
  currentProcess: string;
  productName: string;
  quantity: string;
  currentSlot: string;
  currentWf: string;
  semSlot: string;
  semWf: string;
}

export interface MeasureInfoResponse {
  product: string;
  operation: string;
  subOperation: string;
  photoJobCode: string;
  processStep: string;
  quantity: string;
  slotList: string;
  waferList: string;
  semSlotList: string;
  semWaferList: string;
  measureItems: MeasureRow[];
}
