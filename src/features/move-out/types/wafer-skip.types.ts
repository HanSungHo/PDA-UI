export interface WaferSkipInput {
  waferQty: string;
  machineQty: string;
  reasonList: string[];
}

export interface WaferSkipResult {
  skipWafer: string;
  minusString: 'MINUS' | '';
  reason: string;
}

export interface WaferSkipPageProps {
  input?: WaferSkipInput;
}

export interface WaferSkipPageEmits {
  (event: 'correct', result: WaferSkipResult): void;
  (event: 'cancel'): void;
}

export const defaultWaferSkipInput: WaferSkipInput = {
  waferQty: '',
  machineQty: '',
  reasonList: [],
};

export const mockWaferSkipInput: WaferSkipInput = {
  waferQty: '25.5',
  machineQty: '20.0',
  reasonList: ['REWORK', 'EQUIPMENT ERROR', 'PROCESS CHANGE'],
};
