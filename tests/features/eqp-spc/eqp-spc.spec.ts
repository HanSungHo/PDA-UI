import { mount } from '@vue/test-utils';
import EQPspcScreen from 'src/features/eqp-spc/components/EQPspcScreen.vue';
import {
  concat,
  emptyEQPspcFields,
  parseEQPspcMessage,
  parseSPCResult,
} from 'src/features/eqp-spc/eqp-spc';
import { describe, expect, it } from 'vitest';

function table(values: Record<number, string>): string {
  const segments = Array.from({ length: 25 }, (_, index) => `<V>${values[index] ?? ''}</V>`);
  return `<Table diffgr:id="Table1">${segments.join('')}</Table>`;
}

describe('EQPspcActivity payload', () => {
  it('reads the same positional fields and appends rows like the legacy activity', () => {
    const row = table({
      1: 'LOT-01',
      5: 'RCP-A',
      6: 'EQ-1',
      7: 'CH-1',
      8: 'MEAS-1',
      9: 'FTFF',
      10: 'RULE',
      11: '1',
      12: 'RUN',
      13: 'OCAP',
      17: 'PARAM',
      19: '3',
      20: '1',
      21: '5',
      24: '2026/10/20_10:00:00',
    });
    const fields = parseEQPspcMessage(`INTERLOCKMANAGER${row}${row}`);

    expect(fields).toEqual({
      Lotid: 'LOT-01LOT-01',
      Equipid: 'EQ-1EQ-1',
      Recipe: 'RCP-ARCP-A',
      Chamber: 'CH-1CH-1',
      Parameter: 'PARAMPARAM',
      Measeqpid: 'MEAS-1MEAS-1',
      Slot: '11',
      Min: '11',
      Runtype: 'RUNRUN',
      Max: '55',
      Ocapsheet: 'OCAPOCAP',
      AVG: '33',
      Spcaction: 'RULERULE',
      Time: '2026/10/20_10:00:002026/10/20_10:00:00',
      SPCResult: '[1, 3][1, 3]',
    });
  });

  it('joins legacy values with $ only after the first value', () => {
    expect(concat('', 'A')).toBe('A');
    expect(concat('A', 'B')).toBe('A$B');
  });

  it('ignores non-interlock payloads and values that fail the legacy string comparison', () => {
    expect(parseEQPspcMessage(null)).toEqual(emptyEQPspcFields());
    expect(
      parseEQPspcMessage('INTERLOCKMANAGER<Table diffgr:id="Table1"><V></V><V>LOT-01</V></Table>'),
    ).toEqual({ ...emptyEQPspcFields(), Lotid: 'LOT-01' });
    expect(parseEQPspcMessage(table({ 1: 'LOT' }))).toEqual(emptyEQPspcFields());
    expect(parseEQPspcMessage(`INTERLOCKMANAGER${table({ 1: '0', 5: '' })}`).Lotid).toBe('');
    expect(parseSPCResult('FF')).toBe('[1]');
  });
});

describe('EQPspcScreen', () => {
  it('shows all legacy labels and values in a modal and emits OK once', () => {
    const fields = { ...emptyEQPspcFields(), Lotid: 'LOT-01', SPCResult: '[1, 3]' };
    const wrapper = mount(EQPspcScreen, { props: { fields }, attachTo: document.body });
    const dialog = document.body.querySelector<HTMLElement>(
      '.eqp-spc-modal[aria-label="#EQPSPC INTERLOCK#"]',
    );

    expect(dialog?.querySelector('.ds-modal__title')?.textContent?.trim()).toBe(
      '#EQPSPC INTERLOCK#',
    );
    const rows = Array.from(dialog?.querySelectorAll('.eqp-spc-row') ?? []);
    expect(rows.map((row) => row.querySelectorAll('.ds-input').length)).toEqual([
      2, 2, 2, 2, 2, 2, 2, 1,
    ]);
    const labels = Array.from(dialog?.querySelectorAll('.ds-field__label') ?? []).map((label) =>
      label.textContent?.trim(),
    );
    expect(labels).toEqual([
      'LotID',
      '생산장비',
      'Recipe',
      'Chamber',
      'Parameter',
      '계측장비',
      'Slot',
      'MIN',
      'RunType',
      'MAX',
      'OCAPSheet',
      'AVG',
      'SpcRule',
      '시간',
      'SpcResult',
    ]);
    expect(dialog?.querySelector<HTMLInputElement>('#eqp-spc-Lotid')?.value).toBe('LOT-01');
    expect(dialog?.querySelector<HTMLInputElement>('#eqp-spc-SPCResult')?.value).toBe('[1, 3]');
    dialog?.querySelector<HTMLButtonElement>('.eqp-spc-ok')?.click();
    expect(wrapper.emitted('ok')).toHaveLength(1);
    wrapper.unmount();
  });
});
