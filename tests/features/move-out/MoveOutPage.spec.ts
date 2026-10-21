import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';

import { DeviceInfo } from '~/constants/deviceinfo';
import { useBatchLotListStore } from '~/features/batch-lot-list/stores/batch-lot-list.store';
import { useBatchMoveOutStore } from '~/features/batch-move-out/stores/batch-move-out.store';
import MoveOutPage from '~/features/move-out/pages/MoveOutPage.vue';
import { moveOutEqpDownService } from '~/features/move-out/services/moveout-eqp-down.service';
import { useMoveOutStore } from '~/features/move-out/stores/move-out.store';
import type { MoveOutLotInfo } from '~/features/move-out/types/move-out.types';

const lot: MoveOutLotInfo = {
  lotId: 'LOT-DEMO-01',
  batchId: 'BAT-ID',
  area: '',
  display: {
    lotNo: 'LOT-DEMO-01',
    batchId: 'BAT-ID',
    recipe: 'RCP-01',
    machine: 'EQP-01',
    maskTag: 'MASK-01',
    product: 'PRODUCT-DEMO(JOB-A)',
    currentOperation: 'CUR(100000)',
    nextOperation: 'NEXT(200000)',
    quantity: '25',
    goodChips: '100',
    commentQty: '1',
  },
  operation: '1000',
  subOperation: '00',
  processStep: 'CUR',
  operSequence: '10',
  opType: 'MVOU',
  processType: '',
  state: 'WIP',
  status: '',
  holdStatus: '',
  remoteCheck: '',
  nwCommentQty: '0',
  pqcSkipUser: 'Y',
  checkSkipWafer: 'Y',
  checkSkipWaferMachine: '',
  checkSkipWaferRecipe: '',
  checkSkipWaferQty: '',
  checkSkipMachineQty: '',
  checkSkipReasonList: '[]',
  createCategory: '',
  lastEventComment: '',
  productQuantity: '',
  owner: '',
  checkEtch: '',
  checkInterlock: '',
  lampComment: '',
  aramComment: '',
  machineState: '',
  machineCode: '',
  holdCodeOut: '',
  holdCommentOut: '',
  etcMsg: '',
  pcmCheck: '',
  thicknessCheck: '',
  mvinWaferCheck: '',
  btaWarning: '',
  childBatchId: '',
  bibuhaDown: 'N',
  chamberList: '[]',
  checkGateInspMsg: '',
  automotiveFlag: '',
  photoOperType: 'VI',
  nextBay: 'BAY-A',
  nextStocker: 'STK-A',
};

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/move-out', component: MoveOutPage },
      { path: '/wafer-select', component: { template: '<div />' } },
      { path: '/batch-move-out', component: { template: '<div />' } },
      { path: '/comment-list', component: { template: '<div />' } },
      { path: '/diff-param', component: { template: '<div />' } },
      { path: '/batch-lot-list', component: { template: '<div />' } },
      { path: '/input-scope-data', component: { template: '<div />' } },
    ],
  });
}

describe('MoveOutPage', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('loads lotId from query route and renders legacy labels', async () => {
    const router = createTestRouter();
    await router.push('/move-out?lotId=LOT-DEMO-01');
    await router.isReady();

    const store = useMoveOutStore();
    const loadSpy = vi.spyOn(store, 'loadLotInfo').mockImplementation(async () => {
      store.lot = lot;
      store.okEnabled = true;
    });

    const wrapper = mount(MoveOutPage, {
      attachTo: document.body,
      global: { plugins: [router] },
    });
    await flushPromises();

    expect(loadSpy).toHaveBeenCalledWith('LOT-DEMO-01');
    expect(wrapper.text()).toContain('MOVE OUT');
    expect(wrapper.text()).toContain('LOT No.');
    expect(wrapper.text()).toContain('입력 SCOPE');
    expect(wrapper.text()).toContain('BAT ID');
    expect(wrapper.text()).toContain('RECIPE');
    expect(wrapper.text()).toContain('장비');
    expect(wrapper.text()).toContain('MASK TAG');
    expect(wrapper.text()).toContain('COMMENT');
    expect(wrapper.text()).toContain('MASK LOGO');
    expect(wrapper.text()).toContain('반송');
    expect(wrapper.text()).toContain('제품명');
    expect(wrapper.text()).toContain('현재공정');
    expect(wrapper.text()).toContain('다음공정');
    expect(wrapper.text()).toContain('수량');
    expect(wrapper.text()).toContain('Good Chips');
    expect(wrapper.text()).toContain('다음공정 SKIP');
    expect(wrapper.text()).toContain('W/F Interlock해제');
    expect(wrapper.text()).toContain('계측 PARA');
    expect(wrapper.text()).toContain('확인');
    expect(wrapper.text()).toContain('W/H');
    expect(wrapper.text()).toContain('취소');

    wrapper.unmount();
  });

  it('ignores uppercase LOTID query route', async () => {
    const router = createTestRouter();
    await router.push('/move-out?LOTID=LOT-DEMO-01');
    await router.isReady();

    const store = useMoveOutStore();
    const loadSpy = vi.spyOn(store, 'loadLotInfo');

    const wrapper = mount(MoveOutPage, {
      attachTo: document.body,
      global: { plugins: [router] },
    });
    await flushPromises();

    expect(loadSpy).not.toHaveBeenCalled();

    wrapper.unmount();
  });

  it('keeps the Product Info card aligned with the Move Out design contract', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/features/move-out/pages/MoveOutPage.vue'),
      'utf8',
    );

    expect(source).toContain('.move-out-card--main');
    expect(source).not.toContain('max-width: 326px');
    expect(source).toContain('min-height: 900px');
  });

  it('keeps lot and batch values readonly with the LOT label on the input', async () => {
    const router = createTestRouter();
    await router.push('/move-out');
    await router.isReady();
    const wrapper = mount(MoveOutPage, {
      attachTo: document.body,
      global: { plugins: [router] },
    });

    const inputs = wrapper.findAll('.move-out-lot-grid input');
    expect(inputs).toHaveLength(2);
    expect(inputs.every((input) => (input.element as HTMLInputElement).readOnly)).toBe(true);
    expect(wrapper.get('.move-out-lot-grid label').text()).toBe('LOT No.');

    wrapper.unmount();
  });

  it('keeps disabled lot action buttons on the shared BaseButton disabled visual state', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/features/move-out/pages/MoveOutPage.vue'),
      'utf8',
    );

    expect(source).toContain('.move-out-lot-grid :deep(.ds-btn) {');
    expect(source).toContain('.move-out-lot-grid :deep(.ds-btn:not(.ds-btn--disabled))');
  });

  it('does not use direct Ant Design, back icon, or modal primitives', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/features/move-out/pages/MoveOutPage.vue'),
      'utf8',
    );

    expect(source).not.toContain('@ant-design/icons-vue');
    expect(source).not.toContain('QIcon');
    expect(source).not.toContain('sym_o_arrow_back');
    expect(source).not.toContain('move-out-page__back');
    expect(source).not.toContain('<a-modal');
    expect(source).toContain('BaseModal');
    expect(source).toContain('justify-content: center');
  });

  it('navigates to diff parameter and comment list with Move Out context', async () => {
    const router = createTestRouter();
    await router.push('/move-out');
    await router.isReady();
    const pushSpy = vi.spyOn(router, 'push');

    const store = useMoveOutStore();
    store.lot = lot;
    store.okEnabled = true;

    const wrapper = mount(MoveOutPage, {
      global: { plugins: [router] },
    });

    await wrapper.get('[data-testid="move-out-para"]').trigger('click');
    expect(pushSpy).toHaveBeenLastCalledWith({
      path: '/diff-param',
      query: { lotId: 'LOT-DEMO-01' },
    });

    await wrapper.get('[data-testid="move-out-read"]').trigger('click');
    expect(pushSpy).toHaveBeenLastCalledWith({
      path: '/comment-list',
      query: {
        lotId: 'LOT-DEMO-01',
        operation: '1000',
        subOperation: '00',
        processStep: 'CUR',
        operSequence: '10',
      },
    });

    wrapper.unmount();
  });

  it('opens input scope data with normalized lotId query', async () => {
    const router = createTestRouter();
    await router.push('/move-out');
    await router.isReady();
    const pushSpy = vi.spyOn(router, 'push');

    const store = useMoveOutStore();
    store.lot = lot;
    store.okEnabled = true;

    const wrapper = mount(MoveOutPage, {
      global: { plugins: [router] },
    });

    await wrapper.get('[data-testid="move-out-input-scope"]').trigger('click');

    expect(pushSpy).toHaveBeenLastCalledWith({
      path: '/input-scope-data',
      query: { lotId: 'LOT-DEMO-01' },
    });

    wrapper.unmount();
  });

  it('applies pending input scope result after returning from input scope page', async () => {
    const router = createTestRouter();
    await router.push('/move-out?lotId=LOT-DEMO-01');
    await router.isReady();

    const store = useMoveOutStore();
    store.setPendingInputScopeResult({
      lotId: 'LOT-DEMO-01',
      waferList: '04,05',
      logo: 'SCOPE_LOGO',
    });
    const loadSpy = vi.spyOn(store, 'loadLotInfo').mockImplementation(async () => {
      store.lot = lot;
      store.okEnabled = true;
    });

    const wrapper = mount(MoveOutPage, {
      global: { plugins: [router] },
    });
    await flushPromises();

    expect(loadSpy).toHaveBeenCalledWith('LOT-DEMO-01');
    expect(store.form.comment).toBe('; W/H:#04,05');
    expect(store.form.maskLogo).toBe('SCOPE_LOGO');
    expect(store.consumePendingInputScopeResult()).toBeUndefined();

    wrapper.unmount();
  });

  it('loads the selected batch lot result instead of the original route lot', async () => {
    const router = createTestRouter();
    await router.push('/move-out?lotId=LOT-DEMO-01');
    await router.isReady();

    const batchLotListStore = useBatchLotListStore();
    batchLotListStore.complete({ lotId: 'LOT-BATCH-02' });

    const store = useMoveOutStore();
    const loadSpy = vi.spyOn(store, 'loadLotInfo').mockImplementation(async (lotId: string) => {
      store.lot = { ...lot, lotId, display: { ...lot.display, lotNo: lotId } };
      store.okEnabled = true;
    });

    const wrapper = mount(MoveOutPage, {
      global: { plugins: [router] },
    });
    await flushPromises();

    expect(loadSpy).toHaveBeenCalledTimes(1);
    expect(loadSpy).toHaveBeenCalledWith('LOT-BATCH-02');
    expect(batchLotListStore.result).toBeUndefined();

    wrapper.unmount();
  });

  it('disables OK when child batch confirmation is cancelled', async () => {
    const router = createTestRouter();
    await router.push('/move-out?lotId=LOT-DEMO-01');
    await router.isReady();

    const store = useMoveOutStore();
    vi.spyOn(store, 'loadLotInfo').mockImplementation(async () => {
      store.lot = { ...lot, childBatchId: 'CHILD-BATCH-01' };
      store.okEnabled = true;
      store.messages = [
        {
          kind: 'confirm',
          title: '확  인',
          message: ' 자 Batch 구성 Lot 입니다.\n 자 Batch Wafer 분리 하셨나요? ',
        },
      ];
    });
    const executeSpy = vi.spyOn(store, 'executeOk');

    const wrapper = mount(MoveOutPage, {
      attachTo: document.body,
      global: { plugins: [router] },
    });
    await flushPromises();

    expect(document.body.textContent).toContain('자 Batch 구성 Lot 입니다.');

    document.body
      .querySelector<HTMLButtonElement>('[data-testid="move-out-dialog-cancel"]')
      ?.click();
    await flushPromises();

    expect(store.okEnabled).toBe(false);
    await wrapper.get('form').trigger('submit');
    expect(executeSpy).not.toHaveBeenCalled();

    wrapper.unmount();
  });

  it('routes to batch move out when OK flow returns batch branch', async () => {
    const router = createTestRouter();
    await router.push('/move-out');
    await router.isReady();
    const pushSpy = vi.spyOn(router, 'push');
    const store = useMoveOutStore();
    store.lot = lot;
    store.okEnabled = true;
    const executeSpy = vi.spyOn(store, 'executeOk').mockResolvedValue({ branch: 'batch' });

    const wrapper = mount(MoveOutPage, {
      global: { plugins: [router] },
    });

    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(executeSpy).toHaveBeenCalled();
    expect(pushSpy).toHaveBeenCalledWith({
      path: '/batch-move-out',
      query: {
        batchId: 'BAT-ID',
        lotId: 'LOT-DEMO-01',
        eqpId: 'EQP-01',
        recipe: 'RCP-01',
        comment: '',
        transport: 'N',
        facility: 'FACILITY',
      },
    });

    wrapper.unmount();
  });

  it('passes DeviceInfo context to EQP down dialog before continuing OK flow', async () => {
    const router = createTestRouter();
    await router.push('/move-out');
    await router.isReady();

    const store = useMoveOutStore();
    store.lot = {
      ...lot,
      bibuhaDown: 'Y',
      chamberList: JSON.stringify([{ CH: 'CH-1', MESSTATE: 'RUN' }]),
    };
    store.okEnabled = true;
    const downSpy = vi.spyOn(moveOutEqpDownService, 'changeEqpStatus').mockResolvedValueOnce({
      success: true,
      message: 'OK',
    });
    const executeSpy = vi.spyOn(store, 'executeOk').mockResolvedValue({ branch: 'batch' });

    const wrapper = mount(MoveOutPage, {
      attachTo: document.body,
      global: { plugins: [router] },
    });

    await wrapper.get('form').trigger('submit');
    await flushPromises();

    document.body.querySelector<HTMLButtonElement>('.moveout-eqp-down-btn--ok')?.click();
    await flushPromises();

    expect(downSpy).toHaveBeenCalledWith({
      machine: 'EQP-01',
      facility: DeviceInfo.FACILITY,
      chamberList: ['CH-1'],
      mainFlag: 'Y',
      operatorId: DeviceInfo.OPERATOR_ID,
      operatorName: DeviceInfo.OPERATOR_NAME,
    });
    expect(executeSpy).toHaveBeenCalled();

    wrapper.unmount();
  });

  it('finishes move out when returning from a successful batch move out route result', async () => {
    const router = createTestRouter();
    await router.push('/move-out?lotId=LOT-DEMO-01');
    await router.isReady();
    const backSpy = vi.spyOn(router, 'back').mockImplementation(() => undefined);

    useBatchMoveOutStore().complete({ ok: true });
    const store = useMoveOutStore();
    const loadSpy = vi.spyOn(store, 'loadLotInfo');

    const wrapper = mount(MoveOutPage, {
      global: { plugins: [router] },
    });
    await flushPromises();

    expect(loadSpy).not.toHaveBeenCalled();
    expect(useBatchMoveOutStore().result).toBeUndefined();
    expect(window.history.state.moveOutResult).toEqual({
      LOTID: 'LOT-DEMO-01',
      resultCode: 'OK',
    });
    expect(backSpy).toHaveBeenCalledTimes(1);

    wrapper.unmount();
  });

  it('passes LOTID to native bridge when finishing from a successful batch move out result', async () => {
    const router = createTestRouter();
    await router.push('/move-out?lotId=LOT-DEMO-01');
    await router.isReady();
    const backSpy = vi.spyOn(router, 'back').mockImplementation(() => undefined);
    const finishWithResult = vi.fn();
    vi.stubGlobal('Android', { finishWithResult });

    useBatchMoveOutStore().complete({ ok: true });

    const wrapper = mount(MoveOutPage, {
      global: { plugins: [router] },
    });
    await flushPromises();

    expect(finishWithResult).toHaveBeenCalledWith(
      JSON.stringify({ LOTID: 'LOT-DEMO-01', resultCode: 'OK' }),
    );
    expect(backSpy).not.toHaveBeenCalled();

    wrapper.unmount();
    vi.unstubAllGlobals();
  });

  it('finishes single move out only after queued dialogs are acknowledged', async () => {
    const router = createTestRouter();
    await router.push('/move-out');
    await router.isReady();
    const backSpy = vi.spyOn(router, 'back').mockImplementation(() => undefined);

    const store = useMoveOutStore();
    store.lot = { ...lot, batchId: '', display: { ...lot.display, batchId: '' } };
    store.okEnabled = true;
    vi.spyOn(store, 'executeOk').mockImplementation(async () => {
      store.messages = [{ kind: 'info', title: '확  인', message: 'FQC sample message' }];
      return { branch: 'single' };
    });

    const wrapper = mount(MoveOutPage, {
      attachTo: document.body,
      global: { plugins: [router] },
    });

    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(document.body.textContent).toContain('FQC sample message');
    expect(backSpy).not.toHaveBeenCalled();

    document.body.querySelector<HTMLButtonElement>('[data-testid="move-out-dialog-ok"]')?.click();
    await flushPromises();

    expect(window.history.state.moveOutResult).toEqual({
      LOTID: 'LOT-DEMO-01',
      resultCode: 'OK',
    });
    expect(backSpy).toHaveBeenCalledTimes(1);

    wrapper.unmount();
  });
});
