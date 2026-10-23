import type { StepperIdleData } from '../types/stepper-idle.types';

/**
 * Parses the raw UDP INTERLOCKMANAGER XML string into structured StepperIdleData.
 *
 * Legacy Kotlin logic (StepperIDLEActivity.kt):
 *   split by "<Table diffgr:" → for each table entry:
 *     arry[1]  → sTime  (발생시간)
 *     arry[3]  → sEqpid (장비명)
 *     arry[6]  → sLotid (LOTNAME)
 *     arry[10] → sWafer (WAFER_NO)
 *
 * Values from each matching table row are appended, matching the legacy TextView behavior.
 */
export function parseStepperIdleMessage(receiverMessage: string): StepperIdleData {
  const empty: StepperIdleData = { sTime: '', sEqpid: '', sLotid: '', sWafer: '' };

  if (!receiverMessage || !receiverMessage.includes('INTERLOCKMANAGER')) {
    return empty;
  }

  // Split on "<Table diffgr:" to get table entries (index 0 is before first table)
  const tableChunks = receiverMessage.split('<Table diffgr:');

  let sTime = '';
  let sEqpid = '';
  let sLotid = '';
  let sWafer = '';

  for (let i = 1; i < tableChunks.length; i++) {
    const parts = tableChunks[i].split('</');

    const extractValue = (index: number): string => {
      const part = parts[index];
      if (!part) return '';
      const lastGt = part.lastIndexOf('>');
      if (lastGt === -1) return '';
      return part.substring(lastGt + 1).trim();
    };

    const time = extractValue(1);
    const eqpid = extractValue(3);
    const lotid = extractValue(6);
    const wafer = extractValue(10);

    // Legacy: only appends if value > "0" (string comparison)
    if (time > '0') sTime += time;
    if (eqpid > '0') sEqpid += eqpid;
    if (lotid > '0') sLotid += lotid;
    if (wafer > '0') sWafer += wafer;
  }

  return { sTime, sEqpid, sLotid, sWafer };
}
