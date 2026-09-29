export interface EenAddContext {
  lotId: string;
  facility: string;
  product: string;
  route: string;
  operation: string;
  processStep: string;
  operSequence: string;
}

export interface EenRouteOption {
  label: string;
  value: string;
}

export interface EenOperationOption extends EenRouteOption {
  operation: string;
  description: string;
}

export interface EenTagOption {
  label: string;
  value: string;
  comment: string;
}

export interface EenAddResponse {
  isSuccess: boolean;
  messageBody: Record<string, unknown>;
  errorMessage: string;
}

export interface EenAddService {
  getProcessFlow(
    facility: string,
    product: string,
    processOperation: string,
  ): Promise<EenAddResponse>;
  getProcessOperation(
    facility: string,
    product: string,
    processFlow: string,
  ): Promise<EenAddResponse>;
  getTagId(facility: string): Promise<EenAddResponse>;
  getTagPosition(lotId: string): Promise<EenAddResponse>;
  insertEen(
    lotId: string,
    userId: string,
    facility: string,
    product: string,
    operation: string,
    actionPoint: string,
    processFlow: string,
    tagComment: string,
    tagId: string,
  ): Promise<EenAddResponse>;
}
