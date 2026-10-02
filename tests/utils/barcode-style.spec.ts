import { afterEach, describe, expect, it } from 'vitest';

import { okDialog } from '~/services/ok-dialog.service';
import {
  barcodeStyleEqpId,
  barcodeStyleLotId,
  barcodeStyleProbeCardId,
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
