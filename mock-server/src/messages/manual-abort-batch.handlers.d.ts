// Types for tests/e2e/manual-abort-batch.e2e.ts, which answers requests through this handler.
export interface ManualAbortBatchMockResult {
  statusCode: number;
  result: string;
}

export function createManualAbortBatchHandlers(): {
  FURNACEREMANUALLOT: (context: { payload: { LOTID?: string } }) => ManualAbortBatchMockResult;
  FURNACEREMANUALSAVE: (context: {
    payload: { LOTID?: string; EQPID?: string; RCPID?: string; USERID?: string };
  }) => ManualAbortBatchMockResult;
};
