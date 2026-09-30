import type {
  BarcodeParseResult,
  InFactoryRecord,
  InFactoryResult,
  LotInfoResult,
} from 'src/types/backup-bay.types';

/**
 * Parses raw barcode input according to legacy HiFOS PDA logic (BarcodeStyle.kt & BB-BR-007).
 * Barcode scanner prepends a space (' ') and check digit at the end.
 * If input starts with '$', it is stripped.
 * The last character (check digit) is removed.
 */
export function parseLegacyBarcodeLot(rawInput: string): BarcodeParseResult {
  if (!rawInput || !rawInput.startsWith(' ')) {
    return {
      isValid: false,
      lotId: '',
      error: 'LOT#를 읽어주세요.',
    };
  }

  let clean = rawInput.replace(/^ /, '');
  if (clean.startsWith('$')) {
    clean = clean.replace(/^\$/, '').trimStart();
  }

  const parsedLotId = clean.length > 0 ? clean.substring(0, clean.length - 1) : clean;

  return {
    isValid: parsedLotId.length > 0,
    lotId: parsedLotId,
  };
}

/**
 * Formats a clean lotId into a legacy barcode scanner payload (prefixed space + trailing check digit).
 * Useful for scanner simulation and automat  ctests.
 */
export function formatAsLegacyBarcode(lotId: string): string {
  return ` ${lotId}9`;
}

import {
  getBayDataApi,
  getFloorDataApi,
  getProcessFactoryLotApi,
  sendInFactoryApi,
} from './backup-bay.api';

export const backupBayService = {
  /**
   * Fetch available floors (GETFLOORDATA)
   */
  async fetchFloors(): Promise<string[]> {
    return getFloorDataApi();
  },

  /**
   * Fetch bay options for a specific floor (GETBAYDATA)
   */
  async fetchBays(floor: string): Promise<string[]> {
    return getBayDataApi(floor);
  },

  /**
   * Fetch LOT details and status (GETPROCESSFACTORYLOT)
   */
  async fetchLotInfo(lotId: string): Promise<LotInfoResult> {
    return getProcessFactoryLotApi(lotId);
  },

  /**
   * Execute backup bay update transaction (INFACTORY)
   */
  async executeInFactory(
    records: InFactoryRecord[],
    operatorId?: string,
  ): Promise<InFactoryResult> {
    return sendInFactoryApi(records, operatorId);
  },
};
