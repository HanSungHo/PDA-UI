import type {
  GetScopeLotInfoResult,
  GetSlotInfoResult,
  InputScopeDataPayload,
  InputScopeDataResult,
  WaferSlotItem,
} from '~/features/input-scope-data/types/input-scope-data.types';

import { getScopeLotInfoApi, getSlotInfoApi, inputScopeDataApi } from './input-scope-data.api';

/**
 * Extracts slot numbers from legacy WAFERLIST string using regex [A-Za-z]+[0-9]+\.([0-9]+)
 * e.g., "WA2409001.01,WA2409001.02" -> ["01", "02"]
 */
export function parseWaferSlotNumbers(waferString: string): string[] {
  if (!waferString || waferString.trim().length === 0) {
    return [];
  }

  const regex = /[A-Za-z]+[0-9]+\.([0-9]+)/g;
  const matches = [...waferString.matchAll(regex)];

  if (matches.length > 0) {
    return matches.map((m) => m[1]);
  }

  return waferString
    .split(',')
    .map((s) => s.trim())
    .map((s) => {
      const dotIndex = s.lastIndexOf('.');
      return dotIndex >= 0 ? s.substring(dotIndex + 1) : s;
    })
    .filter((s) => s.length > 0);
}

/**
 * Generates an array of exactly 25 WaferSlotItems (slots 01 through 25).
 * Marks slots present if their 2-digit number is contained in availableSlotNumbers.
 */
export function build25WaferSlots(
  availableSlotNumbers: string[],
  selectedSlots: string[] = [],
): WaferSlotItem[] {
  const availableSet = new Set(availableSlotNumbers.map((s) => s.padStart(2, '0')));
  const selectedSet = new Set(selectedSlots.map((s) => s.padStart(2, '0')));

  const result: WaferSlotItem[] = [];

  for (let i = 1; i <= 25; i++) {
    const slotNumber = i.toString().padStart(2, '0');
    const isPresent = availableSet.has(slotNumber);
    result.push({
      slotNumber,
      waferName: isPresent ? slotNumber : 'empty',
      isPresent,
      isSelected: isPresent && selectedSet.has(slotNumber),
    });
  }

  return result;
}

export const inputScopeDataService = {
  getScopeLotInfo(lotId: string): Promise<GetScopeLotInfoResult> {
    return getScopeLotInfoApi(lotId);
  },

  getSlotInfo(lotId: string, facility = 'FAB1'): Promise<GetSlotInfoResult> {
    return getSlotInfoApi(lotId, facility);
  },

  inputScopeData(payload: InputScopeDataPayload): Promise<InputScopeDataResult> {
    return inputScopeDataApi(payload);
  },

  parseWaferSlotNumbers,
  build25WaferSlots,
};
