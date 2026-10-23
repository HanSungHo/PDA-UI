import {
  stepperIdleEmptyMessage,
  stepperIdleMockMessage,
} from 'src/features/stepper-idle/mocks/stepper-idle.mock';
import { parseStepperIdleMessage } from 'src/features/stepper-idle/utils/stepper-idle-parser';
import { describe, expect, it } from 'vitest';

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────

/**
 * Build a minimal INTERLOCKMANAGER XML where we can inject arbitrary
 * field values at the exact split-indices the Kotlin legacy uses.
 *
 * Splitting the <Table diffgr:…> chunk by "</" gives:
 *   [0]  → PREAMBLE (X — required filler to offset remaining fields)
 *   [1]  → TIME     (발생시간)
 *   [2]  → COL1     (IDLE, discarded)
 *   [3]  → MACHINE  (장비명)
 *   [4]  → COL3
 *   [5]  → COL4
 *   [6]  → LOTID    (LOTNAME)
 *   [7]  → COL6
 *   [8]  → COL7
 *   [9]  → COL8
 *   [10] → WAFER    (WAFER_NO)
 */
function buildMessage(opts: {
  time?: string;
  machine?: string;
  lotid?: string;
  wafer?: string;
}): string {
  const { time = '', machine = '', lotid = '', wafer = '' } = opts;
  return `<diffgr:diffgram>
  <INTERLOCKMANAGER>
    <Table diffgr:id="Table1" msdata:rowOrder="0">
      <PREAMBLE>X</PREAMBLE>
      <TIME>${time}</TIME>
      <COL1>IDLE</COL1>
      <MACHINE>${machine}</MACHINE>
      <COL3></COL3>
      <COL4></COL4>
      <LOTID>${lotid}</LOTID>
      <COL6></COL6>
      <COL7></COL7>
      <COL8></COL8>
      <WAFER>${wafer}</WAFER>
    </Table>
  </INTERLOCKMANAGER>
</diffgr:diffgram>`;
}

// ──────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────

describe('parseStepperIdleMessage', () => {
  describe('normal parsing from mock message', () => {
    it('parses sTime from the mock fixture', () => {
      const result = parseStepperIdleMessage(stepperIdleMockMessage);
      expect(result.sTime).toBe('2026-10-21T09:15:30.000+09:00');
    });

    it('parses sEqpid (장비명) from the mock fixture', () => {
      const result = parseStepperIdleMessage(stepperIdleMockMessage);
      expect(result.sEqpid).toBe('STEPPER-EQP-01');
    });

    it('parses sLotid (LOTNAME) from the mock fixture', () => {
      const result = parseStepperIdleMessage(stepperIdleMockMessage);
      expect(result.sLotid).toBe('LOT-DEMO-IDLE-01');
    });

    it('parses sWafer (WAFER_NO) from the mock fixture', () => {
      const result = parseStepperIdleMessage(stepperIdleMockMessage);
      expect(result.sWafer).toBe('12');
    });
  });

  describe('empty / no-data conditions', () => {
    it('returns empty strings when message has no table rows', () => {
      const result = parseStepperIdleMessage(stepperIdleEmptyMessage);
      expect(result).toEqual({ sTime: '', sEqpid: '', sLotid: '', sWafer: '' });
    });

    it('returns empty strings when message is an empty string', () => {
      const result = parseStepperIdleMessage('');
      expect(result).toEqual({ sTime: '', sEqpid: '', sLotid: '', sWafer: '' });
    });

    it('returns empty strings when message does not contain INTERLOCKMANAGER', () => {
      const result = parseStepperIdleMessage('<EVENT_TYPE>RECIPE</EVENT_TYPE>');
      expect(result).toEqual({ sTime: '', sEqpid: '', sLotid: '', sWafer: '' });
    });
  });

  describe('legacy guard: value > "0" string comparison', () => {
    it('does NOT include fields whose value is "0" (legacy Kotlin condition: sTime > "0")', () => {
      // "0" is NOT > "0" so the field must remain empty
      const msg = buildMessage({ time: '0', machine: 'EQP-01', lotid: 'LOT-01', wafer: '5' });
      const result = parseStepperIdleMessage(msg);
      expect(result.sTime).toBe('');
    });

    it('includes fields whose value is "1" (> "0" is true)', () => {
      const msg = buildMessage({ time: '1', machine: 'EQP-01', lotid: 'LOT-01', wafer: '1' });
      const result = parseStepperIdleMessage(msg);
      expect(result.sTime).toBe('1');
    });

    it('includes fields whose value is a non-empty date string', () => {
      const msg = buildMessage({
        time: '2026-01-01T00:00:00',
        machine: 'M1',
        lotid: 'L1',
        wafer: '25',
      });
      const result = parseStepperIdleMessage(msg);
      expect(result.sTime).toBe('2026-01-01T00:00:00');
    });
  });

  describe('multiple table rows', () => {
    it('appends values from every table row without a separator', () => {
      const multiRow = `<diffgr:diffgram>
  <INTERLOCKMANAGER>
    <Table diffgr:id="Table1" msdata:rowOrder="0">
      <PREAMBLE>X</PREAMBLE>
      <TIME>T1</TIME>
      <COL1>IDLE</COL1>
      <MACHINE>EQP-A</MACHINE>
      <COL3></COL3>
      <COL4></COL4>
      <LOTID>LOT-A</LOTID>
      <COL6></COL6>
      <COL7></COL7>
      <COL8></COL8>
      <WAFER>5</WAFER>
    </Table>
    <Table diffgr:id="Table2" msdata:rowOrder="1">
      <PREAMBLE>X</PREAMBLE>
      <TIME>T2</TIME>
      <COL1>IDLE</COL1>
      <MACHINE>EQP-B</MACHINE>
      <COL3></COL3>
      <COL4></COL4>
      <LOTID>LOT-B</LOTID>
      <COL6></COL6>
      <COL7></COL7>
      <COL8></COL8>
      <WAFER>10</WAFER>
    </Table>
  </INTERLOCKMANAGER>
</diffgr:diffgram>`;
      const result = parseStepperIdleMessage(multiRow);
      expect(result.sTime).toBe('T1T2');
      expect(result.sEqpid).toBe('EQP-AEQP-B');
      expect(result.sLotid).toBe('LOT-ALOT-B');
      expect(result.sWafer).toBe('510');
    });
  });
});
