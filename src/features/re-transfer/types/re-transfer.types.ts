/**
 * Type definitions for ReTransfer (`activity_re_transfer.xml`).
 * Mirrors legacy models and XML payloads from `ReTransferActivity.kt`.
 */

export interface CarryInfoData {
  currentStk: string;
  fabs: string[];
  ports: string[];
  outPortIndex?: number | undefined;
}

export interface FabBayInfoData {
  bays: string[];
}

export interface BayStockerInfoData {
  stockers: string[];
}

export interface PdaListData {
  pdas: string[];
}

export interface CarryRequestPayload {
  lotId: string;
  facility: string;
  nextFab: string;
  nextBay: string;
  nextStocker: string;
  port: string;
  pda: string;
  currentStk: string;
}

export interface ReTransferApiResult<T> {
  ok: boolean;
  data?: T | undefined;
  message?: string | undefined;
}

