import { createPinia, setActivePinia } from 'pinia';
import { formatAsLegacyBarcode } from 'src/services/backup-bay.service';
import { useBackupBayStore } from 'src/stores/backup-bay.store';
import { beforeEach, describe, expect, it } from 'vitest';

describe('useBackupBayStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('initializes with 7 rows and default states', () => {
    const store = useBackupBayStore();
    expect(store.rows.length).toBe(7);
    expect(store.rows[0].id).toBe(1);
    expect(store.rows[6].id).toBe(7);
    expect(store.rows[0].lotId).toBe('');
    expect(store.isLoading).toBe(false);
    expect(store.isExecuting).toBe(false);
  });

  it('initializes dialog floors and bays properly', async () => {
    const store = useBackupBayStore();
    await store.initDialog();

    expect(store.floorList.length).toBeGreaterThan(0);
    expect(store.rows[0].selectedFloor).toBe(store.floorList[0]);
    expect(store.rows[0].bayOptions.length).toBeGreaterThan(0);
  });

  it('cascades floor change from row 1 to all rows (BB-BR-003)', async () => {
    const store = useBackupBayStore();
    await store.initDialog();

    await store.setFloor(0, '2F');

    // All rows 1..7 should now have '2F'
    for (let i = 0; i < 7; i++) {
      expect(store.rows[i].selectedFloor).toBe('2F');
      expect(store.rows[i].bayOptions[0]).toContain('BAY-B');
    }
  });

  it('changes floor on row 2 without affecting other rows (BB-BR-004)', async () => {
    const store = useBackupBayStore();
    await store.initDialog();

    await store.setFloor(1, '3F');

    expect(store.rows[1].selectedFloor).toBe('3F');
    expect(store.rows[0].selectedFloor).toBe('1F');
    expect(store.rows[2].selectedFloor).toBe('1F');
  });

  it('cascades bay change from row 1 to rows with matching floor (BB-BR-005)', async () => {
    const store = useBackupBayStore();
    await store.initDialog();

    store.setBay(0, 'BAY-A03');

    // Rows 1..6 had the same floor '1F' as row 0, so their bays should sync
    expect(store.rows[1].selectedBay).toBe('BAY-A03');
    expect(store.rows[2].selectedBay).toBe('BAY-A03');

    // If row 3 has a different floor, it shouldn't get synced
    await store.setFloor(2, '2F');
    store.setBay(0, 'BAY-A01');
    expect(store.rows[1].selectedBay).toBe('BAY-A01');
    expect(store.rows[2].selectedBay).not.toBe('BAY-A01');
  });

  it('alerts on empty LOT input (BB-BR-006)', async () => {
    const store = useBackupBayStore();
    const result = await store.processLotInput(0, '');

    expect(result.success).toBe(false);
    expect(store.alertState.open).toBe(true);
    expect(store.alertState.message).toBe('Please enter a LOT NO.');
  });

  it('alerts on barcode missing leading space in strict mode (BB-BR-007)', async () => {
    const store = useBackupBayStore();
    store.allowDirectInputc = false;

    const result = await store.processLotInput(0, 'WA24090011');
    expect(result.success).toBe(false);
    expect(store.alertState.open).toBe(true);
    expect(store.alertState.message).toContain('READING ERROR');
  });

  it('alerts on duplicate LOT across rows (BB-BR-008)', async () => {
    const store = useBackupBayStore();
    store.allowDirectInputc = true;

    // Successfully enter row 0
    await store.processLotInput(0, 'WA2409001');
    expect(store.rows[0].lotId).toBe('WA2409001');

    // Try entering same LOT into row 1
    const result = await store.processLotInput(1, 'WA2409001');
    expect(result.success).toBe(false);
    expect(store.alertState.open).toBe(true);
    expect(store.alertState.title).toBe('Duplicate Lot ID Check');
  });

  it('blocks LOT in RUN state with interlock message (BB-BR-010)', async () => {
    const store = useBackupBayStore();
    const barcode = formatAsLegacyBarcode('WA2409002');

    const result = await store.processLotInput(0, barcode);
    expect(result.success).toBe(false);
    expect(store.alertState.open).toBe(true);
    expect(store.alertState.message).toContain('LOT (WA2409002) has been moved in');
  });

  it('blocks LOT in OnHold state with interlock message (BB-BR-011)', async () => {
    const store = useBackupBayStore();
    const barcode = formatAsLegacyBarcode('WA2409003');

    const result = await store.processLotInput(0, barcode);
    expect(result.success).toBe(false);
    expect(store.alertState.open).toBe(true);
    expect(store.alertState.message).toContain('LOT (WA2409003) is on HOLD');
  });

  it('blocks LOT not in Released state with interlock message (BB-BR-012)', async () => {
    const store = useBackupBayStore();
    const barcode = formatAsLegacyBarcode('WA2409004');

    const result = await store.processLotInput(0, barcode);
    expect(result.success).toBe(false);
    expect(store.alertState.open).toBe(true);
    expect(store.alertState.message).toContain('If LOT (WA2409004) is not in Released state');
  });

  it('populates row data for valid LOT and advances focus (BB-BR-013)', async () => {
    const store = useBackupBayStore();
    const barcode = formatAsLegacyBarcode('WA2409001');

    const result = await store.processLotInput(0, barcode);
    expect(result.success).toBe(true);
    expect(result.focusIndex).toBe(1);
    expect(store.rows[0].lotId).toBe('WA2409001');
    expect(store.rows[0].jobCode).toBe('JOB-8821');
    expect(store.rows[0].quantity).toBe('25');
    expect(store.rows[0].processName).toBe('PHOTO ETCHING PROCESS');
    expect(store.rows[0].isValid).toBe(true);
  });

  it('validates batch run: rejects when no LOT entered (BB-BR-014)', async () => {
    const store = useBackupBayStore();
    const result = await store.executeRun();

    expect(result.success).toBe(false);
    expect(store.alertState.open).toBe(true);
    expect(store.alertState.message).toBe('No information has been entered.');
  });

  it('validates batch run: rejects when LOT has no BAY assigned (BB-BR-014)', async () => {
    const store = useBackupBayStore();
    store.allowDirectInputc = true;
    await store.processLotInput(0, 'WA2409001');
    store.rows[0].selectedBay = '';

    const result = await store.executeRun();
    expect(result.success).toBe(false);
    expect(store.alertState.open).toBe(true);
    expect(store.alertState.message).toBe('The first LOT has no BAY assigned.');
  });

  it('executes batch run successfully, displays completion message and clears (BB-BR-015)', async () => {
    const store = useBackupBayStore();
    store.allowDirectInputc = true;

    await store.initDialog();
    await store.processLotInput(0, 'WA2409001');
    store.setBay(0, 'BAY-A01');

    const result = await store.executeRun();
    expect(result.success).toBe(true);
    expect(result.count).toBe(1);
    expect(store.alertState.open).toBe(true);
    expect(store.alertState.title).toBe('Complete');
    expect(store.alertState.message).toBe('1 LOTs were completed.');

    // Rows should now be cleared
    expect(store.rows[0].lotId).toBe('');
    expect(store.rows[0].jobCode).toBe('');
  });
});
