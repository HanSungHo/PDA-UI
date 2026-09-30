export type RcpRecipeCategory = string;

export interface RcpCdItem {
  CDRCP?: string;
  CDMACHINE?: string;
}

export interface RcpOvItem {
  OVRCP?: string;
  OVMACHINE?: string;
}

export interface RcpViItem {
  MACHINERECIPENAME?: string;
  MACHINENAME?: string;
}

export interface RcpMaskItem {
  RETICLENAME?: string;
  MACHINENAME?: string;
}

export interface RcpItem {
  REVIEW_EQUIP?: string;
  MACHINERECIPENAME?: string;
  MACHINENAME?: string;
}

export interface MetRecipeSearchData {
  productSpecName: string;
  processOperationName: string;
  operationDescription: string;
  category: RcpRecipeCategory;
  rcpCdItems: RcpCdItem[];
  rcpOvItems: RcpOvItem[];
  rcpViItems: RcpViItem[];
  maskItems: RcpMaskItem[];
  rcpItems: RcpItem[];
}

export interface MetRecipeSearchResult {
  ok: boolean;
  data?: MetRecipeSearchData;
  message?: string;
}

export interface CheckInspectionRequest {
  lotId: string;
  facility: string;
  type: 'RCP';
  mOper: string;
  sOper: string;
}

export interface CheckInspectionData {
  macroMsg: string;
  scopeMsg: string;
  cdMsg: string;
  ovMsg: string;
  sampleViMsg: string;
  sampleCdMsg: string;
  sampleOvMsg: string;
}

export interface CheckInspectionResult {
  ok: boolean;
  data?: CheckInspectionData;
  message?: string;
}

export interface RcpRecipeRow {
  recipe: string;
  machine: string;
}

export interface RcpRecipeSection {
  id: string;
  title: string;
  machineTitle?: string;
  rows: RcpRecipeRow[];
}
