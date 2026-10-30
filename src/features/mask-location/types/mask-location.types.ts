export interface MaskDevice {
  mobileServerName: string;
  deviceName: string;
  facility: string;
  operatorId: string;
}
export type MaskMessage =
  | 'MASKINFO'
  | 'MASKSTATUSINFO'
  | 'MASKLOCGROUPINFO'
  | 'MASKLOCATIONINFO'
  | 'CHECKMASKPMS'
  | 'CHECKPELLICLE'
  | 'CHANGEMASKLOCATION';
export type MaskFields = Array<[string, string]>;
export type MaskResult<T> = { ok: true; data: T } | { ok: false; message: string };
export interface MaskInfo {
  RETICLETAG: string;
  PRODUCT: string;
  STATUS: string;
  ISUSE: string;
  CURRLOC: string;
  SUBLOCATION3: string;
  CUSTOMER: string;
  RMSINSP: string;
  RMSID: string;
  SHELF: string;
  PELLICLE: string;
}
export interface MaskChange {
  RETICLEID: string;
  FACILITY: string;
  LOCTYPE: string;
  LOCATION: string;
  ETCSTATUS: string;
  ETCLOCATION: string;
  ETCDETAILLOC: string;
  SUBLOCATION3: string;
  OPERATORID: string;
  FLOOR: string;
}
export interface MaskChangeResult {
  RETCILES: string;
  SCOUNT: string;
}
export type MaskFocus = 'mask' | 'location';
export interface MaskDialog {
  title: string;
  message: string;
}
