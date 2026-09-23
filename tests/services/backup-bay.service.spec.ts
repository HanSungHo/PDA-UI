import {
  backupBayService,
  formatAsLegacyBarcode,
  parseLegacyBarcodeLot,
} from 'src/services/backup-bay.service';
import { describe, expect, it } from 'vitest';

describe('backup-bay.service', () => {
  describe('parseLegacyBarcodeLot', () => {
    it('rejects empty or whitespace-only input', () => {
      const resultEmpty = parseLegacyBarcodeLot('');
      expect(resultEmpty.isValid).toBe(false);
      expect(resultEmpty.error).toContain('READING ERROR');

      const resultNull = parseLegacyBarcodeLot(null as unknown as string);
      expect(resultNull.isValid).toBe(false);
    });

    it('rejects barcode without leading space according to legacy spec', () => {
      const result = parseLegacyBarcodeLot('WA24090011');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('READING ERROR: Please scan the LOT number.');
    });

    it('parses valid barcode starting with space and strips check digit', () => {
      // Legacy barcode format: " <LOT_ID><CHECK_DIGIT>"
      const raw = ' WA24090019';
      const result = parseLegacyBarcodeLot(raw);
      expect(result.isValid).toBe(true);
      expect(result.lotId).toBe('WA2409001');
    });

    it('parses barcode starting with space and $', () => {
      const raw = ' $WA2409001X';
      const result = parseLegacyBarcodeLot(raw);
      expect(result.isValid).toBe(true);
      expect(result.lotId).toBe('WA2409001');
    });
  });

  describe('formatAsLegacyBarcode', () => {
    it('formats lotId into scanner representation with leading space and check digit', () => {
      const formatted = formatAsLegacyBarcode('WA2409001');
      expect(formatted.startsWith(' ')).toBe(true);
      const parsed = parseLegacyBarcodeLot(formatted);
      expect(parsed.isValid).toBe(true);
      expect(parsed.lotId).toBe('WA2409001');
    });
  });

  describe('backupBayService API methods', () => {
    it('fetches list of available floors', async () => {
      const floors = await backupBayService.fetchFloors();
      expect(floors).toContain('1F');
      expect(floors).toContain('2F');
    });

    it('fetches bays for a selected floor', async () => {
      const bays1F = await backupBayService.fetchBays('1F');
      expect(bays1F.length).toBeGreaterThan(0);
      expect(bays1F[0]).toContain('BAY-A');

      const baysUnknown = await backupBayService.fetchBays('99F');
      expect(baysUnknown).toEqual([]);
    });

    it('fetches LOT details for known fixtures', async () => {
      const lot1 = await backupBayService.fetchLotInfo('WA2409001');
      expect(lot1.lotProcessState).toBe('WAIT');
      expect(lot1.lotHoldState).toBe('NotOnHold');
      expect(lot1.lotState).toBe('Released');
      expect(lot1.jobCode).toBe('JOB-8821');

      const lotRun = await backupBayService.fetchLotInfo('WA2409002');
      expect(lotRun.lotProcessState).toBe('RUN');

      const lotHold = await backupBayService.fetchLotInfo('WA2409003');
      expect(lotHold.lotHoldState).toBe('OnHold');

      const lotCreated = await backupBayService.fetchLotInfo('WA2409004');
      expect(lotCreated.lotState).toBe('Created');
    });

    it('executes InFactory batch payload', async () => {
      const records = [
        { lotId: 'WA2409001', bay: 'BAY-A01', operatorId: 'OP10023' },
        { lotId: 'WA2409005', bay: 'BAY-A02', operatorId: 'OP10023' },
      ];
      const result = await backupBayService.executeInFactory(records);
      expect(result.success).toBe(true);
      expect(result.successCount).toBe(2);
      expect(result.message).toBe('2 LOTs were completed.');
    });
  });
});
