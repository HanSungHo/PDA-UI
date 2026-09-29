import type {
  InlineInfoResponse,
  InlineSetResponse,
  MaskLocationInfo,
} from '../types/move-in-inline.types';

export const mockInlineInfo: InlineInfoResponse = {
  isSuccessful: true,

  info: {
    product: 'PRODUCT-A',
    operation: '1200',
    photoJobCode: 'JOB-01',
    maskTag: 'MT001,MT002',
    changeMaskTag: '',
    inlineRecipe: 'RCP-INLINE-01',
    processStep: 'PHOTO',
    quantity: '25',
    criticalStepper: 'STP-01',
    criticalStepper2: 'STP-02',
    criticalStepper3: 'STP-03',
  },
  rows: [
    {
      processName: 'COAT',
      isComplete: 'N',
      localRecipe: 'R1',
      workedEqp: '',
      identCode: 'C',
      subOperation: '01',
    },
    {
      processName: 'EXPOSE',
      isComplete: 'N',
      localRecipe: 'R2',
      workedEqp: '',
      identCode: 'E',
      subOperation: '02',
    },
    {
      processName: 'DEVELOP',
      isComplete: 'N',
      localRecipe: 'R3',
      workedEqp: '',
      identCode: 'D',
      subOperation: '03',
    },
  ],
};

export const mockMaskLocation: MaskLocationInfo = {
  maskTag: 'MT001',
  product: 'PRODUCT-A',
  giben: 'G1',
  status: 'IDLE',
  isUse: 'Y',
  currentLoc: 'STK-01',
  subLocation3: 'A-01',
  afterInsp: 'Y',
};

export const mockInlineSet: InlineSetResponse = {
  isSuccessful: true,
  isExposure: 'Y',
  eqpGroup: 'EG01',
  expEqpGroup: 'EXP01',
  subOperation: '02',
  commentQty: '0',
  nrwCommentQty: '0',
};
