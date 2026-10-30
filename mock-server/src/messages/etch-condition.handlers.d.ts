// Types for tests/e2e/etch-condition.e2e.ts, which answers requests through this handler.
export interface EtchConditionMockResult {
  statusCode: number;
  result: string;
}

export function createEtchConditionHandlers(): {
  ETCHCOMMRCPFROMB: (context: {
    payload: { LOTID?: string; CHKEQPID?: string };
  }) => EtchConditionMockResult;
};
