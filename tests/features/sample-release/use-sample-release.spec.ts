import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { currentRoute, mockGetSampleReleaseInfo, mockExecuteSampleRelease } = vi.hoisted(() => ({
  currentRoute: { query: {} as Record<string, string> },
  mockGetSampleReleaseInfo: vi.fn(),
  mockExecuteSampleRelease: vi.fn(),
}));

vi.mock('vue-router', () => ({
  useRoute: () => currentRoute,
  useRouter: () => ({ back: vi.fn() }),
}));

vi.mock('src/features/main/stores/main.store', () => ({
  useMainStore: () => ({ facility: 'FAB1', operatorId: 'OP-01' }),
}));

vi.mock('src/features/sample-release/services/sample-release.service', () => ({
  sampleReleaseService: {
    getSampleReleaseInfo: mockGetSampleReleaseInfo,
    executeSampleRelease: mockExecuteSampleRelease,
  },
}));

import { useSampleRelease } from 'src/features/sample-release/composables/use-sample-release';

const item = {
  SLOTNAME: 'SLOT-001',
  SQTY: '5',
  SPROD: 'PROD-01',
  SOPER: '1000',
  SOPERDESC: 'Sample operation',
  SPROCESS: 'ROUTE-01',
  RPROD: 'PROD-01',
  RPROCESS: 'ROUTE-01',
  ROPER: '1000',
  RMACHINENAME: 'MC-01',
  MLOTNAME: 'MLOT-001',
  MQTY: '20',
  MPROD: 'PROD-01',
  MPROCESS: 'ROUTE-01',
  MOPER: '1000',
  MOPERDESC: 'Main operation',
  MPROCESSSTATE: 'WAIT',
};

describe('useSampleRelease', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSampleReleaseInfo.mockResolvedValue({ isSuccessFul: true, result: { ITEMS: [item] } });
    mockExecuteSampleRelease.mockResolvedValue({
      isSuccessFul: true,
      result: { SUCESSMSG: 'success' },
    });
  });

  it('loads the LOT from either supported route query key on mount', async () => {
    const Harness = {
      setup: () => useSampleRelease(),
      template: '<div />',
    };

    currentRoute.query = { LOTID: 'lot-001' };
    mount(Harness);
    await vi.waitFor(() => expect(mockGetSampleReleaseInfo).toHaveBeenCalledWith('LOT-001'));

    vi.clearAllMocks();
    currentRoute.query = { lotId: 'lot-002' };
    mount(Harness);
    await vi.waitFor(() => expect(mockGetSampleReleaseInfo).toHaveBeenCalledWith('LOT-002'));
  });

  it('maps the info response and enables execution only for WAIT-compatible lots', async () => {
    const screen = useSampleRelease();

    await screen.searchData('LOT-001');

    expect(screen.txtSampleLotname.value).toBe('SLOT-001');
    expect(screen.txtMainLotname.value).toBe('MLOT-001');
    expect(screen.txtMainState.value).toBe('WAIT');
    expect(screen.isExecutionEnabled.value).toBe(true);
  });

  it('keeps execution disabled when route, operation, or state does not match', async () => {
    const screen = useSampleRelease();
    mockGetSampleReleaseInfo.mockResolvedValue({
      isSuccessFul: true,
      result: { ITEMS: [{ ...item, MOPER: '9999', MPROCESSSTATE: 'RUN' }] },
    });

    await screen.searchData('LOT-MISMATCH');

    expect(screen.isExecutionEnabled.value).toBe(false);
  });

  it('keeps Execute enabled for an empty Main LotName so execution can show its validation', async () => {
    const screen = useSampleRelease();
    mockGetSampleReleaseInfo.mockResolvedValue({
      isSuccessFul: true,
      result: { ITEMS: [{ ...item, MLOTNAME: '' }] },
    });

    await screen.searchData('LOT-EMPTYMAIN');

    expect(screen.isExecutionEnabled.value).toBe(true);
    screen.execution();
    expect(screen.dialogMessage.value).toBe('Main LotName이 확인되지 않습니다..');
    expect(mockExecuteSampleRelease).not.toHaveBeenCalled();
  });

  it('shows barcode validation and clears the data after an invalid barcode', async () => {
    const screen = useSampleRelease();
    screen.txtMainLotname.value = 'stale';

    screen.editLotNo.value = 'INVALID';
    screen.onLotNoEnter();
    expect(screen.txtMainLotname.value).toBe('');
    expect(mockGetSampleReleaseInfo).not.toHaveBeenCalled();

    await screen.searchData('   ');
    expect(screen.dialogMessage.value).toBe('LOT ID을 입력하세요');
  });

  it('normalizes lowercase LOT values before a button search', async () => {
    const screen = useSampleRelease();

    await screen.searchData('lot-001');

    expect(mockGetSampleReleaseInfo).toHaveBeenCalledWith('LOT-001');
    expect(screen.editLotNo.value).toBe('');
  });

  it('uppercases LOT input immediately', () => {
    const screen = useSampleRelease();

    screen.onLotNoInput('lot-001');

    expect(screen.editLotNo.value).toBe('LOT-001');
  });

  it('parses a valid scanner barcode and searches the parsed LOT', async () => {
    const screen = useSampleRelease();
    screen.editLotNo.value = ' $LOT-001*';

    screen.onLotNoEnter();

    await vi.waitFor(() => expect(mockGetSampleReleaseInfo).toHaveBeenCalledWith('LOT-001'));
    expect(screen.editLotNo.value).toBe('');
  });

  it('clears the LOT input when a blank manual value is committed', () => {
    const screen = useSampleRelease();
    screen.editLotNo.value = '';

    screen.onLotNoEnter();

    expect(screen.editLotNo.value).toBe('');
    expect(mockGetSampleReleaseInfo).not.toHaveBeenCalled();
  });

  it('validates missing lot names before execution and vibrates when supported', () => {
    const vibrate = vi.fn();
    Object.defineProperty(navigator, 'vibrate', { configurable: true, value: vibrate });
    const screen = useSampleRelease();

    screen.execution();

    expect(screen.dialogMessage.value).toBe('Sample LotName이 확인되지 않습니다..');
    expect(vibrate).toHaveBeenCalled();
    expect(mockExecuteSampleRelease).not.toHaveBeenCalled();
  });

  it('executes successfully and clears the screen state', async () => {
    const screen = useSampleRelease();
    await screen.searchData('LOT-001');
    screen.txtMainComment.value = 'release';

    screen.execution();
    await vi.waitFor(() => expect(mockExecuteSampleRelease).toHaveBeenCalledOnce());
    await vi.waitFor(() => expect(screen.dialogMessage.value).toBe('success'));

    expect(screen.editLotNo.value).toBe('');
    expect(screen.txtSampleLotname.value).toBe('');
    expect(screen.isExecutionEnabled.value).toBe(false);
    expect(mockExecuteSampleRelease).toHaveBeenCalledWith(
      expect.objectContaining({
        facility: 'FAB1',
        userId: 'OP-01',
        sampleLot: 'SLOT-001',
        mainLotName: 'MLOT-001',
        comment: 'release',
      }),
    );
  });

  it('shows the Main Lot validation when the sample lot exists but main lot is missing', () => {
    const screen = useSampleRelease();
    screen.txtSampleLotname.value = 'SLOT-001';

    screen.execution();

    expect(screen.dialogMessage.value).toBe('Main LotName이 확인되지 않습니다..');
    expect(mockExecuteSampleRelease).not.toHaveBeenCalled();
  });

  it('handles execution API errors and request exceptions', async () => {
    const screen = useSampleRelease();
    await screen.searchData('LOT-001');
    mockExecuteSampleRelease.mockResolvedValueOnce({
      isSuccessFul: false,
      result: {},
      errorMessage: 'execution failed',
    });

    screen.execution();
    await vi.waitFor(() => expect(screen.dialogMessage.value).toBe('execution failed'));

    mockExecuteSampleRelease.mockRejectedValueOnce(new Error('network'));
    screen.txtSampleLotname.value = 'SLOT-001';
    screen.txtMainLotname.value = 'MLOT-001';
    screen.execution();
    await vi.waitFor(() =>
      expect(screen.dialogMessage.value).toBe('서버 통신 중 오류가 발생하였습니다.'),
    );
  });

  it('uses fallback success and error messages when the service omits message text', async () => {
    const screen = useSampleRelease();
    await screen.searchData('LOT-001');
    mockExecuteSampleRelease.mockResolvedValueOnce({ isSuccessFul: true, result: {} });

    screen.execution();
    await vi.waitFor(() => expect(screen.dialogMessage.value).toBe('정상적으로 처리되었습니다.'));

    mockGetSampleReleaseInfo.mockResolvedValueOnce({
      isSuccessFul: false,
      result: { ITEMS: [] },
    });
    await screen.searchData('LOT-NO-MESSAGE');
    expect(screen.dialogMessage.value).toBe('LOT ID 조회 실패하였습니다.');
  });

  it('shows API errors and does not enable execution', async () => {
    const screen = useSampleRelease();
    mockGetSampleReleaseInfo.mockResolvedValue({
      isSuccessFul: false,
      result: { ITEMS: [] },
      errorMessage: 'lookup failed',
    });

    await screen.searchData('LOT-ERROR');

    expect(screen.dialogMessage.value).toBe('lookup failed');
    expect(screen.isExecutionEnabled.value).toBe(false);
  });

  it('clears optional fields when the response contains an empty item', async () => {
    const screen = useSampleRelease();
    mockGetSampleReleaseInfo.mockResolvedValueOnce({
      isSuccessFul: true,
      result: { ITEMS: [{}] },
    });

    await screen.searchData('LOT-EMPTY');

    expect(screen.txtReleaseProduct.value).toBe('');
    expect(screen.txtSampleLotname.value).toBe('');
    expect(screen.txtMainState.value).toBe('');
    expect(screen.isExecutionEnabled.value).toBe(false);
  });
});
