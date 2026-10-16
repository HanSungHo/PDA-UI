import type { MessageResponseData } from 'src/types/api';

export type ESheetEdcProcessType = string;

export interface ESheetEdcRequest {
  deviceName: string;
  facility: string;
  lotId: string;
  mobileServerName: string;
  operation: string;
  processStep: string;
  recipe: string;
  subOperation: string;
}

export interface ESheetEdcItem {
  [field: string]: string;
}

export interface ESheetEdcResult {
  PROCESSTYPE?: ESheetEdcProcessType;
  ITEMS?: {
    ITEM?: ESheetEdcItem[];
  };
}

export type ESheetEdcResponse = MessageResponseData;
