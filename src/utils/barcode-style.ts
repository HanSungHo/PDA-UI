import { COMMON_FIELD } from 'src/constants/common-strings';
import { okDialog } from 'src/services/ok-dialog.service';

export interface BarcodeParseResult {
  isValid: boolean;
  parsedId: string;
}

/** Parses a LOT barcode using the legacy HiFOS format. */
export function barcodeStyleLotId(value: string): BarcodeParseResult {
  if (!value.startsWith(' ')) {
    showReadingError('LOT#를 읽어주세요.');
    return { isValid: false, parsedId: '' };
  }

  let barcodeBody = value.slice(1);
  if (barcodeBody.startsWith('$')) {
    barcodeBody = barcodeBody.slice(1).trimStart();
  }

  const lotId = removeScannerCharacter(barcodeBody);
  return { isValid: Boolean(lotId), parsedId: lotId };
}

/** Parses an equipment barcode using the legacy HiFOS format. */
export function barcodeStyleEqpId(value: string): BarcodeParseResult {
  const normalized = value.trim().toUpperCase();

  if (!normalized.startsWith('EQP-')) {
    showReadingError('진행할 장비를 읽어주세요.');
    return { isValid: false, parsedId: '' };
  }

  const barcodeBody = normalized.slice('EQP-'.length);
  const eqpId = removeScannerCharacter(barcodeBody);

  if (!eqpId) {
    showReadingError('진행할 장비를 읽어주세요.');
    return { isValid: false, parsedId: '' };
  }

  return { isValid: true, parsedId: eqpId };
}

/** Parses a probe-card barcode using the legacy HiFOS format. */
export function barcodeStyleProbeCardId(value: string): BarcodeParseResult {
  if (!value.startsWith(' ')) {
    showReadingError('ProbeCard#를 읽어주세요.');
    return { isValid: false, parsedId: '' };
  }

  const probeCardId = removeScannerCharacter(value.slice(1));
  return { isValid: Boolean(probeCardId), parsedId: probeCardId };
}

function removeScannerCharacter(value: string): string {
  return value ? value.slice(0, -1) : '';
}

function showReadingError(message: string): void {
  void okDialog.show('READING ERROR', message, COMMON_FIELD.BTNOKSTR);
}
