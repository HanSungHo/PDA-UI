import {
  addMockEENSettingItem,
  getEENModifyDataMock,
  mockEENSettingItems,
  removeMockEENSettingItemByEenId,
  updateEENModifyItemMock,
} from '../mocks/een-setting.mock';
import type {
  DeleteEENRequest,
  DeleteEENResult,
  EENModifyDataResult,
  EENModifyUpdateRequest,
  EENModifyUpdateResult,
  EENSettingAddInput,
  EENSettingItem,
} from '../types/een-setting.types';

export interface FetchEENSettingItemsRequest {
  lotId: string;
  facility: string;
  addedResult?: EENSettingAddInput & { lotId: string };
  modifiedResult?: { lotId: string; item: EENSettingItem };
}

export type FetchEENSettingItemsResult =
  | { success: true; data: EENSettingItem[] }
  | { success: false; message: string };

export async function fetchEENSettingItems(
  request: FetchEENSettingItemsRequest,
): Promise<FetchEENSettingItemsResult> {
  await Promise.resolve();

  if (request.addedResult?.lotId === request.lotId) {
    const { lotId: _lotId, ...itemInput } = request.addedResult;
    addMockEENSettingItem(itemInput);
  }

  if (request.modifiedResult?.lotId === request.lotId) {
    const itemIndex = mockEENSettingItems.findIndex(
      ({ id }) => id === request.modifiedResult?.item.id,
    );
    if (itemIndex >= 0) {
      Object.assign(mockEENSettingItems[itemIndex], request.modifiedResult.item);
    }
  }

  return { success: true, data: structuredClone(mockEENSettingItems) };
}

export function fetchEENModifyData(itemId: string): Promise<EENModifyDataResult> {
  return getEENModifyDataMock(itemId);
}

export function updateEENModifyItem(
  request: EENModifyUpdateRequest,
): Promise<EENModifyUpdateResult> {
  return updateEENModifyItemMock(request);
}

export function deleteEEN(request: DeleteEENRequest): Promise<DeleteEENResult> {
  if (!removeMockEENSettingItemByEenId(request.eenId)) {
    return Promise.resolve({ success: false, errorMessage: 'EEN 정보를 찾을 수 없습니다.' });
  }

  return Promise.resolve({ success: true });
}
