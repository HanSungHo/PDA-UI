import { useMultiMaskLocation } from 'src/features/multi-mask-location/composables/use-multi-mask-location';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const service = vi.hoisted(() => ({
  changeMaskLocation: vi.fn(),
  fetchMaskDetailLocations: vi.fn(),
  fetchMaskInfo: vi.fn(),
  fetchMaskLocationGroups: vi.fn(),
  fetchMaskStatuses: vi.fn(),
}));

vi.mock('src/features/multi-mask-location/services/multi-mask-location.service', () => service);

const maskInfo = {
  MASKTAG: 'MASK-0001',
  ISUSE: 'Y',
  STATUS: 'STOCK',
  CURRLOC: 'STOCKER-A',
  PRODUCT: 'P-1',
};

function setup() {
  const focusMaskTag = vi.fn();
  const screen = useMultiMaskLocation({
    facility: () => 'GUMI',
    operatorId: () => 'OP-01',
    focusMaskTag,
  });
  return { screen, focusMaskTag };
}

async function scan(screen: ReturnType<typeof setup>['screen'], value: string) {
  screen.maskTag.value = value;
  await screen.scanMask();
}

async function selectTarget(screen: ReturnType<typeof setup>['screen']) {
  service.fetchMaskStatuses.mockResolvedValue(['STOCK']);
  service.fetchMaskLocationGroups.mockResolvedValue(['STOCKER-A']);
  service.fetchMaskDetailLocations.mockResolvedValue(['A-01']);
  await screen.selectFloor('2F');
  await screen.selectStatus('STOCK');
  await screen.selectLocation('STOCKER-A');
  screen.detailLocation.value = 'A-01';
}

describe('useMultiMaskLocation', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    service.fetchMaskInfo.mockResolvedValue(maskInfo);
  });

  it('strips the scanner terminator, appends rows and keeps duplicates like Android', async () => {
    const { screen, focusMaskTag } = setup();

    await scan(screen, 'RT-0001X');
    await scan(screen, 'RT-0001X');

    expect(service.fetchMaskInfo).toHaveBeenCalledWith('RT-0001', 'GUMI');
    expect(screen.rows.value).toHaveLength(2);
    expect(screen.rows.value[0]).toMatchObject({ ...maskInfo, MASKID: 'RT-0001' });
    expect(screen.rows.value[0]?.id).not.toBe(screen.rows.value[1]?.id);
    expect(screen.maskTag.value).toBe('');
    expect(focusMaskTag).toHaveBeenCalled();
  });

  it('asks for a mask when the tag is empty and shows the MASKINFO error', async () => {
    const { screen, focusMaskTag } = setup();

    await screen.scanMask();
    expect(screen.activeDialog.value).toEqual({
      title: '에  러',
      message: '위치 변경할 Mask를 읽어주세요.',
    });
    expect(service.fetchMaskInfo).not.toHaveBeenCalled();

    screen.closeDialog();
    expect(focusMaskTag).toHaveBeenCalledOnce();

    service.fetchMaskInfo.mockRejectedValueOnce(new Error('MASK 정보가 없습니다.'));
    await scan(screen, 'RT-NONEX');
    expect(screen.activeDialog.value?.message).toBe('MASK 정보가 없습니다.');
    expect(screen.rows.value).toHaveLength(0);
  });

  it('adds both masks when a second scan arrives before the first MASKINFO answers', async () => {
    const { screen } = setup();
    let resolveFirst: (value: typeof maskInfo) => void = () => {};
    service.fetchMaskInfo
      .mockReturnValueOnce(new Promise((resolve) => (resolveFirst = resolve)))
      .mockResolvedValueOnce({ ...maskInfo, MASKTAG: 'MASK-0002' });

    screen.maskTag.value = 'RT-0001X';
    const first = screen.scanMask();
    expect(screen.scanning.value).toBe(true);
    await scan(screen, 'RT-0002X');
    // The first scan is still pending, so the screen stays busy.
    expect(screen.scanning.value).toBe(true);
    resolveFirst(maskInfo);
    await first;

    expect(service.fetchMaskInfo).toHaveBeenCalledTimes(2);
    expect(screen.rows.value.map(({ MASKID }) => MASKID)).toEqual(['RT-0002', 'RT-0001']);
    expect(screen.scanning.value).toBe(false);
  });

  it('shows the error message as is, without a substitute text', async () => {
    const { screen } = setup();
    service.fetchMaskStatuses.mockRejectedValueOnce(new Error('Network Error'));
    service.fetchMaskInfo.mockRejectedValueOnce(new Error('timeout of 30000ms exceeded'));

    await screen.selectFloor('2F');
    expect(screen.activeDialog.value?.message).toBe('Network Error');
    screen.closeDialog();

    await scan(screen, 'RT-0001X');
    expect(screen.activeDialog.value?.message).toBe('timeout of 30000ms exceeded');
  });

  it('clears dependent selections and reloads options down the floor > status > location chain', async () => {
    const { screen } = setup();
    await selectTarget(screen);

    expect(service.fetchMaskLocationGroups).toHaveBeenCalledWith('STOCK', '2F', 'GUMI');
    expect(service.fetchMaskDetailLocations).toHaveBeenCalledWith(
      'STOCK',
      'STOCKER-A',
      '2F',
      'GUMI',
    );
    expect(screen.detailLocationOptions.value).toEqual(['A-01']);

    await screen.selectFloor('4F');
    expect(screen.status.value).toBe('');
    expect(screen.location.value).toBe('');
    expect(screen.detailLocation.value).toBe('');
    expect(screen.locationOptions.value).toEqual([]);
    expect(screen.detailLocationOptions.value).toEqual([]);
    expect(service.fetchMaskStatuses).toHaveBeenCalledTimes(2);
  });

  it('ignores an older option response that arrives after a newer selection', async () => {
    const { screen } = setup();
    let resolveFirst: (value: string[]) => void = () => undefined;
    service.fetchMaskLocationGroups
      .mockReturnValueOnce(new Promise<string[]>((resolve) => (resolveFirst = resolve)))
      .mockResolvedValueOnce(['PHOTO']);

    const first = screen.selectStatus('STOCK');
    await screen.selectStatus('INUSE');
    resolveFirst(['STOCKER-A']);
    await first;

    expect(screen.locationOptions.value).toEqual(['PHOTO']);
    expect(screen.loadingOptions.value).toBe(false);
  });

  it('gives feedback for an empty list or a missing selection instead of staying silent', async () => {
    const { screen } = setup();

    await screen.changeLocations();
    expect(screen.activeDialog.value?.message).toBe('위치 변경할 Mask를 읽어주세요.');
    screen.closeDialog();

    await scan(screen, 'RT-0001X');
    await screen.changeLocations();
    expect(screen.activeDialog.value?.message).toBe('변경할 STATUS를 입력하세요.');
    screen.closeDialog();

    screen.status.value = 'STOCK';
    await screen.changeLocations();
    expect(screen.activeDialog.value?.message).toBe('변경할 위치를 입력하세요.');
    screen.closeDialog();

    screen.location.value = 'STOCKER-A';
    await screen.changeLocations();
    expect(screen.activeDialog.value?.message).toBe('변경할 상세위치를 입력하세요.');
    expect(service.changeMaskLocation).not.toHaveBeenCalled();
  });

  it('changes every row and clears the list after all succeed', async () => {
    const { screen } = setup();
    await scan(screen, 'RT-0001X');
    await scan(screen, 'RT-0002X');
    await selectTarget(screen);
    service.changeMaskLocation.mockResolvedValue(undefined);

    await screen.changeLocations();

    expect(service.changeMaskLocation).toHaveBeenCalledTimes(2);
    expect(service.changeMaskLocation).toHaveBeenCalledWith(
      'RT-0002',
      { status: 'STOCK', location: 'STOCKER-A', detailLocation: 'A-01', floor: '2F' },
      { facility: 'GUMI', operatorId: 'OP-01' },
    );
    expect(screen.activeDialog.value).toEqual({ title: '확인', message: '위치가 변경되었습니다.' });
    expect(screen.rows.value).toHaveLength(0);
  });

  it('reports each failed row, then the partial-failure summary, and keeps the list', async () => {
    const { screen } = setup();
    await scan(screen, 'RT-0001X');
    await scan(screen, 'RT-FAILX');
    await selectTarget(screen);
    service.changeMaskLocation
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('RT-FAIL 위치 변경에 실패하였습니다.'));

    await screen.changeLocations();

    expect(screen.activeDialog.value?.message).toBe('RT-FAIL 위치 변경에 실패하였습니다.');
    screen.closeDialog();
    expect(screen.activeDialog.value).toEqual({
      title: '확인',
      message: '위치 변경에 실패한 MASK가 있습니다.',
    });
    expect(screen.rows.value).toHaveLength(2);
  });

  it('ignores a second OK while the change requests are pending', async () => {
    const { screen } = setup();
    await scan(screen, 'RT-0001X');
    await selectTarget(screen);
    let finish: () => void = () => undefined;
    service.changeMaskLocation.mockReturnValueOnce(
      new Promise<void>((resolve) => (finish = resolve)),
    );

    const pending = screen.changeLocations();
    expect(screen.saving.value).toBe(true);
    await screen.changeLocations();
    screen.clearList();
    finish();
    await pending;

    expect(service.changeMaskLocation).toHaveBeenCalledOnce();
    expect(screen.saving.value).toBe(false);
  });

  it('clears the scanned list', async () => {
    const { screen } = setup();
    await scan(screen, 'RT-0001X');

    screen.clearList();

    expect(screen.rows.value).toEqual([]);
  });
});
