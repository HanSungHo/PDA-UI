export interface WaferSkipInput {
  lotId: string;
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
  lotId: '',
  waferQty: '',
  machineQty: '',
  reasonList: [],
};
