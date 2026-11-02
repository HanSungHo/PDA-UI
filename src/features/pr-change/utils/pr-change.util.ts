import type { PrInfoMap } from '../types/pr-change.types';

export const PR_LENGTHS = [25, 28, 29] as const;
export const DATE_LENGTH = 12;

/** Legacy PRChangeActivity.getBarcodePrId: strips the scanner prefix and check character. */
export function stripPumpBarcode(value: string): string | null {
  if (value.length <= 2) return null;
  return value.substring(1, value.length - 1);
}

/** Legacy PRChangeActivity.checkPrLength. */
export function isValidPrLength(value: string): boolean {
  return PR_LENGTHS.some((length) => length === value.length);
}

/** Legacy PRChangeActivity.checkDateLength. */
export function isValidDateLength(value: string): boolean {
  return value.length === DATE_LENGTH;
}

/** Legacy PRChangeActivity.extractPrInfo; offsets are kept exactly as in the Kotlin source. */
export function extractPrInfo(sFromPR: string): PrInfoMap {
  const extractPr: PrInfoMap = { PRID: '', VISCOSITY: '', PRLOTNO: '', VALIDATE: '' };

  switch (sFromPR.length) {
    case 25:
      extractPr.PRID = sFromPR.substring(0, 4);
      extractPr.VISCOSITY = sFromPR.substring(4, 8);
      extractPr.PRLOTNO = sFromPR.substring(14, 19);
      extractPr.VALIDATE = sFromPR.substring(19);
      break;
    case 28:
      extractPr.PRID = sFromPR.substring(0, 4);
      extractPr.VISCOSITY = sFromPR.substring(4, 8);
      extractPr.PRLOTNO = `${sFromPR.substring(14, 19)}-${sFromPR.substring(19, 22)}`;
      extractPr.VALIDATE = sFromPR.substring(22);
      break;
    case 29:
      extractPr.PRID = sFromPR.substring(0, 4);
      extractPr.VISCOSITY = sFromPR.substring(4, 8);
      extractPr.PRLOTNO = `${sFromPR.substring(14, 20)}-${sFromPR.substring(19, 22)}`;
      extractPr.VALIDATE = sFromPR.substring(23);
      break;
  }
  return extractPr;
}
