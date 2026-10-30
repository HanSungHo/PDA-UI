/** Android Intent contract for WaferselectAIT_Activity. */
export interface WaferSelectAitInput {
  SEQUENCE?: string;
  FIXEDCOUNT?: string | number;
  LOTID?: string;
  EDITABLE?: string;
  CATEGORY?: string;
  EXISTWAFERLIST?: string;
  DISABLEWAFERLIST?: string;
  SELECTWAFERLIST?: string;
}

export interface WaferSelectAitResult {
  SEQUENCE: string;
  SELECTEDWAFERLIST: string;
  SELECTEDMACHINE: string;
}

export interface WaferSelectAitSlot {
  slotNo: string;
  waferName: string;
  selected: boolean;
  disabled: boolean;
}
