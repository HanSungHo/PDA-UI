import * as service from 'src/features/etch-inspection/services/etch-inspection.service';
import { describe, expect, it } from 'vitest';

describe('Etch Inspection service (temporary mock data)', () => {
  it('returns mock inspection data for a searched LOT', async () => {
    const response = await service.searchData('LOT-1');

    expect(response.success).toBe(true);
    expect(response.errorMessage).toBe('');
    expect(response.data).toMatchObject({
      OLDPROCESSOPERATIONNAME: 'ETCH-010',
      OLDOPERATIONDESCRIPTION: 'Etch scope inspection',
      OLDMACHINENAME: 'ETCH-EQP-01',
      NOWPROCESSOPERATIONNAME: 'ETCH-020',
      NOWOPERATIONDESCRIPTION: 'Final etch inspection',
      INSPDATE: '',
      PRODUCTSPECNAME: 'PRODUCT-A',
    });
  });

  it('returns an existing inspection date for the reserved mock LOT', async () => {
    const response = await service.searchData('LOT-EXIST');

    expect(response.data?.INSPDATE).toBe('2026-09-29 10:30:00');
  });

  it('returns a successful execution response for a valid payload', async () => {
    const response = await service.execution({
      facility: 'FAB-A',
      lotId: 'LOT-1',
      product: 'PRODUCT-A',
      oldOperation: 'ETCH-010',
      oldOperationDesc: 'Old operation',
      oldMachine: 'EQP-1',
      operatorId: 'OPERATOR-1',
      comment: 'memo',
    });

    expect(response).toEqual({ success: true, errorMessage: '' });
  });

  it('fails the mock execution when the LOT id is empty', async () => {
    const response = await service.execution({
      facility: 'FAB-A',
      lotId: '',
      product: 'PRODUCT-A',
      oldOperation: 'ETCH-010',
      oldOperationDesc: 'Old operation',
      oldMachine: 'EQP-1',
      operatorId: 'OPERATOR-1',
      comment: '',
    });

    expect(response.success).toBe(false);
    expect(response.errorMessage).toBe('LOT ID를 입력하세요');
  });
});
