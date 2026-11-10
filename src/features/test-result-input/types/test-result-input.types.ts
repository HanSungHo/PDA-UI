export interface TestResultDevice {
  mobileServerName: string;
  deviceName: string;
  operatorId: string;
  operatorName: string;
}

export type TestResult<T> = { ok: true; data: T } | { ok: false; message: string };

export interface MaskInfo {
  serialNo: string;
  pellicle: string;
  testDay: string;
  fabInDate: string;
  eqpIds: string[];
  inspTypes: string[];
  inspResults: string[];
  inspType2s: string[];
}

export interface MaskStatus {
  status: string;
  maskTag: string;
}

export interface InspectionFields {
  reticleSeq: string;
  eqpId: string;
  inspType: string;
  inspType2: string;
  inspResult: string;
  inspText: string;
  holdText: string;
  fabInDate: string;
}
