import * as factory from 'src/features/move-in/services/message-factory';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mainStore } = vi.hoisted(() => ({
  mainStore: { deviceName: '', mobileServerName: '' },
}));

vi.mock('src/features/main/stores/main.store', () => ({ useMainStore: () => mainStore }));

describe('move-in message factory', () => {
  beforeEach(() => {
    mainStore.deviceName = 'MAIN_DEVICE';
    mainStore.mobileServerName = 'MAIN_SERVER';
  });

  it('maps DIFF equipment lookup fields', () => {
    const message = factory.dummyEqpInfo('EQ1', 'L1');

    expect(message).toContain('<MSGNAME>DUMMYEQPINFO</MSGNAME>');
    expect(message).toContain('<EQPID>EQ1</EQPID>');
    expect(message).toContain('<LOTNO>L1</LOTNO>');
  });

  it('maps COUNT and SLOT selection comments', () => {
    const message = factory.dummyEqpInput('L1', '01(EQ1)', 'SLOT');

    expect(message).toContain('<MSGNAME>DUMMYEQPINPUT</MSGNAME>');
    expect(message).toContain('<LOTNAME>L1</LOTNAME>');
    expect(message).toContain('<LOTLASTEVENT>01(EQ1)</LOTLASTEVENT>');
    expect(message).toContain('<CATEGORY>SLOT</CATEGORY>');
  });

  it.each([
    ['lotInfo', () => factory.lotInfo('L1', 'F1', 'MVIN', 'OP1'), 'LOTINFO'],
    [
      'moveInLotInfo',
      () => factory.moveInLotInfo('L1', 'F1', 'EQ1', 'MVIN', 'OP', 'SUB', 'B1', 'R1'),
      'LOTINFO',
    ],
    ['mcFdcEqpInfo', () => factory.mcFdcEqpInfo('EQ1'), 'MCFDCEQPINFO'],
    ['eqpInfo', () => factory.eqpInfo('EQ1', 'MOVEIN', 'L1'), 'EQPINFO'],
    [
      'recipeInfo',
      () => factory.recipeInfo('N', 'L1', 'OP', 'SUB', 'P1', 'EQ1', 'P', 'F1'),
      'RECIPEINFO',
    ],
    ['loginUserCheck', () => factory.loginUserCheck('OP1', 'EQ1', 'Y'), 'LOGINUSERCHECK'],
    [
      'moveIn',
      () =>
        factory.moveIn(
          'L1',
          'F1',
          'R1',
          'EQ1',
          'OP',
          'SUB',
          'N',
          'OP1',
          'N',
          '',
          '',
          '10',
          'comment',
          'N',
        ),
      'MOVEIN',
    ],
    ['lotInfoEnd', () => factory.lotInfoEnd('L1', 'F1', 'EQ1', 'MOVEINEND', 'S'), 'LOTINFOEND'],
    ['checkDiCycle', () => factory.checkDiCycle('L1', 'F1', 'OP', 'SUB'), 'CHECKDICYCLE'],
    ['slotInfo', () => factory.slotInfo('L1', 'F1'), 'SLOTINFO'],
    [
      'changeEqpStatus',
      () => factory.changeEqpStatus('EQ1', 'F1', 'R', 'RR001', 'comment', 'OP1', 'LOGIN', 'CH1'),
      'CHANGEEQPSTATUS',
    ],
    [
      'checkInspection',
      () => factory.checkInspection('L1', 'F1', 'TYPE', 'OP', 'SUB'),
      'CHECKINSPACTION',
    ],
    ['probeCardInfo', () => factory.probeCardInfo('PC1', 'EQ1'), 'PROBECARDINFO'],
    ['probeCardValue', () => factory.probeCardValue('PC1', 'P1', 'EQ1'), 'PROBECARDVALUE'],
    [
      'setProbeCardHistory',
      () =>
        factory.setProbeCardHistory(
          'L1',
          'F1',
          '10',
          'EQ1',
          'OP',
          'SUB',
          'DESC',
          'OP1',
          'PC1',
          'PCI',
          'MOVEIN',
          'OD',
          'Z',
        ),
      'PROBECARDSET',
    ],
  ])('creates the legacy envelope for %s', (_name, createMessage, messageName) => {
    const message = createMessage();
    expect(message).toContain('<AIFMSG>');
    expect(message).toContain(`<MSGNAME>${messageName}</MSGNAME>`);
    expect(message).toContain('<RECEIVER>MAIN_SERVER</RECEIVER>');
    expect(message).toContain('<SENDER>MAIN_DEVICE</SENDER>');
    expect(message).toContain('<WITHREPLY>YES</WITHREPLY>');
    expect(message).toContain('</MSGBODY>');
    expect(message).toContain('</AIFMSG>');
  });

  it('preserves the exact legacy fields for MOVEIN', () => {
    const message = factory.moveIn(
      'L1',
      'F1',
      'R1',
      'EQ1',
      'OP',
      'SUB',
      'Y',
      'OP1',
      'N',
      'ID',
      'RET',
      '10',
      'note',
      'Y',
    );

    expect(message).toContain('<ISSKIP>Y</ISSKIP>');
    expect(message).toContain('<IDENTCODE>ID</IDENTCODE>');
    expect(message).toContain('<RETICLEID>RET</RETICLEID>');
    expect(message).toContain('<REWORKSKIP>Y</REWORKSKIP>');
  });
});
