import { setMockChangeEqpStatusOverride } from 'src/services/mocks/moveout-eqp-down.mock';
import { sendChangeEqpStatusApi } from 'src/services/moveout-eqp-down.api';
import { afterEach, describe, expect, it } from 'vitest';

describe('moveout-eqp-down.api (XML HTTP API conforming to technical_requirement.md section 4)', () => {
  afterEach(() => {
    setMockChangeEqpStatusOverride(null);
  });

  it('sends CHANGEEQPSTATUS with valid payload and receives SUCCESS response', async () => {
    const result = await sendChangeEqpStatusApi({
      machine: 'PHOTO-01',
      facility: 'FAB1',
      chamberList: ['CH-1'],
      mainFlag: 'Y',
      operatorId: 'OP10023',
      operatorName: 'KIM OPERATOR',
    });

    expect(result.success).toBe(true);
    expect(result.message).toBe('Equipment status changed successfully.');
    expect(result.errorDesc).toBeUndefined();
  });

  it('handles server failure response when result is ERROR', async () => {
    setMockChangeEqpStatusOverride({
      result: 'ERROR',
      errorDesc: 'Equipment is currently in an invalid state for LOAD DOWN transition.',
    });

    const result = await sendChangeEqpStatusApi({
      machine: 'PHOTO-01',
      facility: 'FAB1',
      chamberList: ['CH-1'],
      mainFlag: 'Y',
    });

    expect(result.success).toBe(false);
    expect(result.errorDesc).toContain('Equipment is currently in an invalid state');
  });

  it('handles mock validation when mainFlag is N and chamberList is empty', async () => {
    const result = await sendChangeEqpStatusApi({
      machine: 'PHOTO-01',
      chamberList: [],
      mainFlag: 'N',
    });

    expect(result.success).toBe(false);
    expect(result.errorDesc).toBe('Select at least one equipment unit or chamber.');
  });
});
