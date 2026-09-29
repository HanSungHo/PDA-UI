import { createEenAddMockService } from 'src/features/een-add/mocks/een-add.mock';
import type { EenAddResponse } from 'src/features/een-add/types/een-add.types';
import { describe, expect, it } from 'vitest';

describe('EEN Add mock service', () => {
  it('returns full successful flow data', async () => {
    const mock = createEenAddMockService();
    const [routes, tags, operations, positions, inserted] = await Promise.all([
      mock.getProcessFlow('FAB', 'P', 'OP'),
      mock.getTagId('FAB'),
      mock.getProcessOperation('FAB', 'P', 'ROUTE-A'),
      mock.getTagPosition('LOT'),
      mock.insertEen('LOT', 'USER', 'FAB', 'P', 'OP', 'MOVEIN', 'ROUTE-A', 'note', 'TAG'),
    ]);

    expect(routes.messageBody.PROCESSFLOWNAME).toBe('ROUTE-A');
    expect(routes.messageBody.ITEMS).toEqual({
      ITEM: [{ PROCESSFLOWNAME: 'ROUTE-A' }, { PROCESSFLOWNAME: 'ROUTE-B' }],
    });
    expect(tags.messageBody.TAGLIST).toContain('TAG-001\tSurface scratch observed');
    expect(operations.messageBody.ITEMS).toEqual({
      ITEM: [
        { PROCESSOPERATIONNAME: '10001', PODESC: 'Inspection' },
        { PROCESSOPERATIONNAME: '10002', PODESC: 'Packaging' },
      ],
    });
    expect(positions.messageBody.ITEMS).toEqual({
      ITEM: [{ POSITION: '01' }, { POSITION: '05' }, { POSITION: '12' }],
    });
    expect(inserted).toEqual({ isSuccess: true, messageBody: { RESULT: 'OK' }, errorMessage: '' });
  });

  it.each([
    ['tag-id-error', 'getTagId', 'GETTAGID mock error'],
    ['route-error', 'getProcessFlow', 'GETPROCESSFLOW mock error'],
    ['operation-error', 'getProcessOperation', 'GETPROCESSOPERATION mock error'],
    ['position-error', 'getTagPosition', 'GETTAGPOSITION mock error'],
    ['insert-error', 'insertEen', 'INSERTEEN mock error'],
  ] as const)('returns the expected %s error', async (mockCase, method, expectedMessage) => {
    const mock = createEenAddMockService(mockCase);
    const calls: Record<string, () => Promise<EenAddResponse>> = {
      getTagId: () => mock.getTagId('F'),
      getProcessFlow: () => mock.getProcessFlow('F', 'P', 'O'),
      getProcessOperation: () => mock.getProcessOperation('F', 'P', 'O'),
      getTagPosition: () => mock.getTagPosition('LOT'),
      insertEen: () =>
        mock.insertEen('LOT', 'USER', 'F', 'P', 'OP', 'MOVEIN', 'FLOW', 'memo', 'TAG'),
    };
    const response = await calls[method]();

    expect(response.isSuccess).toBe(false);
    expect(response.errorMessage).toBe(expectedMessage);
    expect(response.messageBody).toEqual({});
  });

  it.each([
    ['empty-tags', 'getTagId'],
    ['empty-routes', 'getProcessFlow'],
    ['empty-operations', 'getProcessOperation'],
  ] as const)('returns an empty list for %s', async (mockCase, method) => {
    const mock = createEenAddMockService(mockCase);
    const calls: Record<string, () => Promise<EenAddResponse>> = {
      getTagId: () => mock.getTagId('F'),
      getProcessFlow: () => mock.getProcessFlow('F', 'P', 'O'),
      getProcessOperation: () => mock.getProcessOperation('F', 'P', 'O'),
    };
    const response = await calls[method]();

    expect(response.isSuccess).toBe(true);
    if (mockCase === 'empty-tags') expect(response.messageBody.TAGLIST).toBe('');
    else expect(response.messageBody.ITEMS).toEqual({ ITEM: [] });
  });

  it('returns only matching operations for a non-default route', async () => {
    const mock = createEenAddMockService();
    const response = await mock.getProcessOperation('F', 'P', 'ROUTE-B');

    expect(response.messageBody.ITEMS).toEqual({
      ITEM: [{ PROCESSOPERATIONNAME: '10002', PODESC: 'Packaging' }],
    });
  });
});
