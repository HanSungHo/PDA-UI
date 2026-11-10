import { useTestResultInput } from 'src/features/test-result-input/composables/use-test-result-input';
import { testResultInputService as service } from 'src/features/test-result-input/services/test-result-input.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('src/features/test-result-input/services/test-result-input.service', () => ({
  testResultInputService: {
    inspMaskInfo: vi.fn(),
    inspMaskStatCheck: vi.fn(),
    inspMaskInsert: vi.fn(),
  },
}));
const device = {
  mobileServerName: 'SERVER',
  deviceName: 'PDA',
  operatorId: 'U',
  operatorName: 'N',
};
const info = {
  serialNo: '001234',
  pellicle: 'Y',
  testDay: '2026-10-27',
  fabInDate: '',
  eqpIds: ['EQP01'],
  inspTypes: ['입고 검사'],
  inspResults: ['사용불가'],
  inspType2s: ['VISUAL'],
};
const focus = vi.fn();
function setup() {
  return useTestResultInput({ device, focus });
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(service.inspMaskInfo).mockResolvedValue({ ok: true, data: info });
  vi.mocked(service.inspMaskStatCheck).mockResolvedValue({
    ok: true,
    data: { status: 'READY', maskTag: '' },
  });
  vi.mocked(service.inspMaskInsert).mockResolvedValue({ ok: true, data: undefined });
});
async function loaded() {
  const form = setup();
  form.maskTag.value = 'mask01X';
  await form.getMaskInfo();
  return form;
}
function choose(form: ReturnType<typeof setup>) {
  form.serialNo.value = '001234';
  form.eqpId.value = 'EQP01';
  form.inspType.value = '입고 검사';
  form.inspType2.value = 'VISUAL';
  form.inspResult.value = '사용불가';
  form.holdText.value = 'reason';
}

describe('test result input workflow', () => {
  it('rejects short barcode and removes exactly one final character on lookup', async () => {
    const form = setup();
    form.maskTag.value = 'x';
    await form.getMaskInfo();
    expect(form.dialog.value?.message).toBe('조회하실 MASK TAG를 읽어주세요.');
    expect(service.inspMaskInfo).not.toHaveBeenCalled();
    form.closeDialog();
    form.maskTag.value = 'ab 1X';
    await form.getMaskInfo();
    expect(service.inspMaskInfo).toHaveBeenCalledWith('AB 1', device);
    expect(form.serialNo.value).toBe('00123');
    expect(form.maskLoaded.value).toBe(true);
    expect(form.eqpOptions.value.map((option) => option.value)).toEqual(['ALL', 'EQP01']);
  });

  it.each([
    ['', '', undefined, undefined, undefined, '', 'Serial No를 입력하세요.'],
    [
      'wrong',
      'EQP01',
      '입고 검사',
      'VISUAL',
      '사용불가',
      'reason',
      '올바른 Serial No를 입력하세요.',
    ],
    ['001234', '', undefined, undefined, undefined, '', '검사 장비를 선택하세요.'],
    ['001234', 'EQP01', undefined, undefined, undefined, '', '검사 구분을 선택해주세요'],
    ['001234', 'EQP01', '입고 검사', undefined, undefined, '', '검사 방법을 선택해주세요'],
    ['001234', 'EQP01', '입고 검사', 'VISUAL', undefined, '', '검사 결과를 선택해주세요'],
    ['001234', 'EQP01', '입고 검사', 'VISUAL', '사용불가', '   ', 'Hold 사유를 입력하세요'],
  ])(
    'validates in legacy order: %s / %s / %s / %s / %s',
    async (serial, eqp, type, type2, result, hold, message) => {
      const form = await loaded();
      form.serialNo.value = serial;
      form.eqpId.value = eqp || undefined;
      form.inspType.value = type;
      form.inspType2.value = type2;
      form.inspResult.value = result;
      form.holdText.value = hold;
      await form.submit();
      expect(form.dialog.value?.message).toBe(message);
      expect(service.inspMaskStatCheck).not.toHaveBeenCalled();
    },
  );

  it('blocks non incoming inspection when FABINDATE has only ASCII spaces', async () => {
    const form = await loaded();
    choose(form);
    form.inspType.value = '정기 검사';
    form.holdText.value = '';
    await form.submit();
    expect(form.dialog.value?.message).toContain('입고일이 설정되지 않은 MASK입니다.');
    expect(service.inspMaskStatCheck).not.toHaveBeenCalled();
  });

  it('blocks only the exact legacy RUN condition', async () => {
    const form = await loaded();
    choose(form);
    vi.mocked(service.inspMaskStatCheck).mockResolvedValueOnce({
      ok: true,
      data: { status: 'RUN', maskTag: 'OTHER' },
    });
    await form.submit();
    expect(form.dialog.value?.message).toBe('MASK는 RUN 상태이므로 변경할 수 없습니다');
    expect(service.inspMaskInsert).not.toHaveBeenCalled();
    form.closeDialog();
    vi.mocked(service.inspMaskStatCheck).mockResolvedValueOnce({
      ok: true,
      data: { status: 'RUN', maskTag: 'RUN' },
    });
    await form.submit();
    expect(service.inspMaskInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        reticleSeq: 'MASK01',
        eqpId: 'EQP01',
        inspText: '',
        holdText: 'reason',
        fabInDate: '',
      }),
      device,
    );
    expect(form.maskTag.value).toBe('');
    expect(form.maskLoaded.value).toBe(false);
    expect(focus).toHaveBeenCalledWith('mask');
  });

  it('retains form after insertion FAIL and resets selection when reopened', async () => {
    const form = await loaded();
    choose(form);
    form.resetSelection('eqpId');
    expect(form.eqpId.value).toBeUndefined();
    form.eqpId.value = 'EQP01';
    vi.mocked(service.inspMaskInsert).mockResolvedValueOnce({ ok: false, message: 'server error' });
    await form.submit();
    expect(form.dialog.value?.message).toBe('server error');
    expect(form.eqpId.value).toBe('EQP01');
    expect(form.loading.value).toBe(false);
  });

  it('retains internal serial and fab date after successful reset like Android', async () => {
    const form = await loaded();
    choose(form);
    form.fabInDate.value = '2026-01-01';
    await form.submit();
    expect(form.maskTag.value).toBe('');
    expect(form.serialNo.value).toBe('');
    expect(form.serialNoExpected.value).toBe('001234');
    expect(form.fabInDate.value).toBe('2026-01-01');
  });

  it('focuses MASK TAG before showing the success dialog', async () => {
    let releaseFocus: (() => void) | undefined;
    const form = useTestResultInput({
      device,
      focus: () =>
        new Promise<void>((resolve) => {
          releaseFocus = resolve;
        }),
    });
    form.maskTag.value = 'mask01X';
    await form.getMaskInfo();
    choose(form);
    const submission = form.submit();
    await vi.waitFor(() => expect(releaseFocus).toBeTypeOf('function'));
    expect(form.dialog.value).toBeUndefined();
    releaseFocus?.();
    await submission;
    expect(form.dialog.value?.message).toBe('검사결과 입력완료');
  });
});
