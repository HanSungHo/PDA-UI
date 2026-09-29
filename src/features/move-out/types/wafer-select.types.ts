export type WaferSelectCategory = 'COUNT' | 'SLOT' | '';

export interface WaferInfo {
  waferId: string;
  slotNo: string;
  machine: string;
  selected: boolean;
  disabled: boolean;
}

export interface WaferSelectInput {
  sequence: string;
  fixedCount: number;
  lotId: string;
  category: WaferSelectCategory;
  editable: boolean;
  area: string;
  existingWaferList: string;
  disableWaferList: string;
  selectWaferList: string;
}

export interface WaferSelectResult {
  sequence: string;
  selectedWaferList: string;
  selectedMachine: string;
}

export interface WaferSelectPageProps {
  input?: WaferSelectInput;
}

export interface WaferSelectPageEmits {
  (event: 'select', result: WaferSelectResult): void;
  (event: 'cancel'): void;
}

export const defaultWaferSelectInput: WaferSelectInput = {
  sequence: '',
  fixedCount: 0,
  lotId: '',
  category: 'SLOT',
  editable: true,
  area: '',
  existingWaferList: '',
  disableWaferList: '',
  selectWaferList: '',
};

export interface DummyEqpInfoResponse {
  EQPID: string;
}

export interface LotLastEventResponse {
  CREATECATEGORY: 'COUNT' | 'SLOT';
  LASTEVENTCOMMENT: string;
}

export interface DummyEqpInputResponse {
  LOTCOMMENT: string;
  MSG: string;
}
