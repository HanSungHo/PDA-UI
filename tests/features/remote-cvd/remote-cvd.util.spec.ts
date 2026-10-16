import { describe, expect, it } from 'vitest';

import {
  getChamberStatusClass,
  getPortStateClass,
  mapChamberValues,
  mapRecipeOptions,
  validateEquipmentGroup,
} from '../../../src/features/remote-cvd/utils/remote-cvd.util';

describe('Remote CVD mapping utilities', () => {
  it('splits recipe families and removes down channels using legacy separators', () => {
    expect(
      mapRecipeOptions({ RECIPE: 'BASE:RCP-A,RCP-B', DOWN_CH: 'B' }, 'CVD', 'CVD01', '', ''),
    ).toEqual(['BASE:RCP-A']);

    expect(mapRecipeOptions({ RECIPE: 'BASE:A,B', DOWN_CH: '' }, 'CVD', 'CVD01', '', '')).toEqual([
      'BASE:A',
      'BASE:B',
    ]);
  });

  it('filters paired chamber recipes and maps MBB730 production recipes', () => {
    expect(
      mapRecipeOptions({ RECIPE: 'BASE:A,B', DOWN_CH: '' }, 'SEQUEL', 'CVD01A', '', ''),
    ).toEqual(['BASE:A']);

    expect(
      mapRecipeOptions({ RECIPE: 'BASE:IDLE)PROD', DOWN_CH: '' }, 'MBB730', 'CVD01', '', ''),
    ).toEqual(['PRO_PROD', 'PROD']);
  });

  it('applies legacy recipe delimiters and equipment-specific filtering', () => {
    expect(mapRecipeOptions({ RECIPE: 'BASE-A,B' }, 'OMEGA RAPIER', '', '', '')).toEqual([
      'BASE-A',
      'BASE-B',
    ]);
    expect(mapRecipeOptions({ RECIPE: 'BASE_RCP-A,RCP-B' }, 'DFM', '', '', '')).toEqual([
      'BASE_RCP-A',
      'BASE_RCP-B',
    ]);
    expect(mapRecipeOptions({ RECIPE: 'BASE+SHORT,LONG-RCP' }, 'UNITY-II', '', '', '')).toEqual([
      'BASE+LONG-RCP',
      'BASE+SHORT',
    ]);
    expect(mapRecipeOptions({ RECIPE: 'BASEAB,A,B' }, 'ALTUS', '', '', '')).toEqual([
      'BASEAB',
      'BASEA',
      'BASEB',
    ]);
    expect(mapRecipeOptions({ RECIPE: 'BASE:ONE,TWO' }, 'ALTUS', '', '', '')).toEqual([
      'BASE:ONE',
      'BASE:TWO',
    ]);
  });

  it('filters chamber, scrubber, UVAS, and HPT recipes using the legacy rules', () => {
    expect(mapRecipeOptions({ RECIPE: 'BASE:A,B' }, 'CVD', 'EC04-1A', '', '')).toEqual(['BASE:A']);
    expect(mapRecipeOptions({ RECIPE: 'BASE:A,B' }, 'CVD', 'B01-02', '1', '')).toEqual(['BASE:A']);
    expect(
      mapRecipeOptions({ RECIPE: 'BASE:#0A(TEST),#B(OTHER)' }, 'UVAS', 'UVAS-01', '', ''),
    ).toEqual(['BASE:A', 'BASE:B']);
    expect(
      mapRecipeOptions({ RECIPE: 'BASE_A,BASE_B', DOWN_CH: 'B' }, 'HPT', 'HPT-01', '', ''),
    ).toEqual(['BASE_A']);
    expect(
      mapRecipeOptions({ RECIPE: 'BASE:SHORT,VERY-LONG-RCP' }, 'HPT', 'HPT-01', '', ''),
    ).toEqual(['BASE:VERY-LONG-RCP', 'BASE:SHORT']);
  });

  it('maps chamber readings, equipment group validation, and legacy status colors', () => {
    expect(mapChamberValues({ PARA1: '92%', PARA1_LIMIT: 'N80', PARA4: '' })).toEqual([
      { name: 'A', value: '92%', limit: 'N80' },
      { name: 'B', value: '', limit: '' },
      { name: 'C', value: '', limit: '' },
      { name: 'D', value: '', limit: '' },
    ]);
    expect(validateEquipmentGroup('CVD01,CVD02', 'CVD01')).toBe(true);
    expect(validateEquipmentGroup('FAB-01~03', 'FAB-02')).toBe(true);
    expect(validateEquipmentGroup('FAB-01~03', 'FAB-04')).toBe(false);
    expect(validateEquipmentGroup('FAB-02', 'FAB-02')).toBe(true);
    expect(validateEquipmentGroup('FAB-01~03|FAB-05~07', 'FAB-06')).toBe(true);
    expect(validateEquipmentGroup('FAB-A~C', 'FAB-B')).toBe(true);
    expect(validateEquipmentGroup('FAB-A', 'FABA')).toBe(false);
    expect(validateEquipmentGroup('', '')).toBe(false);
    expect(getChamberStatusClass('OVER')).toBe('over');
    expect(getChamberStatusClass('N90')).toBe('warning');
    expect(getPortStateClass('READY')).toBe('ready');
    expect(getPortStateClass('RESERVED')).toBe('reserved');
  });
});
