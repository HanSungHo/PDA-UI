import { createPinia, setActivePinia } from 'pinia';
import { moveOutEqpDownService } from 'src/features/move-out/services/moveout-eqp-down.service';
import { useMoveOutEqpDownStore } from 'src/features/move-out/stores/moveout-eqp-down.store';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('useMoveOutEqpDownStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.restoreAllMocks();
  });

  it('initializes with main equipment and chamber list according to legacy EQP-DOWN-001', () => {
    const store = useMoveOutEqpDownStore();
    store.init('PHOTO-01', [
      { CH: 'CH-1', MESSTATE: 'RUN' },
      { CH: 'CH-2', MESSTATE: 'IDLE' },
      { CH: 'CH-3', MESSTATE: 'RUN' },
    ]);

    expect(store.machineName).toBe('PHOTO-01');
    expect(store.isMainChecked).toBe(true);
    expect(store.isSelectAll).toBe(true);
    expect(store.hasChambers).toBe(true);

    expect(store.chambers[0]).toEqual({
      name: 'CH-1',
      mesState: 'RUN',
      enabled: true,
      checked: true,
    });

    expect(store.chambers[1]).toEqual({
      name: 'CH-2',
      mesState: 'IDLE',
      enabled: false,
      checked: false,
    });

    expect(store.chambers[2].enabled).toBe(true);
    expect(store.chambers[2].checked).toBe(true);

    expect(store.enabledChambers.length).toBe(2);
    expect(store.selectedChambers.length).toBe(2);
    expect(store.isValidSelection).toBe(true);
  });

  it('EQP-DOWN-002: toggleSelectAll updates main and all enabled chambers', () => {
    const store = useMoveOutEqpDownStore();
    store.init('PHOTO-01', [
      { CH: 'CH-1', MESSTATE: 'RUN' },
      { CH: 'CH-2', MESSTATE: 'IDLE' },
    ]);

    store.toggleSelectAll(false);
    expect(store.isSelectAll).toBe(false);
    expect(store.isMainChecked).toBe(false);
    expect(store.chambers[0].checked).toBe(false);
    expect(store.chambers[1].checked).toBe(false);

    store.toggleSelectAll(true);
    expect(store.isSelectAll).toBe(true);
    expect(store.isMainChecked).toBe(true);
    expect(store.chambers[0].checked).toBe(true);
    expect(store.chambers[1].checked).toBe(false);
  });

  it('EQP-DOWN-003: unchecking child chamber or main unchecks select all', () => {
    const store = useMoveOutEqpDownStore();
    store.init('PHOTO-01', [
      { CH: 'CH-1', MESSTATE: 'RUN' },
      { CH: 'CH-2', MESSTATE: 'RUN' },
    ]);

    expect(store.isSelectAll).toBe(true);

    store.toggleChamber(0, false);
    expect(store.chambers[0].checked).toBe(false);
    expect(store.isSelectAll).toBe(false);

    store.toggleChamber(0, true);
    expect(store.isSelectAll).toBe(true);

    store.toggleMain(false);
    expect(store.isMainChecked).toBe(false);
    expect(store.isSelectAll).toBe(false);

    store.toggleMain(true);
    expect(store.isSelectAll).toBe(true);
  });

  it('EQP-DOWN-004: blocks submit and shows warning when neither main nor chamber is selected', async () => {
    const store = useMoveOutEqpDownStore();
    store.init('PHOTO-01', [{ CH: 'CH-1', MESSTATE: 'RUN' }]);

    store.toggleMain(false);
    store.toggleChamber(0, false);

    const apiSpy = vi.spyOn(moveOutEqpDownService, 'changeEqpStatus');
    const result = await store.submitDown();

    expect(result.success).toBe(false);
    expect(result.validationError).toBe(true);
    expect(store.alertState.open).toBe(true);
    expect(store.alertState.title).toBe('Warning');
    expect(store.alertState.message).toBe('최소 하나의 장비 또는 챔버를 선택 하세요');
    expect(apiSpy).not.toHaveBeenCalled();
  });

  it('EQP-DOWN-005: submits valid selection to service', async () => {
    const store = useMoveOutEqpDownStore();
    store.init('PHOTO-01', [
      { CH: 'CH-1', MESSTATE: 'RUN' },
      { CH: 'CH-2', MESSTATE: 'IDLE' },
    ]);

    const apiSpy = vi.spyOn(moveOutEqpDownService, 'changeEqpStatus').mockResolvedValueOnce({
      success: true,
      message: 'Equipment status changed successfully.',
    });

    const result = await store.submitDown({
      facility: 'FAB1',
      operatorId: 'OP10023',
      operatorName: 'TEST OPERATOR',
    });

    expect(result.success).toBe(true);
    expect(result.mainDown).toBe(true);
    expect(result.downChambers).toEqual(['CH-1']);
    expect(apiSpy).toHaveBeenCalledWith({
      machine: 'PHOTO-01',
      facility: 'FAB1',
      chamberList: ['CH-1'],
      mainFlag: 'Y',
      operatorId: 'OP10023',
      operatorName: 'TEST OPERATOR',
    });
  });

  it('shows error dialog when API returns error', async () => {
    const store = useMoveOutEqpDownStore();
    store.init('PHOTO-01', [{ CH: 'CH-1', MESSTATE: 'RUN' }]);

    vi.spyOn(moveOutEqpDownService, 'changeEqpStatus').mockResolvedValueOnce({
      success: false,
      errorDesc: 'Equipment interlock failed',
    });

    const result = await store.submitDown();

    expect(result.success).toBe(false);
    expect(store.alertState.open).toBe(true);
    expect(store.alertState.title).toBe('Error');
    expect(store.alertState.message).toBe('Equipment interlock failed');
  });
});
