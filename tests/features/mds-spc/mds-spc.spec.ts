import {
  emptyMDSSpcFields,
  MDS_SPC_LIMIT_ROWS,
  MDS_SPC_ROWS,
  MDS_SPC_STATISTIC_ROWS,
  parseMDSSpcMessage,
  parseSPCResult,
} from 'src/features/mds-spc/mds-spc';
import { describe, expect, it } from 'vitest';

import { mdsspcMessage } from './fixtures/mdsspc-message';

describe('MDSSPC legacy message parsing', () => {
  it('maps the positional UDP fields and formats only the displayed timestamp', () => {
    expect(parseMDSSpcMessage(mdsspcMessage)).toEqual({
      Time: '2026-10-26 09:15:30.123',
      Slot: '3',
      Equipid: 'EQP-01',
      Measeqpid: 'MEAS-EQP-01',
      Area: 'AREA-A',
      Proctype: 'ETCH',
      Item: 'LOT-01',
      Sample: 'PORT-02',
      SpcResult: '[1, 3]',
      Parameter: 'ETCH_RATE',
      Avg: '12.5',
      Min: '11.2',
      Max: '13.8',
      Std: '0.4',
      Unif: '1.3',
      Sul: '18',
      Scl: '16',
      Sll: '14',
      Ucl: '20',
      Lcl: '12',
      Sucl: '24',
      CreateTime: '2026-10-26T09:00:00.000+09:00',
    });
  });

  it('leaves fields blank when the legacy activity does not receive an interlock manager', () => {
    expect(parseMDSSpcMessage('<EVENT_TYPE>MDSSPC</EVENT_TYPE>')).toEqual(emptyMDSSpcFields());
    expect(parseMDSSpcMessage(undefined)).toEqual(emptyMDSSpcFields());
  });

  it('preserves the legacy SPC result loop that skips the last character', () => {
    expect(parseSPCResult('FFFT')).toBe('[1, 2, 3]');
    expect(parseSPCResult('F')).toBe('[]');
  });

  it('keeps the Android labels and field groups instead of Figma placeholder copy', () => {
    expect(MDS_SPC_ROWS.flat().map(({ label }) => label)).toEqual([
      '발생시간',
      'ALARM_LEVEL',
      '장비',
      '계측장비',
      'AREA',
      'PROCTYPE',
      'LOTID',
      'PORTID',
      'FACILITY',
      'SPC 결과',
    ]);
    expect(MDS_SPC_STATISTIC_ROWS.flat().map(({ label }) => label)).toEqual([
      'AVG',
      'MIN',
      'MAX',
      'STD',
      'UNIF',
    ]);
    expect(MDS_SPC_LIMIT_ROWS.flat().map(({ label }) => label)).toEqual([
      'SUL',
      'UCL',
      'SCL',
      'LCL',
      'SLL',
      'SUCL',
    ]);
  });
});
