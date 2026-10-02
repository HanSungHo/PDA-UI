import { beforeEach, describe, expect, it } from 'vitest';

import { mockEENSettingItems } from '../../../src/features/een-setting/mocks/een-setting.mock';
import {
  deleteEEN,
  fetchEENModifyData,
  fetchEENSettingItems,
  updateEENModifyItem,
} from '../../../src/features/een-setting/services/een-setting.service';
import type { EENSettingItem } from '../../../src/features/een-setting/types/een-setting.types';

function createMockItem(): EENSettingItem {
  return {
    id: 'een-photo-exposure',
    processOperationName: '1200',
    processName: 'PHOTO-EXPOSURE',
    factoryName: 'GUMI',
    product: 'HIFI-UI',
    route: 'PHOTO',
    operation: '1200',
    poDesc: 'PHOTO DESC',
    eenId: 'EEN-0001',
    actionPoint: 'MOVEIN',
    tagId: 'TAG-001',
    tagComment: 'Existing comment',
    modifyReason: '',
  };
}

describe('EEN setting service', () => {
  beforeEach(() => {
    mockEENSettingItems.splice(0, mockEENSettingItems.length, createMockItem());
  });

  it('loads the selected EEN and TAG options as a service result', async () => {
    const result = await fetchEENModifyData('een-photo-exposure');

    expect(result).toEqual({
      success: true,
      data: {
        item: createMockItem(),
        tagOptions: [
          { tagId: 'TAG-001', tagComment: 'Designer Review and approve before production' },
          { tagId: 'TAG-002', tagComment: '두 번째 TAG 설명' },
        ],
      },
    });
  });

  it('returns the mock service error message when the selected EEN is missing', async () => {
    const result = await fetchEENModifyData('missing-een');

    expect(result).toEqual({
      success: false,
      message: 'EEN 정보를 찾을 수 없습니다.',
    });
  });

  it('updates the selected EEN through the service', async () => {
    const result = await updateEENModifyItem({
      lotId: 'LOT-260927-001',
      userId: 'OPERATOR-01',
      facility: 'GUMI',
      product: 'HIFI-UI',
      operation: '1200',
      actionPoint: 'MOVEOUT',
      eenId: 'EEN-0001',
      processFlow: 'PHOTO',
      oldTagComment: 'Existing comment',
      tagId: 'TAG-002',
      tagComment: 'Updated comment',
      changeCause: 'Change reason',
    });

    expect(result).toEqual({
      success: true,
      data: {
        ...createMockItem(),
        actionPoint: 'MOVEOUT',
        tagId: 'TAG-002',
        tagComment: 'Updated comment',
        modifyReason: 'Change reason',
      },
    });
  });

  it('returns the mock service error message when the EEN update fails', async () => {
    const result = await updateEENModifyItem({
      lotId: 'LOT-260927-001',
      userId: 'OPERATOR-01',
      facility: 'GUMI',
      product: 'HIFI-UI',
      operation: '1200',
      actionPoint: 'MOVEOUT',
      eenId: 'MISSING-EEN',
      processFlow: 'PHOTO',
      oldTagComment: 'Existing comment',
      tagId: 'TAG-002',
      tagComment: 'Updated comment',
      changeCause: 'Change reason',
    });

    expect(result).toEqual({
      success: false,
      message: 'EEN 정보를 찾을 수 없습니다.',
    });
  });

  it('removes the requested item only after receiving the complete delete request', async () => {
    const result = await deleteEEN({
      lotId: 'LOT-01',
      userId: 'OP-1001',
      facility: 'GUMI',
      product: 'HIFI-UI',
      operation: '1200',
      actionPoint: 'MOVEIN',
      eenId: 'EEN-0001',
      route: 'PHOTO',
      comment: 'Existing comment',
      tagId: 'TAG-001',
      deleteReason: '정정 요청',
    });

    expect(result).toEqual({ success: true });
    expect(mockEENSettingItems).toHaveLength(0);
  });

  it('returns a service error and preserves mock data when the requested item is missing', async () => {
    const result = await deleteEEN({
      lotId: 'LOT-01',
      userId: 'OP-1001',
      facility: 'GUMI',
      product: 'HIFI-UI',
      operation: '1200',
      actionPoint: 'MOVEIN',
      eenId: 'EEN-MISSING',
      route: 'PHOTO',
      comment: 'Existing comment',
      tagId: 'TAG-001',
      deleteReason: '정정 요청',
    });

    expect(result).toEqual({ success: false, errorMessage: 'EEN 정보를 찾을 수 없습니다.' });
    expect(mockEENSettingItems).toHaveLength(1);
  });
  it('returns seeded mock rows from the setting list service', async () => {
    const result = await fetchEENSettingItems({ lotId: 'LOT-01', facility: 'GUMI' });

    expect(result).toEqual({ success: true, data: [createMockItem()] });
  });

  it('applies a successful Add result inside the setting service before returning rows', async () => {
    const addedResult = {
      lotId: 'LOT-01',
      facility: 'GUMI',
      product: 'HIFI-UI',
      route: 'PHOTO',
      operation: '1300',
      poDesc: 'Added operation',
      actionPoint: 'MOVEIN',
      tagId: 'TAG-002',
      tagComment: 'Added comment',
    };

    const result = await fetchEENSettingItems({
      lotId: 'LOT-01',
      facility: 'GUMI',
      addedResult,
    });

    if (!result.success) throw new Error(result.message);
    expect(result.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          factoryName: addedResult.facility,
          product: addedResult.product,
          operation: addedResult.operation,
          poDesc: addedResult.poDesc,
          tagId: addedResult.tagId,
          tagComment: addedResult.tagComment,
        }),
      ]),
    );
    expect(mockEENSettingItems).toHaveLength(2);
  });

  it('applies a successful Modify result inside the setting service before returning rows', async () => {
    const modifiedItem = {
      ...createMockItem(),
      actionPoint: 'MOVEOUT',
      tagComment: 'Modified comment',
    };

    const result = await fetchEENSettingItems({
      lotId: 'LOT-01',
      facility: 'GUMI',
      modifiedResult: { lotId: 'LOT-01', item: modifiedItem },
    });

    expect(result).toEqual({ success: true, data: [modifiedItem] });
    expect(mockEENSettingItems[0]).toEqual(modifiedItem);
  });
});
