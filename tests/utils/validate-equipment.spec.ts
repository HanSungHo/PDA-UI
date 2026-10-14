import { validateEquipment } from 'src/utils/validate-equipment';
import { describe, expect, it } from 'vitest';

describe('validateEquipment', () => {
  it('returns false for empty machineName', () => {
    expect(validateEquipment('EQP-01', '')).toBe(false);
  });

  it('returns true when eqpListString has no hyphen', () => {
    expect(validateEquipment('FAB2', 'EQP-01')).toBe(true);
  });

  it('validates single machine number match', () => {
    expect(validateEquipment('EQP-01', 'EQP-01')).toBe(true);
    expect(validateEquipment('EQP-01', 'EQP-02')).toBe(false);
  });

  it('validates machine number range', () => {
    expect(validateEquipment('EQP-01~05', 'EQP-03')).toBe(true);
    expect(validateEquipment('EQP-01~05', 'EQP-05')).toBe(true);
    expect(validateEquipment('EQP-01~05', 'EQP-06')).toBe(false);
  });

  it('validates multiple groups separated by pipe or comma', () => {
    expect(validateEquipment('EQP-01,03,05~07', 'EQP-03')).toBe(true);
    expect(validateEquipment('EQP-01,03,05~07', 'EQP-06')).toBe(true);
    expect(validateEquipment('EQP-01,03,05~07', 'EQP-04')).toBe(false);
  });

  it('validates multiple prefixes separated by pipe', () => {
    expect(validateEquipment('EQP1-01~03|EQP2-01~03', 'EQP2-02')).toBe(true);
    expect(validateEquipment('EQP1-01~03|EQP2-01~03', 'EQP3-02')).toBe(false);
  });
});
