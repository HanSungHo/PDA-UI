import type {
  EENModifyDataResult,
  EENModifyUpdateChanges,
  EENModifyUpdateRequest,
  EENModifyUpdateResult,
  EENSettingAddInput,
  EENSettingContext,
  EENSettingItem,
  EENTagOption,
} from '../types/een-setting.types';

export const defaultEENSettingContext: EENSettingContext = {
  lotId: 'LOT-DEMO-01',
  factoryName: 'GUMI',
  route: 'PHOTO-DEMO',
  operation: '1200',
  processStep: 'PHOTO-EXPOSURE',
  product: 'HIFI-UI-DEMO',
  facility: 'GUMI',
};

export const mockEENSettingItems: EENSettingItem[] = [
  {
    id: 'een-photo-exposure',
    processOperationName: '1200',
    processName: 'PHOTO-EXPOSURE',
    factoryName: 'GUMI',
    product: 'HIFI-UI-DEMO',
    route: 'PHOTO-DEMO',
    operation: '1200',
    poDesc: 'PHOTO-EXPOSURE-DESC',
    eenId: 'EEN-0001',
    actionPoint: 'MOVEIN',
    tagId: 'TAG-001',
    tagComment: 'Designer Review and approve before production',
    modifyReason: '',
  },
];

export const mockEENTagOptions: EENTagOption[] = [
  { tagId: 'TAG-001', tagComment: 'Designer Review and approve before production' },
  { tagId: 'TAG-002', tagComment: '두 번째 TAG 설명' },
];

let nextAddedEENSequence = 1;

export function addMockEENSettingItem(input: EENSettingAddInput): EENSettingItem {
  const sequence = nextAddedEENSequence++;
  const item: EENSettingItem = {
    id: `een-added-${sequence}`,
    processOperationName: input.operation,
    processName: input.poDesc,
    factoryName: input.facility,
    product: input.product,
    route: input.route,
    operation: input.operation,
    poDesc: input.poDesc,
    eenId: `EEN-NEW-${String(sequence).padStart(4, '0')}`,
    actionPoint: input.actionPoint,
    tagId: input.tagId,
    tagComment: input.tagComment,
    modifyReason: '',
  };
  mockEENSettingItems.push(item);

  return structuredClone(item);
}

const mockEENNotFoundMessage = 'EEN 정보를 찾을 수 없습니다.';

export async function getEENModifyDataMock(itemId: string): Promise<EENModifyDataResult> {
  await Promise.resolve();

  const item = mockEENSettingItems.find(({ id }) => id === itemId);
  if (!item) return { success: false, message: mockEENNotFoundMessage };

  return {
    success: true,
    data: {
      item: structuredClone(item),
      tagOptions: structuredClone(mockEENTagOptions),
    },
  };
}

export function updateMockEENSettingItem(eenId: string, changes: EENModifyUpdateChanges): boolean {
  const item = mockEENSettingItems.find((entry) => entry.eenId === eenId);
  if (!item) return false;

  Object.assign(item, changes);
  return true;
}

export async function updateEENModifyItemMock(
  request: EENModifyUpdateRequest,
): Promise<EENModifyUpdateResult> {
  await Promise.resolve();

  const changes: EENModifyUpdateChanges = {
    actionPoint: request.actionPoint,
    tagId: request.tagId,
    tagComment: request.tagComment,
    modifyReason: request.changeCause,
  };
  if (!updateMockEENSettingItem(request.eenId, changes)) {
    return { success: false, message: mockEENNotFoundMessage };
  }

  const item = mockEENSettingItems.find(({ eenId }) => eenId === request.eenId);
  return item
    ? { success: true, data: structuredClone(item) }
    : { success: false, message: mockEENNotFoundMessage };
}
export function removeMockEENSettingItemByEenId(eenId: string): boolean {
  const itemIndex = mockEENSettingItems.findIndex((item) => item.eenId === eenId);
  if (itemIndex < 0) return false;

  mockEENSettingItems.splice(itemIndex, 1);
  return true;
}
