import { createPinia, setActivePinia } from 'pinia';
import { useMainStore } from 'src/features/main/stores/main.store';
import * as service from 'src/features/move-in/services/movein.service';
import apiClient from 'src/services/api-client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('src/services/api-client', () => ({
  default: { post: vi.fn() },
}));

describe('move-in service', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    const mainStore = useMainStore();
    mainStore.deviceName = 'WEB_BROWSER';
    mainStore.mobileServerName = 'L4-DEVICE';
  });

  afterEach(() => vi.mocked(apiClient.post).mockClear());

  it.each([
    ['sendLotInfo', ['L1', 'F1', 'MVIN', 'OP1']],
    [
      'sendMoveIn',
      ['L1', 'F1', 'R1', 'EQ1', 'OP', 'SUB', 'N', 'OP1', 'N', '', '', '10', 'note', 'N'],
    ],
    ['sendMcfdcEqpInfo', ['EQ1']],
    ['sendEqpInfo', ['EQ1', 'MOVEIN', 'L1']],
    ['sendRecipeInfo', ['N', 'L1', 'OP', 'SUB', 'P1', 'EQ1', 'P', 'F1']],
    ['sendLoginUserCheck', ['OP1', 'EQ1', 'Y']],
    ['sendLotInfoEnd', ['L1', 'F1', 'EQ1', 'MOVEINEND', 'S']],
    ['sendMoveInLotInfo', ['L1', 'F1', 'EQ1', 'MVIN', 'OP', 'SUB', 'B1', 'R1']],
    ['sendCheckDiCycle', ['L1', 'F1', 'OP', 'SUB']],
    ['sendSlotInfo', ['L1', 'F1']],
    ['sendDummyEqpInfo', ['EQ1', 'L1']],
    ['sendDummyEqpInput', ['L1', '01(EQ1)', 'SLOT']],
    ['sendChangeEqpStatus', ['EQ1', 'F1', 'R', 'RR001', 'note', 'OP1', 'LOGIN', 'CH1']],
    ['sendCheckInspection', ['L1', 'F1', 'TYPE', 'OP', 'SUB']],
    ['sendProbeCardInfo', ['PC1', 'EQ1']],
    ['sendProbeCardValue', ['PC1', 'P1', 'EQ1']],
    [
      'sendSetProbeCardHistory',
      ['L1', 'F1', '10', 'EQ1', 'OP', 'SUB', 'DESC', 'OP1', 'PC1', 'PCI', 'MOVEIN', 'OD', 'Z'],
    ],
  ] as const)(
    'returns a legacy-shaped mock for %s without network access',
    async (methodName, args) => {
      const call = service[methodName] as (...values: readonly unknown[]) => Promise<unknown>;
      const result = await call(...args);

      expect(result).toMatchObject({ isSuccessFul: true });
      expect(String((result as { result?: unknown }).result)).toContain('<MSGBODY>');
      expect(apiClient.post).not.toHaveBeenCalled();
    },
  );

  it('returns a deterministic slot list fixture', async () => {
    const result = await service.sendSlotInfo('L1', 'F1');

    expect(result).toMatchObject({ isSuccessFul: true });
    expect(String(result.result)).toContain('<WAFERLIST>L1.01,L1.02</WAFERLIST>');
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('uses deterministic mock LOT data without making a network request', async () => {
    vi.mocked(apiClient.post).mockClear();

    const result = await service.sendLotInfo('LOT-DEMO-01', 'F1', 'MVIN', 'OP1');

    expect(apiClient.post).not.toHaveBeenCalled();
    expect(result).toMatchObject({ isSuccessFul: true });
    expect(String(result.result)).toContain('<STATE>WIP</STATE>');
    expect(String(result.result)).toContain('<PRODUCT>PRODUCT-DEMO</PRODUCT>');
  });

  it('uses a batch id available in the integrated Batch LOT mock data', async () => {
    const result = await service.sendLotInfo('LOT-DEMO-BATCH', 'KFAB', 'MVIN', 'OP1');

    expect(String(result.result)).toContain('<BATCHID>BAT-A260915-001</BATCHID>');
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('provides an automotive WT fixture for browser verification', async () => {
    const result = await service.sendLotInfo('LOT-DEMO-AUTOMOTIVE', 'F1', 'MVIN', 'OP1');

    expect(String(result.result)).toContain('<PROCESSTYPE>WT</PROCESSTYPE>');
    expect(String(result.result)).toContain('<AUTOMOTIVEFLAG>Y</AUTOMOTIVEFLAG>');
    expect(apiClient.post).not.toHaveBeenCalled();
  });
});
