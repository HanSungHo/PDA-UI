import { describe, expect, it } from 'vitest';

import {
  buildKecLotList,
  getKecBatchItems,
  getKecPortAvailability,
  isKecEquipmentInGroup,
  mapKecBatchRows,
  parseKecEquipmentBarcode,
  readKecString,
} from '../../../src/features/remote-furnace-kec/utils/remote-furnace-kec.util';

const batchRow = {
  LOTID: 'LOT-01',
  COMMENTQTY: 1,
  STATUS: 'WAIT',
  PROCESSSTEP: 'STEP-1',
  PRODUCT: 'PRODUCT-1',
  QUANTITY: 20,
  ERRORMESSAGE: '',
  OPERATION: 'OP-1',
  SUBOPERATION: 'SUB-1',
  LOTSTATE: 'WIP',
  NWCOMMENTQTY: 0,
  OPERSEQUENCE: 4,
  PROCESSNAME: 'NORMAL',
};

describe('remote furnace KEC transformations', () => {
  it('normalizes primitive message values and ignores object/null values', () => {
    expect(readKecString(10)).toBe('10');
    expect(readKecString(false)).toBe('false');
    expect(readKecString(null)).toBe('');
    expect(readKecString({ value: 'x' })).toBe('');
  });

  it('reads list response item arrays, one-item objects and invalid shapes', () => {
    expect(getKecBatchItems({ ITEM: [batchRow] })).toHaveLength(1);
    expect(getKecBatchItems({ ITEM: batchRow })).toHaveLength(1);
    expect(getKecBatchItems({ ITEM: 'bad' })).toEqual([]);
    expect(getKecBatchItems(null)).toEqual([]);
  });

  it('filters normal dummy-process and blank lots without changing valid fields', () => {
    const rows = mapKecBatchRows(
      [
        batchRow,
        { ...batchRow, LOTID: '', PROCESSNAME: 'NORMAL' },
        { ...batchRow, LOTID: 'TEST', PROCESSNAME: 'MW_TEST' },
      ],
      'F',
      {},
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ LOTID: 'LOT-01', STATUS: 'WAIT', QUANTITY: '20' });
  });

  it('uses LOT1-based dummy LOT identifiers and blanks dummy product/status', () => {
    const rows = mapKecBatchRows([batchRow, { ...batchRow, LOTID: 'OLD-2' }], 'T', {
      LOT1: 'DUMMY-1',
      LOT2: '',
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ LOTID: 'DUMMY-1', PRODUCT: '', STATUS: '' });
  });

  it('leaves NONLOT batch rows unchanged and sends an empty LOTLIST only in NONLOT mode', () => {
    const rows = mapKecBatchRows([batchRow], 'NONLOT', {});
    expect(rows[0].LOTID).toBe('LOT-01');
    expect(buildKecLotList(rows, 'NONLOT')).toBe('');
    expect(buildKecLotList(rows, 'F')).toBe("'LOT-01'");
    expect(buildKecLotList([rows[0], { ...rows[0], LOTID: 'LOT-02' }], 'T')).toBe(
      "'LOT-01','LOT-02'",
    );
  });

  it('enables only the legacy actions for IDLE, READY, PENDING and RUN port states', () => {
    expect(getKecPortAvailability('IDLE', '0', '0')).toEqual({
      clearPort: true,
      start: false,
      restart: false,
      enter: true,
      enterStart: true,
    });
    expect(getKecPortAvailability('READY', '1', '1').start).toBe(true);
    expect(getKecPortAvailability('IDLE', '2', '1').enter).toBe(false);
    expect(getKecPortAvailability('PENDING', '1', '1').restart).toBe(true);
    expect(getKecPortAvailability('PENDING', '1', '0').restart).toBe(false);
    expect(getKecPortAvailability('RUN', '1', '1').enter).toBe(true);
    expect(getKecPortAvailability('RUN', '2', '1').enter).toBe(false);
    expect(getKecPortAvailability('INIT', '0', '0').clearPort).toBe(true);
    expect(getKecPortAvailability('', '0', '0').clearPort).toBe(false);
  });

  it('matches legacy equipment singleton/range forms and bypass condition', () => {
    expect(isKecEquipmentInGroup('GROUP', 'EQP-9')).toBe(true);
    expect(isKecEquipmentInGroup('EQP-1,2,3', 'EQP-2')).toBe(true);
    expect(isKecEquipmentInGroup('EQP-1~9', 'EQP-5')).toBe(true);
    expect(isKecEquipmentInGroup('EQP-1~9', 'EQP-12')).toBe(false);
    expect(isKecEquipmentInGroup('EQP-A~C', 'EQP-B')).toBe(true);
    expect(isKecEquipmentInGroup('', 'EQP-1')).toBe(false);
    expect(isKecEquipmentInGroup('EQP-1', 'EQP1')).toBe(false);
  });

  it('requires the EQP- barcode prefix and removes its terminal character', () => {
    expect(parseKecEquipmentBarcode('EQP-MACHINE1*')).toBe('MACHINE1');
    expect(parseKecEquipmentBarcode('MACHINE1*')).toBeUndefined();
    expect(parseKecEquipmentBarcode('EQP-')).toBeUndefined();
  });
});
