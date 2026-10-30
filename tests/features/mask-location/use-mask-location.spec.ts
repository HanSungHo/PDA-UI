import { useMaskLocation } from 'src/features/mask-location/composables/use-mask-location';
import { maskLocationService as service } from 'src/features/mask-location/services/mask-location.service';
import type { MaskInfo, MaskResult } from 'src/features/mask-location/types/mask-location.types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('src/features/mask-location/services/mask-location.service', () => ({
  maskLocationService: {
    maskInfo: vi.fn(),
    maskStatusInfo: vi.fn(),
    maskLocGroupInfo: vi.fn(),
    maskLocationInfo: vi.fn(),
    checkMaskPMS: vi.fn(),
    checkPellicle: vi.fn(),
    changeMaskLocation: vi.fn(),
  },
}));
const device = {
  mobileServerName: 'SERVER',
  deviceName: 'PDA',
  facility: 'FAB',
  operatorId: 'USER',
};
const data: MaskInfo = {
  RETICLETAG: 'DISPLAY',
  PRODUCT: 'PROD',
  STATUS: 'READY',
  ISUSE: '사용가능',
  CURRLOC: 'OLD',
  SUBLOCATION3: 'EQP01',
  CUSTOMER: 'Y',
  RMSINSP: 'WAIT',
  RMSID: 'Y',
  SHELF: 'S1',
  PELLICLE: 'P1',
};
const focus = vi.fn();
const make = () => useMaskLocation({ device, focus });
async function loaded() {
  const m = make();
  m.maskTag.value = 'MASK01X';
  await m.setMaskInfo();
  return m;
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(service.maskInfo).mockResolvedValue({ ok: true, data: { ...data } });
  vi.mocked(service.maskStatusInfo).mockResolvedValue({ ok: true, data: ['READY', 'EMPTY'] });
  vi.mocked(service.maskLocGroupInfo).mockResolvedValue({ ok: true, data: ['GROUP'] });
  vi.mocked(service.maskLocationInfo).mockResolvedValue({ ok: true, data: ['SHELF01'] });
  vi.mocked(service.checkMaskPMS).mockResolvedValue({ ok: true, data: 'Y' });
  vi.mocked(service.checkPellicle).mockResolvedValue({ ok: true, data: 'Y' });
  vi.mocked(service.changeMaskLocation).mockResolvedValue({
    ok: true,
    data: { RETCILES: 'MASK01', SCOUNT: '1' },
  });
});
describe('MaskLocationActivity behavior', () => {
  it('initializes disabled, validates empty MASK without request', async () => {
    const m = make();
    expect(m.maskLoaded.value).toBe(false);
    expect(m.manual.value).toBe(false);
    await m.setMaskInfo();
    expect(m.dialog.value?.message).toBe('위치 변경할 Mask를 읽어주세요.');
    expect(service.maskInfo).not.toHaveBeenCalled();
    expect(focus).toHaveBeenCalledWith('mask');
  });
  it('maps every field and keeps reticleId separate from display tag', async () => {
    const m = await loaded();
    expect(service.maskInfo).toHaveBeenCalledWith('MASK01', device);
    for (const [field, value] of Object.entries({
      maskTag: 'DISPLAY',
      reticleId: 'MASK01',
      shelf: 'S1',
      product: 'PROD',
      status: 'READY',
      useYn: '사용가능',
      currentLocation: 'OLD',
      machine: 'EQP01',
      psm: 'Y',
      pellicle: 'P1',
      inspection: 'SKIP',
    }))
      expect(m[field as 'maskTag'].value).toBe(value);
    expect(m.maskLoaded.value).toBe(true);
    expect(focus).toHaveBeenLastCalledWith('location');
  });
  it.each([
    ['RUN', 'Y', ''],
    ['RUN', 'N', ''],
    ['WAIT', 'Y', 'SKIP'],
    ['WAIT', 'N', ''],
  ])('maps RMSINSP=%s RMSID=%s', async (rms, id, expected) => {
    vi.mocked(service.maskInfo).mockResolvedValue({
      ok: true,
      data: { ...data, RMSINSP: rms, RMSID: id, ISUSE: 'N' },
    });
    const m = await loaded();
    expect(m.inspection.value).toBe(expected);
    expect(m.useYn.value).toBe('사용불가');
  });
  it('preserves PELLICLE/PSM and entered location on lookup failure', async () => {
    const m = await loaded();
    m.location.value = 'KEEP';
    m.maskTag.value = 'BADX';
    vi.mocked(service.maskInfo).mockResolvedValue({ ok: false, message: 'lookup failed' });
    await m.setMaskInfo();
    expect(m.pellicle.value).toBe('P1');
    expect(m.psm.value).toBe('Y');
    expect(m.location.value).toBe('KEEP');
    expect(m.product.value).toBe('');
    expect(m.maskLoaded.value).toBe(false);
    expect(m.loading.value).toBe(false);
  });
  it('handles a one-character MASK without throwing', async () => {
    const m = make();
    m.maskTag.value = 'X';
    await m.setMaskInfo();
    expect(service.maskInfo).toHaveBeenCalledWith('', device);
  });
  it.each([
    ['BAD', '', 'READING ERROR'],
    ['eqp-EQP01X', '', 'READING ERROR'],
    [' EQP-EQP01X', '', 'READING ERROR'],
    ['EQP-', '', ''],
    ['EQP-A', '', ''],
    ['EQP-EQP01X', 'EQP01', ''],
  ])('normalizes barcode %s', async (input, expected, title) => {
    const m = await loaded();
    m.location.value = input;
    await m.readLocation();
    expect(m.location.value).toBe(expected);
    if (title) expect(m.dialog.value?.title).toBe(title);
    if (expected) expect(service.checkMaskPMS).toHaveBeenCalledWith('DISPLAY', 'EQP01', device);
    else expect(service.checkMaskPMS).not.toHaveBeenCalled();
  });
  it('loads manual lists only on explicit user changes and clears downstream selections', async () => {
    const m = await loaded();
    m.location.value = 'KEEP';
    await m.manualLocationCombo(true);
    expect(m.floorOptions.value.map((v) => v.value)).toEqual(['2F', '4F', '6F']);
    expect(m.floor.value).toBeUndefined();
    expect(m.statusOptions.value.map((v) => v.value)).toEqual(['READY', 'EMPTY']);
    expect(service.maskLocGroupInfo).not.toHaveBeenCalled();
    m.selectedStatus.value = 'READY';
    m.locGroup.value = 'G';
    m.detailLocation.value = 'D';
    await m.changeFloor('4F');
    expect(m.selectedStatus.value).toBeUndefined();
    expect(m.locGroup.value).toBeUndefined();
    expect(m.detailLocation.value).toBeUndefined();
    await m.changeStatus('READY');
    expect(service.maskLocGroupInfo).toHaveBeenCalledWith('READY', '4F', device);
    await m.changeLocGroup('GROUP');
    expect(service.maskLocationInfo).toHaveBeenCalledWith('READY', 'GROUP', '4F', device);
    await m.changeDetailLocation('SHELF01');
    expect(service.checkMaskPMS).toHaveBeenCalledWith('DISPLAY', 'SHELF01', device);
    await m.manualLocationCombo(false);
    expect(m.floorOptions.value).toEqual([]);
    expect(m.statusOptions.value).toEqual([]);
    expect(m.location.value).toBe('KEEP');
  });
  it('reports prerequisites for list requests', async () => {
    const m = make();
    await m.setCurrentLocSpinner();
    expect(m.dialog.value?.message).toBe('상태를 선택해주세요');
    await m.setDetailLocation();
    expect(m.dialog.value?.message).toBe('상태를 선택해주세요');
    m.selectedStatus.value = 'READY';
    await m.setDetailLocation();
    expect(m.dialog.value?.message).toBe('현재위치를 선택해주세요');
  });
  it('checks PM against direct location even in manual mode', async () => {
    const m = await loaded();
    m.product.value = 'PM';
    m.manual.value = true;
    m.location.value = 'DIRECT';
    await m.checkPMSShelf('DETAIL');
    expect(service.checkPellicle).toHaveBeenCalledWith('DISPLAY', 'DIRECT', device);
    expect(service.checkMaskPMS).not.toHaveBeenCalled();
  });
  it.each(['psm', 'pellicle'])('handles %s rejection in direct and manual mode', async (kind) => {
    const m = await loaded();
    m.product.value = kind === 'pellicle' ? 'PM' : 'PROD';
    m.location.value = 'S';
    vi.mocked(kind === 'psm' ? service.checkMaskPMS : service.checkPellicle).mockResolvedValue({
      ok: true,
      data: 'N',
    });
    await m.checkPMSShelf('S');
    expect(m.location.value).toBe('S');
    expect(m.dialog.value?.message).toBe(
      kind === 'psm'
        ? 'PSM MASK 입니다.\n전용 SHELF를 지정해야 합니다.'
        : 'Pellicle이 다른 장비입니다.',
    );
    m.closeDialog();
    expect(m.location.value).toBe('');
    m.manual.value = true;
    m.selectedStatus.value = 'READY';
    m.locGroup.value = 'GROUP';
    m.detailLocation.value = 'S';
    await m.checkPMSShelf('S');
    expect(service.maskLocationInfo).not.toHaveBeenCalled();
    expect(m.detailLocation.value).toBe('S');
    m.closeDialog();
    await Promise.resolve();
    expect(service.maskLocationInfo).toHaveBeenCalled();
    expect(m.detailLocation.value).toBeUndefined();
  });
  it.each(['psm', 'pellicle'])(
    'keeps manual detail after %s rejection when the acknowledged reload fails',
    async (kind) => {
      const m = await loaded();
      m.product.value = kind === 'pellicle' ? 'PM' : 'PROD';
      await m.manualLocationCombo(true);
      await m.changeStatus('READY');
      await m.changeLocGroup('GROUP');
      const previousOptions = m.detailOptions.value;
      vi.mocked(kind === 'psm' ? service.checkMaskPMS : service.checkPellicle).mockResolvedValue({
        ok: true,
        data: 'N',
      });
      await m.changeDetailLocation('SHELF01');
      expect(service.maskLocationInfo).toHaveBeenCalledTimes(1);
      let resolve!: (value: MaskResult<string[]>) => void;
      vi.mocked(service.maskLocationInfo).mockReturnValueOnce(
        new Promise((r) => {
          resolve = r;
        }),
      );
      m.closeDialog();
      expect(service.maskLocationInfo).toHaveBeenLastCalledWith('READY', 'GROUP', '', device);
      expect(m.loading.value).toBe(true);
      expect(m.detailLocation.value).toBe('SHELF01');
      expect(m.detailOptions.value).toBe(previousOptions);
      resolve({ ok: false, message: 'detail reload failed' });
      await Promise.resolve();
      expect(m.loading.value).toBe(false);
      expect(m.dialog.value?.message).toBe('detail reload failed');
      expect(m.detailLocation.value).toBe('SHELF01');
      expect(m.detailOptions.value).toBe(previousOptions);
      m.closeDialog();
      await m.changeMaskLoc();
      expect(service.changeMaskLocation).toHaveBeenCalledWith(
        expect.objectContaining({ ETCDETAILLOC: 'SHELF01' }),
        device,
      );
    },
  );
  it.each([{ values: ['NEW'] }, { values: [] }])(
    'replaces manual detail only after reload PASS: $values',
    async ({ values }) => {
      const m = await loaded();
      m.selectedStatus.value = 'READY';
      m.locGroup.value = 'GROUP';
      await m.setDetailLocation();
      await m.changeDetailLocation('SHELF01');
      let resolve!: (value: MaskResult<string[]>) => void;
      vi.mocked(service.maskLocationInfo).mockReturnValueOnce(
        new Promise((r) => {
          resolve = r;
        }),
      );
      const pending = m.setDetailLocation();
      expect(m.detailLocation.value).toBe('SHELF01');
      expect(m.detailOptions.value).toEqual([{ label: 'SHELF01', value: 'SHELF01' }]);
      resolve({ ok: true, data: values });
      await pending;
      expect(m.detailLocation.value).toBeUndefined();
      expect(m.detailOptions.value).toEqual(values.map((value) => ({ label: value, value })));
    },
  );
  it('clears previous detail when the user changes group even if loading its list fails', async () => {
    const m = await loaded();
    m.selectedStatus.value = 'READY';
    await m.changeLocGroup('GROUP');
    await m.changeDetailLocation('SHELF01');
    vi.mocked(service.maskLocationInfo).mockResolvedValueOnce({
      ok: false,
      message: 'group failed',
    });
    await m.changeLocGroup('OTHER');
    expect(m.locGroup.value).toBe('OTHER');
    expect(m.detailLocation.value).toBeUndefined();
    expect(m.detailOptions.value).toEqual([]);
    expect(m.dialog.value?.message).toBe('group failed');
  });
  it('checks missing MASK before PSM', async () => {
    const m = make();
    await m.checkPMSShelf('S');
    expect(m.dialog.value?.message).toBe('MASK를 입력하세요.');
    expect(focus).toHaveBeenCalledWith('mask');
  });
  it('validates all save prerequisites in order without calling save', async () => {
    const m = make();
    await m.changeMaskLoc();
    expect(m.dialog.value?.message).toBe('MASK를 입력하세요.');
    m.maskTag.value = 'M';
    await m.changeMaskLoc();
    expect(m.dialog.value?.message).toBe('위치를 입력하세요.');
    m.manual.value = true;
    await m.changeMaskLoc();
    expect(m.dialog.value?.message).toBe('변경할 STATUS를 입력하세요.');
    m.selectedStatus.value = 'READY';
    await m.changeMaskLoc();
    expect(m.dialog.value?.message).toBe('변경할 위치를 입력하세요.');
    m.locGroup.value = 'G';
    await m.changeMaskLoc();
    expect(m.dialog.value?.message).toBe('변경할 상세위치를 입력하세요.');
    expect(service.changeMaskLocation).not.toHaveBeenCalled();
  });
  it.each([false, true])(
    'saves exact payload manual=%s and resets after acknowledgement',
    async (manual) => {
      const m = await loaded();
      m.manual.value = manual;
      m.location.value = 'DIRECT';
      m.selectedStatus.value = 'READY';
      m.locGroup.value = 'G';
      m.detailLocation.value = 'DETAIL';
      await m.changeMaskLoc();
      expect(service.changeMaskLocation).toHaveBeenCalledWith(
        {
          RETICLEID: 'MASK01',
          FACILITY: 'FAB',
          LOCTYPE: manual ? 'ETC' : '',
          LOCATION: manual ? '' : 'DIRECT',
          ETCSTATUS: manual ? 'READY' : '',
          ETCLOCATION: manual ? 'G' : '',
          ETCDETAILLOC: manual ? 'DETAIL' : '',
          SUBLOCATION3: 'EQP01',
          OPERATORID: 'USER',
          FLOOR: '',
        },
        device,
      );
      expect(m.dialog.value?.message).toBe('MASK01 위치가 변경되었습니다.');
      expect(m.maskTag.value).toBe('DISPLAY');
      expect(m.location.value).toBe('DIRECT');
      expect(m.maskLoaded.value).toBe(true);
      m.closeDialog();
      expect(m.maskTag.value).toBe('');
      expect(m.location.value).toBe('');
      expect(m.maskLoaded.value).toBe(false);
      expect(m.pellicle.value).toBe('P1');
      expect(focus).toHaveBeenLastCalledWith('mask');
      expect(service.checkMaskPMS).not.toHaveBeenCalled();
    },
  );
  it.each(['', '0', '2'])('handles SCOUNT %s', async (count) => {
    vi.mocked(service.changeMaskLocation).mockResolvedValue({
      ok: true,
      data: { RETCILES: 'M1,M2', SCOUNT: count },
    });
    const m = await loaded();
    m.location.value = 'S';
    await m.changeMaskLoc();
    expect(m.dialog.value?.message).toBe(
      count === '2' ? '동일한 Serial/위치인 MASK가 변경되었습니다.\n[M1,M2]' : undefined,
    );
    if (count === '2') {
      expect(m.maskTag.value).toBe('DISPLAY');
      m.closeDialog();
    }
    expect(m.maskTag.value).toBe('');
  });
  it('keeps inputs on failure, releases loading and prevents duplicate saves', async () => {
    const m = await loaded();
    m.location.value = 'S';
    let resolve!: (value: { ok: false; message: string }) => void;
    vi.mocked(service.changeMaskLocation).mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const pending = m.changeMaskLoc();
    await m.changeMaskLoc();
    expect(service.changeMaskLocation).toHaveBeenCalledTimes(1);
    resolve({ ok: false, message: 'save failed' });
    await pending;
    expect(m.location.value).toBe('S');
    expect(m.maskTag.value).toBe('DISPLAY');
    expect(m.loading.value).toBe(false);
    expect(m.dialog.value?.message).toBe('save failed');
  });
});
