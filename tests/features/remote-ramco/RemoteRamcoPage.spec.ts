import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { COMMON_FIELD } from 'src/constants/common-strings';
import { useMainStore } from 'src/features/main/stores/main.store';
import RemoteRamcoPage from 'src/features/remote-ramco/pages/RemoteRamcoPage.vue';
import {
  resetRemoteRamcoApi,
  setRemoteRamcoApi,
} from 'src/features/remote-ramco/services/remote-ramco.service';
import { useRemoteRamcoStore } from 'src/features/remote-ramco/stores/remote-ramco.store';
import type {
  LotInfoResponse,
  RemoteRamcoApi,
  RemoteRamcoApiResult,
  WetRemoteEqpInfoResponse,
} from 'src/features/remote-ramco/types/remote-ramco.types';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';

const BaseDropdownListStub = {
  props: ['modelValue', 'id', 'ariaLabel', 'label', 'options', 'disabled'],
  emits: ['update:modelValue'],
  template:
    '<label>{{ label }}<select :id="id" :aria-label="ariaLabel" :disabled="disabled" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-if="!modelValue" value=""></option><option v-for="option in options" :key="option.value" :value="option.value">{{ option.label }}</option></select></label>',
};

const BaseModalStub = {
  props: ['open', 'title'],
  emits: ['cancel', 'update:open'],
  template:
    '<section v-if="open" class="ds-modal"><div class="ds-modal__title">{{ title }}</div><div class="ds-modal__body"><slot /></div><div class="ds-modal__footer"><slot name="footer" /></div></section>',
};

const goodLot: LotInfoResponse = {
  PRODUCT: 'PRODUCT-A',
  OPERATION: 'OP-A',
  QUANTITY: '24',
  JOBCODE: 'JOB-A',
  PROCESSSTEP: 'STEP-A',
  SUBOPERATION: '010',
  OPTYPE: 'N',
  OPERSEQUENCE: '001',
  STATUS: '',
  STATE: 'WIP',
  HOLDSTATUS: '',
  BATCHID: '',
  AREA: '',
  LOTRESUSER: '',
  NWCOMMENTQTY: '0',
};

const goodEquipment: WetRemoteEqpInfoResponse = {
  MAINEQPID: 'EQP-01',
  JOBID: 'JOB-01',
  PCOUNT: 'Y',
  EQPTYPE: 'ETCH',
  EQPAREA: 'AREA-01',
  NUMCST: '1',
};

let previousVibrateDescriptor: PropertyDescriptor | undefined;

function success<T>(data: T): RemoteRamcoApiResult<T> {
  return { ok: true, data };
}

function failure(message: string): RemoteRamcoApiResult<never> {
  return { ok: false, message };
}

function makeApi(overrides: Partial<RemoteRamcoApi> = {}): RemoteRamcoApi {
  return {
    fetchEquipmentInfo: vi.fn(async () => success({ ...goodEquipment })),
    fetchLotInfo: vi.fn(async () => success({ ...goodLot })),
    fetchRecipeInfo: vi.fn(async () =>
      success({ RECIPE: 'RCP-A', POP_MSG: '', QTIME_FLAG: '', QTIME_FLAG_W: '' }),
    ),
    fetchPortStatus: vi.fn(async () => success({ PORTSTATENAME: 'READY', ACKMSG: '' })),
    clearPort: vi.fn(async () => success(null)),
    cancelJobs: vi.fn(async () => success({ RET: '0' })),
    startRemote: vi.fn(async () => success(null)),
    ...overrides,
  };
}

function configurePageApi(api: RemoteRamcoApi): void {
  const mainStore = useMainStore();
  mainStore.facility = 'FAC-01';
  mainStore.operatorId = 'USER-01';
  setRemoteRamcoApi(api);
}

function mountPage(api = makeApi(), initialLotId = 'LOT-FRONT') {
  const pinia = createPinia();
  setActivePinia(pinia);
  configurePageApi(api);
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/remote-ramco', component: RemoteRamcoPage }],
  });

  return mount(RemoteRamcoPage, {
    props: { initialLotId },
    attachTo: document.body,
    global: {
      plugins: [pinia, router],
      stubs: {
        BaseDropdownList: BaseDropdownListStub,
        BaseModal: BaseModalStub,
      },
    },
  });
}

async function loadEquipment(wrapper: ReturnType<typeof mountPage>) {
  const machineInput = wrapper.find('#remote-ramco-equipment');
  await machineInput.setValue('EQP-01');
  await wrapper.get('[aria-label="진행장비 조회"]').trigger('click');
  await flushPromises();
}

async function dismissDialog() {
  const dialogButton = document.body.querySelector('.ds-modal__footer button');
  if (dialogButton) (dialogButton as HTMLButtonElement).click();
  await flushPromises();
}

function dialogText(): string {
  return document.body.textContent ?? '';
}

function stubVibration() {
  const vibrate = vi.fn();
  previousVibrateDescriptor = Object.getOwnPropertyDescriptor(navigator, 'vibrate');
  Object.defineProperty(navigator, 'vibrate', { configurable: true, value: vibrate });
  return vibrate;
}

async function clickDialogButton(index: number): Promise<void> {
  const button = document.body.querySelectorAll<HTMLButtonElement>('.ds-modal__footer button')[
    index
  ];
  if (!button) throw new Error(`Missing dialog button at index ${index}`);
  button.click();
  await flushPromises();
}

afterEach(() => {
  document.body.innerHTML = '';
  resetRemoteRamcoApi();
  if (previousVibrateDescriptor) {
    Object.defineProperty(navigator, 'vibrate', previousVibrateDescriptor);
  } else {
    Reflect.deleteProperty(navigator, 'vibrate');
  }
  previousVibrateDescriptor = undefined;
  vi.restoreAllMocks();
});

describe('RemoteRamcoPage', () => {
  it('renders exact legacy labels and initial disabled/hidden controls', async () => {
    const wrapper = mountPage(makeApi(), '');
    await flushPromises();
    expect(wrapper.text()).toContain('Remote Start');
    expect(wrapper.text()).toContain('진행장비');
    expect(wrapper.text()).toContain('RECIPE');
    expect(wrapper.text()).toContain('진행 LOT 정보');
    expect(wrapper.text()).toContain('FRONT');
    expect(wrapper.text()).toContain('REAR');
    expect(wrapper.text()).toContain('제품명');
    expect(wrapper.text()).toContain('공정명');
    expect(wrapper.text()).toContain('START');
    expect(wrapper.text()).toContain('취소');
    expect(wrapper.findAll('select').every((select) => !select.attributes('placeholder'))).toBe(
      true,
    );
    expect(wrapper.get('.remote-ramco-start').attributes('disabled')).toBeDefined();
    expect(wrapper.get('#remote-ramco-rear-lot').attributes('disabled')).toBeDefined();
    expect(wrapper.find('.remote-ramco-lu-block').exists()).toBe(false);
    expect(wrapper.find('.remote-ramco-port-controls').exists()).toBe(false);
    wrapper.unmount();
  });

  it('loads initial FRONT LOT and queries equipment, recipe with legacy request fields', async () => {
    const api = makeApi();
    const wrapper = mountPage(api);
    await flushPromises();
    expect(api.fetchLotInfo).toHaveBeenCalledWith({
      TYPE: 'MVIN',
      LOTID: 'LOT-FRONT',
      FACILITY: 'FAC-01',
    });
    await loadEquipment(wrapper);
    expect(api.fetchEquipmentInfo).toHaveBeenCalledWith({ EQPID: 'EQP-01' });
    const recipeSelect = wrapper.get('#remote-ramco-recipe');
    expect((recipeSelect.element as HTMLSelectElement).value).toBe('RCP-A');
    expect(api.fetchRecipeInfo).toHaveBeenCalledWith({
      ISPHOTO: 'N',
      LOTID: 'LOT-FRONT',
      OPERATION: 'OP-A',
      SUBOPERATION: '010',
      PRODUCT: 'PRODUCT-A',
      EQPID: 'EQP-01',
      OPTYPE: 'N',
      FACILITY: 'FAC-01',
      CHMEQPID: 'EQP-01',
    });
    expect(wrapper.get('.remote-ramco-front-quantity').text()).toBe('24');
    expect(wrapper.get('.remote-ramco-front-product').text()).toContain('PRODUCT-A (JOB-A)');
    expect(wrapper.get('.remote-ramco-front-operation').text()).toContain('OP-A-010(STEP-A)');
    expect(wrapper.get('.remote-ramco-start').attributes('disabled')).toBeUndefined();
    wrapper.unmount();
  });

  it('shows equipment lookup failure and blocks rear/start actions', async () => {
    const api = makeApi({
      fetchEquipmentInfo: vi.fn(async () => failure('equipment unavailable')),
    });
    const wrapper = mountPage(api);
    await flushPromises();
    await loadEquipment(wrapper);
    expect(dialogText()).toContain('equipment unavailable');
    expect(document.body.querySelector('.action-dialog')).not.toBeNull();
    expect(document.body.querySelector('.action-dialog-message')).not.toBeNull();
    expect(document.body.querySelector('.action-dialog-confirm')).not.toBeNull();
    expect(dialogText()).toContain(COMMON_FIELD.BTNOKSTR);
    expect(wrapper.get('#remote-ramco-rear-lot').attributes('disabled')).toBeDefined();
    expect(wrapper.get('.remote-ramco-start').attributes('disabled')).toBeDefined();
    wrapper.unmount();
  });

  it('selects the feature mock case from the route query', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    configurePageApi(makeApi());

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/remote-ramco', component: RemoteRamcoPage }],
    });
    await router.push('/remote-ramco?mock=remote-ramco&mockCase=equipment-error');
    await router.isReady();

    const wrapper = mount(RemoteRamcoPage, {
      props: { initialLotId: 'LOT-FRONT' },
      global: { plugins: [pinia, router] },
    });
    await flushPromises();
    await loadEquipment(wrapper);
    expect(dialogText()).toContain('장비 조회 mock 오류');
    wrapper.unmount();
  });

  it('handles equipment type visibility for ULTIMA3 and RAM8500z', async () => {
    const ultimaApi = makeApi({
      fetchEquipmentInfo: vi.fn(async () =>
        success({
          ...goodEquipment,
          EQPTYPE: 'ULTIMA3',
          PORTNAME: '1,2',
          INGRCP: 'RCP-L',
          INGRCP2: 'RCP-U',
        }),
      ),
    });
    const ultima = mountPage(ultimaApi);
    await flushPromises();
    await loadEquipment(ultima);
    expect(ultima.find('.remote-ramco-lu-block').exists()).toBe(true);
    expect(ultima.text()).toContain('(L)');
    expect(ultima.text()).toContain('(U)');
    expect(ultima.find('.remote-ramco-port-controls').exists()).toBe(true);
    ultima.unmount();

    const ramApi = makeApi({
      fetchEquipmentInfo: vi.fn(async () =>
        success({ ...goodEquipment, EQPTYPE: 'RAM8500z', PORTNAME: '1,2', INGRCP: 'RCP-RUN' }),
      ),
    });
    const ram = mountPage(ramApi);
    await flushPromises();
    await loadEquipment(ram);
    expect(ram.text()).toContain('진행중');
    expect(ram.find('.remote-ramco-port-controls').exists()).toBe(true);
    expect(ram.get('.remote-ramco-start').attributes('disabled')).toBeUndefined();
    ram.unmount();
  });

  it.each([
    ['RUN', 'WIP', '', '', '', '', '이미 MOVE IN된 LOT입니다.'],
    ['', 'WAIT', '', '', '', '', 'WAIT 상태 입니다. 자동화 진행이 불가합니다.'],
    ['', 'WIP', 'ONHOLD', '', '', '', 'HOLD된 LOT입니다. 자동화 진행이 불가합니다.'],
    ['', 'WIP', '', 'BATCH-1', '', '', 'BATCHID가 설정된 LOT입니다. 자동화 진행이 불가합니다.'],
    ['', 'WIP', '', '', 'PHOTO', '', 'PHOTO진행 LOT입니다. PHOTO 자동화 기능을 이용해 주세요.'],
    ['', 'WIP', '', '', '', 'USER-1', '이미 작업 예약되었거나 진행중인 LOT입니다.'],
  ])(
    'blocks FRONT LOT when status/state gates fail: %s/%s',
    async (status, state, hold, batch, area, reservation, message) => {
      const invalidLot: LotInfoResponse = {
        ...goodLot,
        STATUS: status,
        STATE: state,
        HOLDSTATUS: hold,
        BATCHID: batch,
        AREA: area,
        LOTRESUSER: reservation,
      };
      const api = makeApi({ fetchLotInfo: vi.fn(async () => success(invalidLot)) });
      const wrapper = mountPage(api);
      await flushPromises();
      expect(dialogText()).toContain(message);
      expect(wrapper.text()).not.toContain('PRODUCT-A (JOB-A)');
      wrapper.unmount();
    },
  );

  it('prevents duplicate FRONT/REAR lots and validates missing REAR input', async () => {
    const wrapper = mountPage();
    await flushPromises();
    await loadEquipment(wrapper);
    await wrapper.get('[aria-label="REAR LOT 조회"]').trigger('click');
    expect(dialogText()).toContain('LOT ID를 입력하세요');
    await dismissDialog();
    await wrapper.find('#remote-ramco-rear-lot').setValue('LOT-FRONT');
    await wrapper.get('[aria-label="REAR LOT 조회"]').trigger('click');
    expect(dialogText()).toContain('동일 LOT으로 조회가 불가합니다.');
    wrapper.unmount();
  });

  it('rejects REAR recipe mismatch and preserves the FRONT details', async () => {
    const api = makeApi({
      fetchRecipeInfo: vi.fn(async (request) =>
        success({
          RECIPE: 'REAR-RCP',
          ...(request.LOTID === 'LOT-FRONT' ? { RECIPE: 'RCP-A' } : {}),
        }),
      ),
    });
    const wrapper = mountPage(api);
    await flushPromises();
    await loadEquipment(wrapper);
    await wrapper.find('#remote-ramco-rear-lot').setValue('LOT-REAR');
    await wrapper.get('[aria-label="REAR LOT 조회"]').trigger('click');
    await flushPromises();
    expect(dialogText()).toContain('RECIPE가 다른 LOT입니다.');
    expect(wrapper.get('.remote-ramco-front-product').text()).toContain('PRODUCT-A (JOB-A)');
    expect(wrapper.get('.remote-ramco-start').attributes('disabled')).toBeDefined();
    wrapper.unmount();
  });

  it('loads a valid REAR LOT and keeps START enabled after recipe parity passes', async () => {
    const api = makeApi({
      fetchRecipeInfo: vi.fn(async () => success({ RECIPE: 'RCP-A' })),
    });
    const wrapper = mountPage(api);
    await flushPromises();
    await loadEquipment(wrapper);
    await wrapper.find('#remote-ramco-rear-lot').setValue('LOT-REAR');
    await wrapper.get('[aria-label="REAR LOT 조회"]').trigger('click');
    await flushPromises();
    expect(api.fetchLotInfo).toHaveBeenCalledWith({
      TYPE: 'MVIN',
      LOTID: 'LOT-REAR',
      FACILITY: 'FAC-01',
    });
    expect(wrapper.get('.remote-ramco-front-product').text()).toContain('PRODUCT-A (JOB-A)');
    expect(wrapper.get('.remote-ramco-front-quantity').text()).toBe('24');
    expect(wrapper.get('.remote-ramco-start').attributes('disabled')).toBeUndefined();
    wrapper.unmount();
  });

  it('blocks start if unread comments remain after the user has read the LOT', async () => {
    let lotInfoCallCount = 0;
    const api = makeApi({
      fetchLotInfo: vi.fn(async () =>
        success({ ...goodLot, NWCOMMENTQTY: lotInfoCallCount++ > 0 ? '2' : '0' }),
      ),
    });
    const wrapper = mountPage(api);
    await flushPromises();
    await loadEquipment(wrapper);
    await wrapper.get('.remote-ramco-start').trigger('click');
    await flushPromises();
    expect(dialogText()).toContain('읽지 않은 작업성 COMMENT가 [2]가 있습니다.');
    expect(api.startRemote).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('emits the exact comment payload and cancel event without routing elsewhere', async () => {
    const wrapper = mountPage();
    await flushPromises();
    const commentButton = wrapper.findAll('.remote-ramco-een')[0];
    await commentButton.trigger('click');
    expect(wrapper.emitted('openComment')?.[0]?.[0]).toEqual({
      LOTID: 'LOT-FRONT',
      OPERATION: 'OP-A',
      SUBOPERATION: '010',
      PROCESSSTEP: 'STEP-A',
      OPERSEQUENCE: '001',
    });
    await wrapper.get('.remote-ramco-cancel').trigger('click');
    expect(wrapper.emitted('cancel')).toHaveLength(1);
    wrapper.unmount();
  });

  it('handles port states and enables START only for allowed states', async () => {
    const api = makeApi({
      fetchEquipmentInfo: vi.fn(async () =>
        success({ ...goodEquipment, EQPTYPE: 'ULTIMA3', PORTNAME: '1,2' }),
      ),
      fetchPortStatus: vi.fn(async () => success({ PORTSTATENAME: 'RUN', ACKMSG: '' })),
    });
    const wrapper = mountPage(api);
    await flushPromises();
    await loadEquipment(wrapper);
    const portSelect = wrapper.get('#remote-ramco-port');
    expect((portSelect.element as HTMLSelectElement).value).toBe('1');
    expect(dialogText()).toContain('해당 PORT가 진행중입니다.');
    expect(wrapper.get('.remote-ramco-start').attributes('disabled')).toBeDefined();
    wrapper.unmount();
  });

  it('clears a PORT after confirmation and reports API failure', async () => {
    const api = makeApi({
      fetchEquipmentInfo: vi.fn(async () =>
        success({ ...goodEquipment, EQPTYPE: 'ULTIMA3', PORTNAME: '1' }),
      ),
      fetchPortStatus: vi.fn(async () => success({ PORTSTATENAME: 'RUN', ACKMSG: '' })),
      clearPort: vi.fn(async () => failure('clear failed')),
    });
    const wrapper = mountPage(api);
    await flushPromises();
    await loadEquipment(wrapper);
    await wrapper.get('.remote-ramco-clear-port').trigger('click');
    expect(dialogText()).toContain('PORT [1]을(를) 초기화 하고 [IDLE]상태로 바꾸시겠습니까?');
    expect(dialogText()).not.toContain('선택 RECIPE');
    expect(dialogText()).toContain(COMMON_FIELD.BTNNOSTR);
    expect(dialogText()).toContain(COMMON_FIELD.BTNYESSTR);
    await clickDialogButton(1);
    await flushPromises();
    expect(api.clearPort).toHaveBeenCalledWith({ MACHINENAME: 'EQP-01', PORTNAME: '1' });
    expect(dialogText()).toContain('clear failed');
    wrapper.unmount();
  });

  it('sends job cancel with legacy fields and reports nonzero RET', async () => {
    const api = makeApi({ cancelJobs: vi.fn(async () => success({ RET: '1' })) });
    const wrapper = mountPage(api);
    await flushPromises();
    await loadEquipment(wrapper);
    await wrapper.get('[aria-label="Delete job code"]').trigger('click');
    expect(dialogText()).toContain('장치의 Job을 삭제하시겠습니까?');
    expect(dialogText()).not.toContain('선택 RECIPE');
    expect(dialogText()).toContain(COMMON_FIELD.BTNNOSTR);
    expect(dialogText()).toContain(COMMON_FIELD.BTNYESSTR);
    await clickDialogButton(1);
    await flushPromises();
    expect(api.cancelJobs).toHaveBeenCalledWith({
      MACHINETYPE: 'ETCH',
      MACHINENAME: 'EQP-01',
      MACHINENAME2: 'EQP-01',
      EVENTUSER: 'USER-01',
      JOBNAME1: '',
      JOBNAME2: '',
    });
    expect(dialogText()).toContain('Job 삭제 요청에 실패하였습니다.');
    wrapper.unmount();
  });

  it('reports successful clear-port and job-delete requests', async () => {
    const clearApi = makeApi({
      fetchEquipmentInfo: vi.fn(async () =>
        success({ ...goodEquipment, EQPTYPE: 'ULTIMA3', PORTNAME: '1' }),
      ),
      fetchPortStatus: vi
        .fn()
        .mockResolvedValueOnce(success({ PORTSTATENAME: 'RUN', ACKMSG: '' }))
        .mockResolvedValue(success({ PORTSTATENAME: 'READY', ACKMSG: '' })),
    });
    const clear = mountPage(clearApi);
    await flushPromises();
    await loadEquipment(clear);
    await clear.get('.remote-ramco-clear-port').trigger('click');
    await clickDialogButton(1);
    expect(clearApi.clearPort).toHaveBeenCalledWith({ MACHINENAME: 'EQP-01', PORTNAME: '1' });
    expect(dialogText()).toContain('해당 PORT 초기화 명령을 전송하였습니다.');
    clear.unmount();
    document.body.innerHTML = '';

    const cancelApi = makeApi();
    const cancel = mountPage(cancelApi);
    await flushPromises();
    await loadEquipment(cancel);
    await cancel.get('[aria-label="Delete job code"]').trigger('click');
    await clickDialogButton(1);
    expect(cancelApi.cancelJobs).toHaveBeenCalledTimes(1);
    expect(dialogText()).toContain('Job 삭제 요청하였습니다.');
    cancel.unmount();
  });

  it('blocks START after the equipment response reports an active LOT', async () => {
    const api = makeApi({
      fetchEquipmentInfo: vi.fn(async () => success({ ...goodEquipment, PCOUNT: 'N' })),
    });
    const wrapper = mountPage(api);
    await flushPromises();
    await loadEquipment(wrapper);
    expect(api.fetchRecipeInfo).toHaveBeenCalledTimes(1);
    expect(dialogText()).toContain('진행중인 LOT이 있어 진행이 불가합니다.');
    expect(wrapper.get('.remote-ramco-start').attributes('disabled')).toBeDefined();
    wrapper.unmount();
  });

  it('confirms the recipe before remote start and submits exact legacy fields', async () => {
    const api = makeApi();
    const wrapper = mountPage(api);
    await flushPromises();
    await loadEquipment(wrapper);
    await wrapper.get('.remote-ramco-start').trigger('click');
    expect(dialogText()).toContain('계속 진행하시겠습니까?');
    expect(dialogText()).toContain('RCP-A');
    expect(dialogText()).toContain(COMMON_FIELD.NEGATIVEBTNSTR);
    expect(dialogText()).toContain(COMMON_FIELD.BTNOKSTR);
    await clickDialogButton(1);
    await flushPromises();
    expect(api.startRemote).toHaveBeenCalledWith({
      MACHINENAME: 'EQP-01',
      MACHINENAME2: 'EQP-01',
      MACHINETYPE: 'ETCH',
      AREANAME: 'AREA-01',
      NUMCASS: '1',
      LOTNAME: 'LOT-FRONT',
      LOTNAME2: '',
      RECIPENAME: 'RCP-A',
      JOBNAME: 'JOB-01',
      PRODUCTQTY: '24',
      PRODUCTQTY2: '',
      OPERATION: 'OP-A-010',
      OPERATION2: '-',
      EVENTUSER: 'USER-01',
      ISCARRAY: '',
      BAY: '',
      STOCKER: '',
    });
    expect(wrapper.emitted('completed')).toHaveLength(1);
    wrapper.unmount();
  });

  it('does not start after recipe confirmation is canceled and reports remote-start failures', async () => {
    const vibrate = stubVibration();
    const api = makeApi({
      startRemote: vi.fn(async () => failure('start failed')),
    });
    const wrapper = mountPage(api);
    await flushPromises();
    await loadEquipment(wrapper);
    await wrapper.get('.remote-ramco-start').trigger('click');
    await clickDialogButton(0);
    expect(api.startRemote).not.toHaveBeenCalled();
    await wrapper.get('.remote-ramco-start').trigger('click');
    await clickDialogButton(1);
    await flushPromises();
    expect(dialogText()).toContain('start failed');
    expect(vibrate).toHaveBeenCalledWith(1000);
    expect(document.body.querySelector('.ds-modal__title')?.textContent).toContain(
      COMMON_FIELD.TXTDIALOGTITLE_ERROR,
    );
    expect(wrapper.emitted('completed')).toBeUndefined();
    wrapper.unmount();
  });

  it('handles recipe error and Q-Time warning responses', async () => {
    const api = makeApi({
      fetchRecipeInfo: vi.fn(async () =>
        success({ RECIPE: 'RCP-A', POP_MSG: 'Recipe warning', QTIME_FLAG_W: 'Y' }),
      ),
    });
    const wrapper = mountPage(api);
    await flushPromises();
    await loadEquipment(wrapper);
    expect(dialogText()).toContain('Q-Time 2hr 이내 근접 Lot 입니다');
    expect(document.body.querySelector('.ds-modal__title')?.textContent).toContain(
      COMMON_FIELD.TXTDIALOGTITLE_WARNING,
    );
    wrapper.unmount();

    const failApi = makeApi({
      fetchRecipeInfo: vi.fn(async () => failure('recipe failed')),
    });
    const failWrapper = mountPage(failApi);
    await flushPromises();
    await loadEquipment(failWrapper);
    expect(dialogText()).toContain('recipe failed');
    failWrapper.unmount();
  });

  it('handles lot API failures and Q-Time over', async () => {
    const api = makeApi({
      fetchLotInfo: vi.fn(async () => failure('lot failed')),
    });
    const wrapper = mountPage(api);
    await flushPromises();
    expect(dialogText()).toContain('lot failed');
    wrapper.unmount();

    const qtimeApi = makeApi({
      fetchRecipeInfo: vi.fn(async () => success({ RECIPE: 'RCP-A', QTIME_FLAG: 'Y' })),
    });
    const qtimeWrapper = mountPage(qtimeApi);
    await flushPromises();
    await loadEquipment(qtimeWrapper);
    expect(dialogText()).toContain('Q-Time 초과 대상 Lot 입니다');
    qtimeWrapper.unmount();
  });

  it('parses equipment scan barcodes and reports invalid equipment scans', async () => {
    const api = makeApi();
    const wrapper = mountPage(api, '');
    const machineInput = wrapper.find('#remote-ramco-equipment');
    await machineInput.setValue('EQP-EQP-01X');
    await machineInput.trigger('keydown', { key: 'Enter' });
    await flushPromises();
    expect(api.fetchEquipmentInfo).toHaveBeenCalledWith({ EQPID: 'EQP-01' });
    wrapper.unmount();

    const invalid = mountPage(makeApi(), '');
    const invalidInput = invalid.find('#remote-ramco-equipment');
    await invalidInput.setValue('MACHINE');
    await invalidInput.trigger('keydown', { key: 'Enter' });
    expect(dialogText()).toContain('진행할 장비를 읽어주세요.');
    invalid.unmount();
  });

  it('parses a LOT scanner prefix and rejects non-barcode Enter input', async () => {
    const api = makeApi();
    const wrapper = mountPage(api);
    await flushPromises();
    await loadEquipment(wrapper);
    const rearInput = wrapper.find('#remote-ramco-rear-lot');
    await rearInput.setValue(' $LOT-REARX');
    await rearInput.trigger('keydown', { key: 'Enter' });
    await flushPromises();
    expect(api.fetchLotInfo).toHaveBeenCalledWith({
      TYPE: 'MVIN',
      LOTID: 'LOT-REAR',
      FACILITY: 'FAC-01',
    });
    wrapper.unmount();

    const invalidApi = makeApi();
    const invalid = mountPage(invalidApi);
    await flushPromises();
    await loadEquipment(invalid);
    const invalidRear = invalid.find('#remote-ramco-rear-lot');
    await invalidRear.setValue('LOT-REAR');
    await invalidRear.trigger('keydown', { key: 'Enter' });
    expect(dialogText()).toContain('LOT#를 읽어주세요.');
    expect(invalidApi.fetchLotInfo).toHaveBeenCalledTimes(1);
    invalid.unmount();
  });

  it('treats Escape from the recipe confirmation as legacy OK', async () => {
    const api = makeApi();
    const wrapper = mountPage(api);
    await flushPromises();
    await loadEquipment(wrapper);
    await wrapper.get('.remote-ramco-start').trigger('click');
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await flushPromises();
    expect(api.startRemote).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it('covers ULTIMA3 available and unavailable PORT responses and ack warning', async () => {
    const statuses = ['RESERVED', '', 'IDLE'];
    for (const status of statuses) {
      const api = makeApi({
        fetchEquipmentInfo: vi.fn(async () =>
          success({ ...goodEquipment, EQPTYPE: 'ULTIMA3', PORTNAME: '1', RECOMM3: 'Recommend' }),
        ),
        fetchPortStatus: vi.fn(async () =>
          success({
            PORTSTATENAME: status,
            ACKMSG: status === 'RESERVED' ? 'Port warning' : '',
          }),
        ),
      });
      const wrapper = mountPage(api);
      await flushPromises();
      await loadEquipment(wrapper);
      expect(api.fetchPortStatus).toHaveBeenCalledWith({
        EQPID: 'EQP-01',
        PORTNAME: '1',
        LOTID: 'LOT-FRONT',
        RECIPE: '',
      });
      const startButton = wrapper.find('.remote-ramco-start');
      const clearPortButton = wrapper.find('.remote-ramco-clear-port');
      expect(startButton.exists()).toBe(true);
      expect(clearPortButton.exists()).toBe(true);
      if (status === 'RESERVED') {
        expect(dialogText()).toContain('Port warning');
        expect(startButton.attributes('disabled')).toBeDefined();
        expect(clearPortButton.attributes('disabled')).toBeUndefined();
      } else if (!status) {
        expect(dialogText()).toContain('PORT 정보를 가져올 수 없습니다.');
        expect(clearPortButton.attributes('disabled')).toBeUndefined();
      } else {
        expect(startButton.attributes('disabled')).toBeUndefined();
        expect(clearPortButton.attributes('disabled')).toBeDefined();
      }
      wrapper.unmount();
      document.body.innerHTML = '';
    }
  });

  it('enables RAM8500z only when PORT is READY and handles clear/cancel service exceptions', async () => {
    const blockedApi = makeApi({
      fetchEquipmentInfo: vi.fn(async () =>
        success({ ...goodEquipment, EQPTYPE: 'RAM8500z', PORTNAME: '1' }),
      ),
      fetchPortStatus: vi.fn(async () => success({ PORTSTATENAME: 'RUN', ACKMSG: 'Unavailable' })),
    });
    const blocked = mountPage(blockedApi);
    await flushPromises();
    await loadEquipment(blocked);
    expect(blocked.get('.remote-ramco-start').attributes('disabled')).toBeDefined();
    expect(dialogText()).toContain('Unavailable');
    blocked.unmount();
    document.body.innerHTML = '';

    const clearErrorApi = makeApi({
      fetchEquipmentInfo: vi.fn(async () =>
        success({ ...goodEquipment, EQPTYPE: 'ULTIMA3', PORTNAME: '1' }),
      ),
      fetchPortStatus: vi.fn(async () => success({ PORTSTATENAME: 'RUN', ACKMSG: '' })),
      clearPort: vi.fn(async () => {
        throw new Error('clear transport error');
      }),
    });
    const clearError = mountPage(clearErrorApi);
    await flushPromises();
    await loadEquipment(clearError);
    await clearError.get('.remote-ramco-clear-port').trigger('click');
    await clickDialogButton(1);
    expect(dialogText()).toContain('clear transport error');
    clearError.unmount();
    document.body.innerHTML = '';

    const cancelErrorApi = makeApi({
      cancelJobs: vi.fn(async () => {
        throw new Error('cancel transport error');
      }),
    });
    const cancelError = mountPage(cancelErrorApi);
    await flushPromises();
    await loadEquipment(cancelError);
    await cancelError.get('[aria-label="Delete job code"]').trigger('click');
    await clickDialogButton(1);
    expect(dialogText()).toContain('cancel transport error');
    cancelError.unmount();
  });

  it('handles recipe exceptions and remote-start transport errors', async () => {
    const recipeErrorApi = makeApi({
      fetchRecipeInfo: vi.fn(async () => {
        throw new Error('recipe transport error');
      }),
    });
    const recipeError = mountPage(recipeErrorApi);
    await flushPromises();
    await loadEquipment(recipeError);
    expect(dialogText()).toContain('recipe transport error');
    recipeError.unmount();
    document.body.innerHTML = '';

    const startErrorApi = makeApi({
      startRemote: vi.fn(async () => {
        throw new Error('start transport error');
      }),
    });
    const vibrate = stubVibration();
    const startError = mountPage(startErrorApi);
    await flushPromises();
    await loadEquipment(startError);
    await startError.get('.remote-ramco-start').trigger('click');
    await clickDialogButton(1);
    expect(dialogText()).toContain('start transport error');
    expect(vibrate).toHaveBeenCalledWith(1000);
    startError.unmount();
  });

  it('navigates to /comment-list with FRONT lot params and saves session state', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/remote-ramco', component: RemoteRamcoPage },
        { path: '/comment-list', component: { template: '<div>COMMENT</div>' } },
      ],
    });
    await router.push('/remote-ramco');
    await router.isReady();

    const pushSpy = vi.spyOn(router, 'push');
    const api = makeApi();
    configurePageApi(api);
    const wrapper = mount(RemoteRamcoPage, {
      props: { initialLotId: 'LOT-FRONT' },
      global: { plugins: [pinia, router] },
    });
    await flushPromises();

    const eenButton = wrapper.findAll('.remote-ramco-een')[0];
    expect(eenButton.attributes('disabled')).toBeUndefined();
    await eenButton.trigger('click');
    await flushPromises();

    expect(pushSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/comment-list',
        query: expect.objectContaining({
          lotId: 'LOT-FRONT',
          operation: 'OP-A',
          subOperation: '010',
          processStep: 'STEP-A',
          operSequence: '001',
          facility: 'FAC-01',
        }),
      }),
    );

    const store = useRemoteRamcoStore();
    const saved = store.consumeSessionState();
    expect(saved).not.toBeNull();
    expect(saved?.commentSide).toBe('front');
    expect(saved?.frontLot.lotId).toBe('LOT-FRONT');
    wrapper.unmount();
  });

  it('navigates to /comment-list with REAR lot params and saves session state', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/remote-ramco', component: RemoteRamcoPage },
        { path: '/comment-list', component: { template: '<div>COMMENT</div>' } },
      ],
    });
    await router.push('/remote-ramco');
    await router.isReady();

    const pushSpy = vi.spyOn(router, 'push');
    const api = makeApi({
      fetchLotInfo: vi.fn(async (req) =>
        success({
          ...goodLot,
          OPERATION: req.LOTID === 'LOT-REAR' ? 'OP-REAR' : 'OP-A',
          SUBOPERATION: req.LOTID === 'LOT-REAR' ? '020' : '010',
          PROCESSSTEP: req.LOTID === 'LOT-REAR' ? 'STEP-REAR' : 'STEP-A',
          OPERSEQUENCE: req.LOTID === 'LOT-REAR' ? '002' : '001',
        }),
      ),
    });
    configurePageApi(api);
    const wrapper = mount(RemoteRamcoPage, {
      props: { initialLotId: 'LOT-FRONT' },
      global: { plugins: [pinia, router] },
    });
    await flushPromises();
    await loadEquipment(wrapper);

    const rearInput = wrapper.find('#remote-ramco-rear-lot');
    await rearInput.setValue('LOT-REAR');
    await wrapper.get('[aria-label="REAR LOT 조회"]').trigger('click');
    await flushPromises();

    const rearEenButton = wrapper.findAll('.remote-ramco-een')[1];
    expect(rearEenButton.attributes('disabled')).toBeUndefined();
    await rearEenButton.trigger('click');
    await flushPromises();

    expect(pushSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/comment-list',
        query: expect.objectContaining({
          lotId: 'LOT-REAR',
          operation: 'OP-REAR',
          subOperation: '020',
          processStep: 'STEP-REAR',
          operSequence: '002',
        }),
      }),
    );

    const store = useRemoteRamcoStore();
    const saved = store.consumeSessionState();
    expect(saved).not.toBeNull();
    expect(saved?.commentSide).toBe('rear');
    expect(saved?.rearLot.lotId).toBe('LOT-REAR');
    wrapper.unmount();
  });

  it('restores session state and syncs unread comments upon returning from comment list', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useRemoteRamcoStore();
    store.saveSessionState({
      equipmentInput: 'EQP-SAVED',
      selectedRecipe: 'RCP-SAVED',
      recipes: ['RCP-SAVED'],
      selectedPort: '',
      ports: [],
      portState: '',
      portAck: '',
      frontLot: {
        lotId: 'LOT-SAVED',
        commentQty: '1',
        product: 'PROD',
        operation: 'OPER',
        quantity: '25',
        operationCode: 'OP',
        subOperation: '01',
        processStep: 'STEP',
        opType: 'N',
        operSequence: '1',
        nwCommentQty: '2',
      },
      rearLot: {
        lotId: '',
        commentQty: '',
        product: '',
        operation: '',
        quantity: '',
        operationCode: '',
        subOperation: '',
        processStep: '',
        opType: '',
        operSequence: '',
        nwCommentQty: '',
      },
      rearLotInput: '',
      rearLotEnabled: false,
      clearPortEnabled: false,
      startEnabled: false,
      commentSide: 'front',
    });

    const api = makeApi({
      fetchLotInfo: vi.fn(async () => success({ ...goodLot, COMMENTQTY: '3', NWCOMMENTQTY: '0' })),
    });
    configurePageApi(api);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/remote-ramco', component: RemoteRamcoPage }],
    });
    await router.push('/remote-ramco');
    await router.isReady();

    const wrapper = mount(RemoteRamcoPage, {
      props: { initialLotId: 'LOT-DEFAULT' },
      global: { plugins: [pinia, router] },
    });
    await flushPromises();

    expect(wrapper.find('.remote-ramco-equipment input').element).toHaveProperty(
      'value',
      'EQP-SAVED',
    );
    expect(wrapper.find('#remote-ramco-front-lot').element).toHaveProperty('value', 'LOT-SAVED');
    expect(api.fetchLotInfo).toHaveBeenCalledWith(
      expect.objectContaining({ LOTID: 'LOT-SAVED', TYPE: 'MVIN' }),
    );
    wrapper.unmount();
  });

  it('stores returnLotId in remoteRamcoStore and calls router.back on start completion', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/remote-ramco', component: RemoteRamcoPage }],
    });
    await router.push('/remote-ramco');
    await router.isReady();

    const backSpy = vi.spyOn(router, 'back');
    const api = makeApi();
    configurePageApi(api);
    const wrapper = mount(RemoteRamcoPage, {
      props: { initialLotId: 'LOT-FRONT' },
      global: { plugins: [pinia, router] },
    });
    await flushPromises();
    await loadEquipment(wrapper);

    await wrapper.get('.remote-ramco-start').trigger('click');
    await clickDialogButton(1);
    await flushPromises();

    const store = useRemoteRamcoStore();
    expect(store.consumeReturnLotId()).toBe('LOT-FRONT');
    expect(backSpy).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });
});
