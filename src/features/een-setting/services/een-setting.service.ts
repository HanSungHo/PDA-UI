import { useMainStore } from 'src/features/main/stores/main.store';
import apiClient from 'src/services/api-client';
import {
  getResponseErrorMessage,
  isResponseSuccessful,
  parseMessageBody,
} from 'src/services/message-response.helper';
import type { MessageResponseData } from 'src/types/api';

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
import * as messageFactory from './een-setting.message-factory';

function getMessageResult(response: MessageResponseData) {
  const success = isResponseSuccessful(response);
  return {
    success,
    body: success ? parseMessageBody(response) : {},
    message: success ? '' : getResponseErrorMessage(response),
  };
}

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

export async function fetchEENModifyData(
  itemId: string,
  facility: string,
): Promise<EENModifyDataResult> {
  const itemResult = await getEENModifyDataMock(itemId);
  if (!itemResult.success) return itemResult;

  try {
    const mainStore = useMainStore();
    const response = await apiClient.post<MessageResponseData>('/hifos/gettagid', {
      sMsg: messageFactory.getTagId(facility, mainStore.mobileServerName, mainStore.deviceName),
    });
    const result = getMessageResult(response.data);
    if (!result.success) return { success: false, message: result.message };

    const tagList = result.body.TAGLIST ?? '';
    const tagOptions = tagList
      .split(/\r?\n/)
      .map((row) => row.split('\t'))
      .filter(([tagId]) => Boolean(tagId))
      .map(([tagId, tagComment]) => ({ tagId: tagId ?? '', tagComment: tagComment ?? '' }));

    return { success: true, data: { ...itemResult.data, tagOptions } };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Network error',
    };
  }
}

export async function updateEENModifyItem(
  request: EENModifyUpdateRequest,
): Promise<EENModifyUpdateResult> {
  try {
    const mainStore = useMainStore();
    const response = await apiClient.post<MessageResponseData>('/hifos/updateeen', {
      sMsg: messageFactory.updateEen(request, mainStore.mobileServerName, mainStore.deviceName),
    });
    const result = getMessageResult(response.data);
    if (!result.success) return { success: false, message: result.message };

    return updateEENModifyItemMock(request);
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Network error',
    };
  }
}

export function deleteEEN(request: DeleteEENRequest): Promise<DeleteEENResult> {
  if (!removeMockEENSettingItemByEenId(request.eenId)) {
    return Promise.resolve({ success: false, errorMessage: 'EEN 정보를 찾을 수 없습니다.' });
  }

  return Promise.resolve({ success: true });
}
