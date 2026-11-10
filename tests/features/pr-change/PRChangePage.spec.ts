import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { BaseButton, BaseInput, BaseModal, BaseRadioGroup } from 'src/components/base';
import OkDialog from 'src/components/OkDialog.vue';
import { useMainStore } from 'src/features/main/stores/main.store';
import PRChangePage from 'src/features/pr-change/pages/PRChangePage.vue';
import { prChangeService } from 'src/features/pr-change/services/pr-change.service';
import type { PrChangeServiceResult } from 'src/features/pr-change/types/pr-change.types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComponentPublicInstance } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';

vi.mock('src/features/pr-change/services/pr-change.service', () => ({
  prChangeService: {
    pumpStatus: vi.fn(),
    currentPrInfo: vi.fn(),
    prInfo: vi.fn(),
    comparePrInfo: vi.fn(),
    prChange: vi.fn(),
  },
}));

// 25 / 28 character PR barcodes: PRID(4) VISCOSITY(4) filler(6) LOT(5) [SUB(3)] VALIDATE(6)
const PR_25 = '1001' + '0450' + 'ABCDEF' + 'LT123' + '261231';
const PR_28 = '1003' + '0500' + 'ABCDEF' + 'LT456' + '789' + '271231';
const IN_DATE = '202610270900';

function success(messageBody: Record<string, string> = {}): PrChangeServiceResult {
  return { isSuccessFul: true, messageBody, errorMessage: '' };
}

function failure(errorMessage: string): PrChangeServiceResult {
  return { isSuccessFul: false, messageBody: {}, errorMessage };
}

const PUMP_WITH_HISTORY = {
  EQPID: 'EQP-PUMP-01',
  PUMPNAME: 'PUMP-001',
  PRID: '1001',
  PRCOMP: 'TOK',
  PRDESC: 'TOK-PR-1001',
  FLAG: '1',
};
const PUMP_WITHOUT_HISTORY = { ...PUMP_WITH_HISTORY, FLAG: '0' };
const NEW_PR = { PRID: '1003', PRCOMP: 'SHIN-ETSU', PRDESC: 'SE-PR-1003', TIME: '20261027090000' };

/** Props are asserted by name, so the wrapper is typed with a loose props record. */
type ComponentWrapper = VueWrapper<ComponentPublicInstance<Record<string, unknown>>>;

describe('PRChangePage', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    document.body.innerHTML = '';
    const store = useMainStore();
    store.operatorId = 'OP1';
    store.operatorName = 'Operator';
    vi.mocked(prChangeService.pumpStatus).mockResolvedValue(success(PUMP_WITH_HISTORY));
    vi.mocked(prChangeService.currentPrInfo).mockResolvedValue(success({ PRID: '1001' }));
    vi.mocked(prChangeService.prInfo).mockResolvedValue(success(NEW_PR));
    vi.mocked(prChangeService.comparePrInfo).mockResolvedValue(success({ PRID: '1001' }));
    vi.mocked(prChangeService.prChange).mockResolvedValue(success());
  });

  async function setup() {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/pr-change', component: PRChangePage },
        { path: '/', component: { template: '<div>Home</div>' } },
      ],
    });
    await router.push('/pr-change');
    await router.isReady();
    const back = vi.spyOn(router, 'back').mockImplementation(() => undefined);
    const wrapper = mount(PRChangePage, { attachTo: document.body, global: { plugins: [router] } });
    await flushPromises();
    return { wrapper, back };
  }

  function field(wrapper: VueWrapper, label: string): ComponentWrapper {
    const component = wrapper
      .findAllComponents(BaseInput)
      .find((candidate) => candidate.props('label') === label);
    if (!component) throw new Error(`Missing field ${label}`);
    return component as unknown as ComponentWrapper;
  }

  function readOnlyValues(wrapper: VueWrapper): Record<string, string> {
    return Object.fromEntries(
      wrapper
        .findAllComponents(BaseInput)
        .filter((candidate) => candidate.props('readonly'))
        .map((candidate) => [
          candidate.props('label') as string,
          (candidate.get('input').element as HTMLInputElement).value,
        ]),
    );
  }

  async function enter(wrapper: VueWrapper, label: string, value: string) {
    const input = field(wrapper, label).get('input');
    await input.setValue(value);
    await input.trigger('keydown.enter');
    await flushPromises();
  }

  function actionButton(wrapper: VueWrapper, text: string): ComponentWrapper {
    const button = wrapper
      .findAllComponents(BaseButton)
      .find((candidate) => candidate.text() === text);
    if (!button) throw new Error(`Missing button ${text}`);
    return button as unknown as ComponentWrapper;
  }

  const okDialog = (wrapper: VueWrapper) => wrapper.findComponent(OkDialog);
  const confirmModal = (wrapper: VueWrapper) => {
    const modal = wrapper
      .findAllComponents(BaseModal)
      .find((candidate) => candidate.vm.$attrs.class === 'pr-change__confirm');
    if (!modal) throw new Error('Missing LEAK confirmation modal');
    return modal;
  };

  it('shows the legacy title, labels and initial state', async () => {
    const { wrapper } = await setup();

    expect(wrapper.get('h1').text()).toBe('PR 교체');
    const labels = wrapper.findAllComponents(BaseInput).map((input) => input.props('label'));
    expect(labels).toEqual([
      'PUMP ID',
      'PUMP',
      '제품명',
      '제조사',
      'PR ID',
      '현재 PR',
      '교체 PR',
      'PR ID',
      '제조사',
      '제품명',
      '점도',
      '유효기간',
      'LotNo',
      '상온입고',
      'OUT_PR',
      '사번',
    ]);
    // Legacy layout sets no android:hint, so no field shows a placeholder.
    expect(wrapper.findAll('input[placeholder]:not([placeholder=""])')).toHaveLength(0);
    expect(wrapper.findComponent(BaseRadioGroup).props('label')).toBe('LEAK');
    expect(wrapper.findComponent(BaseRadioGroup).props('options')).toEqual([
      { label: 'Y', value: 'Y' },
      { label: 'N', value: 'N' },
    ]);
    expect(wrapper.findComponent(BaseRadioGroup).props('modelValue')).toBe('N');
    expect(actionButton(wrapper, '조회').classes()).toContain('pr-change__search-button');
    expect(actionButton(wrapper, '교체').props('disabled')).toBe(true);
    expect(actionButton(wrapper, '취소').props('disabled')).toBe(false);
    expect(actionButton(wrapper, '교체').props('size')).toBe('medium');
    expect(actionButton(wrapper, '취소').props('size')).toBe('medium');
    expect(okDialog(wrapper).props('open')).toBe(false);
    expect(confirmModal(wrapper).props('open')).toBe(false);
    wrapper.unmount();
  });

  it('focuses PUMP ID when the screen opens like the legacy requestFocus', async () => {
    const { wrapper } = await setup();

    expect(document.activeElement).toBe(field(wrapper, 'PUMP ID').get('input').element);
    wrapper.unmount();
  });

  it('looks up the pump with the search button and fills the master card', async () => {
    const { wrapper } = await setup();

    await field(wrapper, 'PUMP ID').get('input').setValue('pump-001');
    await actionButton(wrapper, '조회').trigger('click');
    await flushPromises();

    expect(prChangeService.pumpStatus).toHaveBeenCalledWith({ pumpId: 'PUMP-001' });
    expect(readOnlyValues(wrapper)).toMatchObject({
      PUMP: 'PUMP-001',
      제품명: '',
    });
    const values = wrapper
      .findAllComponents(BaseInput)
      .slice(1, 5)
      .map((input) => (input.get('input').element as HTMLInputElement).value);
    expect(values).toEqual(['PUMP-001', 'TOK-PR-1001', 'TOK', '1001']);
    expect(field(wrapper, '현재 PR').props('disabled')).toBe(false);
    expect(document.activeElement).toBe(field(wrapper, '현재 PR').get('input').element);
    wrapper.unmount();
  });

  it('strips the scanner characters from the PUMP ID barcode on enter', async () => {
    const { wrapper } = await setup();

    await enter(wrapper, 'PUMP ID', '$pump-001#');

    expect(prChangeService.pumpStatus).toHaveBeenCalledWith({ pumpId: 'PUMP-001' });
    wrapper.unmount();
  });

  it('shows READING ERROR and clears PUMP ID when the barcode is too short', async () => {
    const { wrapper } = await setup();

    await enter(wrapper, 'PUMP ID', 'ab');

    expect(prChangeService.pumpStatus).not.toHaveBeenCalled();
    expect(okDialog(wrapper).props()).toMatchObject({
      open: true,
      title: 'READING ERROR',
      message: '조회하실 PUMP를 읽어주세요.',
    });
    expect(okDialog(wrapper).vm.$attrs['aria-label']).toBe('READING ERROR');
    expect((field(wrapper, 'PUMP ID').get('input').element as HTMLInputElement).value).toBe('');
    wrapper.unmount();
  });

  it('clears PUMP ID and shows the server error when the pump lookup fails', async () => {
    vi.mocked(prChangeService.pumpStatus).mockResolvedValue(failure('등록되지 않은 PUMP 입니다.'));
    const { wrapper } = await setup();

    await field(wrapper, 'PUMP ID').get('input').setValue('NOPE');
    await actionButton(wrapper, '조회').trigger('click');
    await flushPromises();

    expect(okDialog(wrapper).props()).toMatchObject({
      open: true,
      title: '에  러',
      message: '등록되지 않은 PUMP 입니다.',
    });
    expect((field(wrapper, 'PUMP ID').get('input').element as HTMLInputElement).value).toBe('');
    okDialog(wrapper).vm.$emit('update:open', false);
    await flushPromises();
    expect(okDialog(wrapper).props('open')).toBe(false);
    wrapper.unmount();
  });

  it('disables the history fields and allows the new PR directly when the pump has no history', async () => {
    vi.mocked(prChangeService.pumpStatus).mockResolvedValue(success(PUMP_WITHOUT_HISTORY));
    const { wrapper } = await setup();

    await enter(wrapper, 'PUMP ID', '$pump-001#');

    const currentPr = field(wrapper, '현재 PR');
    expect((currentPr.get('input').element as HTMLInputElement).value).toBe('이전 사용 이력 없음');
    expect(currentPr.props('disabled')).toBe(true);
    expect(field(wrapper, '상온입고').props('disabled')).toBe(true);
    expect(field(wrapper, 'OUT_PR').props('disabled')).toBe(true);
    expect(field(wrapper, '사번').props('disabled')).toBe(true);
    expect(document.activeElement).toBe(field(wrapper, '교체 PR').get('input').element);

    await enter(wrapper, '교체 PR', PR_28);

    expect(prChangeService.prInfo).toHaveBeenCalledWith({
      eqpId: 'EQP-PUMP-01',
      pumpName: 'PUMP-001',
      prId: '1003',
      prLot: '0500',
      viscosity: 'LT456-789',
      validate: '271231',
    });
    expect(actionButton(wrapper, '교체').props('disabled')).toBe(false);
    expect(readOnlyValues(wrapper)).toMatchObject({
      제품명: 'SE-PR-1003',
      점도: '1003',
      유효기간: '271231',
      LotNo: 'LT456-789',
    });
    wrapper.unmount();
  });

  it('requires the current PR to be looked up before the replacement PR', async () => {
    const { wrapper } = await setup();

    await enter(wrapper, '교체 PR', PR_28);

    expect(prChangeService.prInfo).not.toHaveBeenCalled();
    expect(okDialog(wrapper).props()).toMatchObject({
      open: true,
      title: '에  러',
      message: '현재 PR을 먼저 조회하시기 바랍니다.',
    });
    expect((field(wrapper, '교체 PR').get('input').element as HTMLInputElement).value).toBe('');
    wrapper.unmount();
  });

  it('requires the pump to be looked up before the current PR', async () => {
    const { wrapper } = await setup();

    await enter(wrapper, '현재 PR', PR_25);

    expect(prChangeService.currentPrInfo).not.toHaveBeenCalled();
    expect(okDialog(wrapper).props('message')).toBe('PUMP를 먼저 조회하시기 바랍니다.');
    expect(document.activeElement).toBe(field(wrapper, 'PUMP ID').get('input').element);
    wrapper.unmount();
  });

  it.each([
    ['현재 PR', '조회하실 PUMP'],
    ['교체 PR', ''],
    ['OUT_PR', ''],
  ])('rejects a %s barcode with an invalid length', async (label) => {
    const { wrapper } = await setup();
    await enter(wrapper, 'PUMP ID', '$pump-001#');

    await enter(wrapper, label, 'too-short');

    expect(okDialog(wrapper).props()).toMatchObject({
      open: true,
      title: 'READING ERROR',
      message: 'BARCODE형식이 일치하지 않습니다. PR병의 BARCODE를 다시 읽어주세요.',
    });
    expect((field(wrapper, label).get('input').element as HTMLInputElement).value).toBe('');
    wrapper.unmount();
  });

  it('rejects an invalid 상온입고 date length', async () => {
    const { wrapper } = await setup();

    await enter(wrapper, '상온입고', '2026');

    expect(okDialog(wrapper).props()).toMatchObject({
      open: true,
      title: 'READING ERROR',
      message: '날짜형식이 일치하지 않습니다. 상온입고 BARCODE를 다시 읽어주세요.',
    });
    expect((field(wrapper, '상온입고').get('input').element as HTMLInputElement).value).toBe('');
    wrapper.unmount();
  });

  it('keeps the current PR state failed when the server rejects it', async () => {
    vi.mocked(prChangeService.currentPrInfo).mockResolvedValue(
      failure('현재 사용중인 PR과 일치하지 않습니다.'),
    );
    const { wrapper } = await setup();
    await enter(wrapper, 'PUMP ID', '$pump-001#');

    await enter(wrapper, '현재 PR', PR_25);

    expect(okDialog(wrapper).props('message')).toBe('현재 사용중인 PR과 일치하지 않습니다.');
    expect((field(wrapper, '현재 PR').get('input').element as HTMLInputElement).value).toBe('');
    okDialog(wrapper).vm.$emit('update:open', false);
    await enter(wrapper, '교체 PR', PR_28);
    expect(prChangeService.prInfo).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('shows the receive failure message when the server returns an empty PRID', async () => {
    vi.mocked(prChangeService.currentPrInfo).mockResolvedValue(success({ PRID: '' }));
    const { wrapper } = await setup();
    await enter(wrapper, 'PUMP ID', '$pump-001#');

    await enter(wrapper, '현재 PR', PR_25);

    expect(okDialog(wrapper).props('message')).toBe(
      'MSG 수신에 실패하였습니다.\n잠시후 시도해 주시기 바랍니다.',
    );
    wrapper.unmount();
  });

  async function runHistoryFlow(wrapper: VueWrapper) {
    await enter(wrapper, 'PUMP ID', '$pump-001#');
    await enter(wrapper, '현재 PR', PR_25);
    await enter(wrapper, '교체 PR', PR_28);
    await field(wrapper, '사번').get('input').setValue('OP9');
    await enter(wrapper, '상온입고', IN_DATE);
    expect(document.activeElement).toBe(field(wrapper, 'OUT_PR').get('input').element);
    expect(actionButton(wrapper, '교체').props('disabled')).toBe(true);
    await enter(wrapper, 'OUT_PR', PR_25);
  }

  it('follows the full history flow and replaces after the LEAK confirmation', async () => {
    const { wrapper } = await setup();

    await runHistoryFlow(wrapper);

    expect(prChangeService.currentPrInfo).toHaveBeenCalledWith({
      eqpId: 'EQP-PUMP-01',
      pumpName: 'PUMP-001',
      prId: '1001',
      prLot: 'LT123',
      viscosity: '0450',
    });
    expect(prChangeService.comparePrInfo).toHaveBeenCalledWith({
      eqpId: 'EQP-PUMP-01',
      pumpName: 'PUMP-001',
      prId: '1001',
      prLot: 'LT123',
      viscosity: '0450',
      time: '20261027090000',
      banJangId: 'OP9',
    });
    expect(actionButton(wrapper, '교체').props('disabled')).toBe(false);

    await actionButton(wrapper, '교체').trigger('click');
    await flushPromises();

    expect(confirmModal(wrapper).props('open')).toBe(true);
    expect(confirmModal(wrapper).props('title')).toBe('알  림');
    expect(confirmModal(wrapper).vm.$attrs['aria-label']).toBe('알  림');
    expect(document.body.textContent).toContain('PR LEAK 이상이 없습니다. 계속 진행하시겠습니까?');
    expect(prChangeService.prChange).not.toHaveBeenCalled();

    await actionButton(wrapper, '예').trigger('click');
    await flushPromises();

    expect(prChangeService.prChange).toHaveBeenCalledWith({
      eqpId: 'EQP-PUMP-01',
      pumpName: 'PUMP-001',
      prId: '1003',
      prDesc: 'SE-PR-1003',
      prComp: 'SHIN-ETSU',
      viscosity: '1003',
      prLot: 'LT456-789',
      validateTime: '271231',
      userId: 'OP1',
      userName: 'Operator',
      leak: 'false',
      inDate: IN_DATE,
    });
    expect(okDialog(wrapper).props()).toMatchObject({
      open: true,
      title: '확  인',
      message: '교체되었습니다.',
    });
    for (const label of ['PUMP ID', '현재 PR', '교체 PR', '상온입고', 'OUT_PR', '사번']) {
      expect((field(wrapper, label).get('input').element as HTMLInputElement).value).toBe('');
    }
    // Legacy clearData() never resets txtProductName (the replacement 제품명), so it stays filled.
    const readOnly = wrapper
      .findAllComponents(BaseInput)
      .filter((candidate) => candidate.props('readonly'))
      .map((candidate) => (candidate.get('input').element as HTMLInputElement).value);
    expect(readOnly.filter((value) => value !== '')).toEqual(['SE-PR-1003']);
    expect(wrapper.findComponent(BaseRadioGroup).props('modelValue')).toBe('N');
    expect(document.activeElement).toBe(field(wrapper, 'PUMP ID').get('input').element);
    wrapper.unmount();
  });

  it('does not send the replacement when the LEAK confirmation is declined', async () => {
    const { wrapper } = await setup();
    await runHistoryFlow(wrapper);

    await actionButton(wrapper, '교체').trigger('click');
    await flushPromises();
    await actionButton(wrapper, '아니오').trigger('click');
    await flushPromises();

    expect(confirmModal(wrapper).props('open')).toBe(false);
    expect(prChangeService.prChange).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('skips the confirmation and sends LEAK=true when LEAK Y is selected', async () => {
    const { wrapper } = await setup();
    await runHistoryFlow(wrapper);

    wrapper.findComponent(BaseRadioGroup).vm.$emit('update:modelValue', 'Y');
    await flushPromises();
    expect(wrapper.findComponent(BaseRadioGroup).props('modelValue')).toBe('Y');
    await actionButton(wrapper, '교체').trigger('click');
    await flushPromises();

    expect(confirmModal(wrapper).props('open')).toBe(false);
    expect(prChangeService.prChange).toHaveBeenCalledWith(
      expect.objectContaining({ leak: 'true' }),
    );

    wrapper.findComponent(BaseRadioGroup).vm.$emit('update:modelValue', 'N');
    await flushPromises();
    expect(wrapper.findComponent(BaseRadioGroup).props('modelValue')).toBe('N');
    wrapper.unmount();
  });

  it('shows the server error and keeps the data when the replacement fails', async () => {
    vi.mocked(prChangeService.prChange).mockResolvedValue(failure('교체에 실패하였습니다.'));
    const { wrapper } = await setup();
    await runHistoryFlow(wrapper);
    wrapper.findComponent(BaseRadioGroup).vm.$emit('update:modelValue', 'Y');
    await flushPromises();

    await actionButton(wrapper, '교체').trigger('click');
    await flushPromises();

    expect(okDialog(wrapper).props()).toMatchObject({
      open: true,
      title: '에  러',
      message: '교체에 실패하였습니다.',
    });
    expect((field(wrapper, '교체 PR').get('input').element as HTMLInputElement).value).toBe(PR_28);
    wrapper.unmount();
  });

  it('clears OUT_PR and shows the error when the compare lookup fails', async () => {
    vi.mocked(prChangeService.comparePrInfo).mockResolvedValue(failure('사번을 입력해 주세요.'));
    const { wrapper } = await setup();

    await runHistoryFlow(wrapper);

    expect(okDialog(wrapper).props('message')).toBe('사번을 입력해 주세요.');
    expect((field(wrapper, 'OUT_PR').get('input').element as HTMLInputElement).value).toBe('');
    expect(actionButton(wrapper, '교체').props('disabled')).toBe(true);
    wrapper.unmount();
  });

  it('shows the receive failure message when compare returns an empty PRID', async () => {
    vi.mocked(prChangeService.comparePrInfo).mockResolvedValue(success({ PRID: '' }));
    const { wrapper } = await setup();

    await runHistoryFlow(wrapper);

    expect(okDialog(wrapper).props('message')).toBe(
      'MSG 수신에 실패하였습니다.\n잠시후 시도해 주시기 바랍니다.',
    );
    expect(actionButton(wrapper, '교체').props('disabled')).toBe(true);
    wrapper.unmount();
  });

  it('clears the replacement PR when the replacement lookup fails', async () => {
    vi.mocked(prChangeService.prInfo).mockResolvedValue(failure('등록되지 않은 PR 입니다.'));
    const { wrapper } = await setup();
    await enter(wrapper, 'PUMP ID', '$pump-001#');
    await enter(wrapper, '현재 PR', PR_25);

    await enter(wrapper, '교체 PR', PR_28);

    expect(okDialog(wrapper).props('message')).toBe('등록되지 않은 PR 입니다.');
    expect((field(wrapper, '교체 PR').get('input').element as HTMLInputElement).value).toBe('');
    wrapper.unmount();
  });

  it('goes back when 취소 is pressed', async () => {
    const { wrapper, back } = await setup();

    await actionButton(wrapper, '취소').trigger('click');

    expect(back).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it('disables the inputs while a request is running', async () => {
    let resolvePump!: (value: PrChangeServiceResult) => void;
    vi.mocked(prChangeService.pumpStatus).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePump = resolve;
        }),
    );
    const { wrapper } = await setup();

    await field(wrapper, 'PUMP ID').get('input').setValue('PUMP-001');
    await actionButton(wrapper, '조회').trigger('click');
    expect(field(wrapper, 'PUMP ID').props('disabled')).toBe(true);
    expect(field(wrapper, '교체 PR').props('disabled')).toBe(true);

    resolvePump(success(PUMP_WITH_HISTORY));
    await flushPromises();
    expect(field(wrapper, 'PUMP ID').props('disabled')).toBe(false);
    wrapper.unmount();
  });
});
