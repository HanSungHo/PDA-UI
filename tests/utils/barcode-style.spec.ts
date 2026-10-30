import { afterEach, describe, expect, it } from 'vitest';

import { okDialog } from '~/services/ok-dialog.service';
import {
  barcodeStyleEqpId,
  barcodeStyleLotId,
  barcodeStyleProbeCardId,
  parseEqpBarcode,
  removeScannerCharacter,
} from '~/utils/barcode-style';

afterEach(() => {
  okDialog.confirm();
});

describe('barcodeStyleLotId', () => {
  it('removes the leading space and scanner check character', () => {
    expect(barcodeStyleLotId(' LOT001X')).toEqual({ isValid: true, parsedId: 'LOT001' });
  });

  it('removes a leading dollar marker before parsing', () => {
    expect(barcodeStyleLotId(' $LOT001X')).toEqual({ isValid: true, parsedId: 'LOT001' });
  });

  it('rejects values without the legacy leading space', () => {
    expect(barcodeStyleLotId('LOT001X')).toEqual({ isValid: false, parsedId: '' });
    expect(okDialog.title.value).toBe('READING ERROR');
    expect(okDialog.message.value).toBe('LOT#를 읽어주세요.');
    expect(barcodeStyleLotId(' ')).toEqual({ isValid: false, parsedId: '' });
  });
});

describe('barcodeStyleEqpId', () => {
  it('removes the EQP prefix and scanner check character', () => {
    expect(barcodeStyleEqpId('EQP-EQP01X')).toEqual({ isValid: true, parsedId: 'EQP01' });
  });

  it('normalizes whitespace and lowercase scanner input', () => {
    expect(barcodeStyleEqpId(' eqp-eqp01x ')).toEqual({ isValid: true, parsedId: 'EQP01' });
  });

  it('rejects values that are not equipment barcodes', () => {
    expect(barcodeStyleEqpId('EQP01')).toEqual({ isValid: false, parsedId: '' });
    expect(okDialog.title.value).toBe('READING ERROR');
    expect(okDialog.message.value).toBe('진행할 장비를 읽어주세요.');
    okDialog.confirm();
    expect(barcodeStyleEqpId('EQP-')).toEqual({ isValid: false, parsedId: '' });
    expect(okDialog.isOpen.value).toBe(true);
    expect(okDialog.message.value).toBe('진행할 장비를 읽어주세요.');
    expect(barcodeStyleEqpId('')).toEqual({ isValid: false, parsedId: '' });
  });
});

describe('pure scanner parsing', () => {
  it('removes only the final scanner character', () => {
    expect(removeScannerCharacter('MASK01X')).toBe('MASK01');
    expect(removeScannerCharacter('X')).toBe('');
    expect(removeScannerCharacter('')).toBe('');
  });

  it('parses EQP barcodes without changing case or whitespace or opening a dialog', () => {
    expect(parseEqpBarcode('EQP-EQP01X')).toEqual({ hasPrefix: true, parsedId: 'EQP01' });
    expect(parseEqpBarcode('EQP-')).toEqual({ hasPrefix: true, parsedId: '' });
    expect(parseEqpBarcode('eqp-EQP01X')).toEqual({ hasPrefix: false, parsedId: '' });
    expect(parseEqpBarcode(' EQP-EQP01X')).toEqual({ hasPrefix: false, parsedId: '' });
    expect(okDialog.isOpen.value).toBe(false);
  });
});

describe('barcodeStyleProbeCardId', () => {
  it('removes the leading space and scanner check character', () => {
    expect(barcodeStyleProbeCardId(' PROBE001X')).toEqual({ isValid: true, parsedId: 'PROBE001' });
  });

  it('rejects values without the legacy leading space', () => {
    expect(barcodeStyleProbeCardId('PROBE001X')).toEqual({ isValid: false, parsedId: '' });
    expect(okDialog.title.value).toBe('READING ERROR');
    expect(okDialog.message.value).toBe('ProbeCard#를 읽어주세요.');
    expect(barcodeStyleProbeCardId(' ')).toEqual({ isValid: false, parsedId: '' });
  });
});
