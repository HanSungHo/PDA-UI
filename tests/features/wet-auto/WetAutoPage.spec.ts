import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useMainStore } from 'src/features/main/stores/main.store';
import WetAutoPage from 'src/features/wet-auto/pages/WetAutoPage.vue';
import { resetWetAutoApi, setWetAutoApi } from 'src/features/wet-auto/services/wet-auto.service';
import { useWetAutoStore } from 'src/features/wet-auto/stores/wet-auto.store';
import type { WetAutoApi, WetAutoApiResult } from 'src/features/wet-auto/types/wet-auto.types';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';

const BaseDropdownListStub = {
  props: ['modelValue', 'id', 'label', 'options', 'disabled'],
  emits: ['update:modelValue'],
  template:
    '<label>{{ label }}<select :id="id" :disabled="disabled" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option value=""></option><option v-for="option in options" :key="option.value" :value="option.value">{{ option.label }}</option></select></label>',
};

const BaseModalStub = {
  props: ['open', 'title'],
  emits: ['cancel', 'update:open'],
  template:
    '<section v-if="open" class="ds-modal"><h2>{{ title }}</h2><slot /><slot name="footer" /></section>',
};

function success<T>(data: T): WetAutoApiResult<T> {
  return { ok: true, data };
}

function makeApi(overrides: Partial<WetAutoApi> = {}): WetAutoApi {
  return {
    fetchEquipment: vi.fn(async () =>
      success({ MAINEQPID: 'EQP-MAIN', JOBID: 'JOB-01', EQPTYPE: 'WET', EQPAREA: 'AREA-01' }),
    ),
    fetchLot: vi.fn(async () => success({})),
    fetchRecipe: vi.fn(async () => success({ RECIPE: 'RCP-01' })),
    fetchBays: vi.fn(async () => success({ BAYS: { ITEM: [] } })),
    fetchStockers: vi.fn(async () => success({ STOCKERS: { ITEM: [] } })),
    start: vi.fn(async () => success(null)),
    ...overrides,
  };
}

async function mountPage(api = makeApi()) {
  const pinia = createPinia();
  setActivePinia(pinia);
  setWetAutoApi(api);
  const mainStore = useMainStore();
  mainStore.facility = 'FAC-01';
  mainStore.operatorId = 'USER-01';
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/wet-auto', component: WetAutoPage },
      { path: '/comment-list', component: { template: '<div />' } },
    ],
  });
  await router.push('/');
  await router.push('/wet-auto');
  await router.isReady();
  const wrapper = mount(WetAutoPage, {
    attachTo: document.body,
    global: {
      plugins: [pinia, router],
      stubs: { BaseDropdownList: BaseDropdownListStub, BaseModal: BaseModalStub },
    },
  });
  return { wrapper, router, pinia };
}

afterEach(() => {
  document.body.innerHTML = '';
  resetWetAutoApi();
  vi.restoreAllMocks();
});

describe('WetAutoPage', () => {
  it('renders the screen copy, search controls, and initial enabled state', async () => {
    const { wrapper } = await mountPage();
    await flushPromises();
    expect(wrapper.text()).toContain('WET 자동화');
    expect(wrapper.text()).toContain('진행장비');
    expect(wrapper.text()).toContain('예약시간');
    expect(wrapper.text()).toContain('RECIPE');
    expect(wrapper.text()).toContain('반송');
    expect(wrapper.text()).toContain('진행 LOT 정보');
    // Supplied HTML repeats this heading once per LOT panel (front/rear).
    expect(wrapper.findAll('.wet-auto-section-title')).toHaveLength(2);
    expect(wrapper.text()).toContain('START');
    expect(wrapper.text()).toContain('취소');
    expect(wrapper.text()).not.toContain('Search');
    expect(wrapper.text()).not.toContain('Null');
    expect(wrapper.get('.ds-screen__title').text()).toBe('WET 자동화');
    expect(wrapper.findAll('.wet-auto-search-icon')).toHaveLength(3);
    expect(wrapper.get('.wet-auto-search--machine').text()).toBe('조회');
    expect(wrapper.get('[aria-label="진행장비 조회"]').attributes('disabled')).toBeUndefined();
    expect(wrapper.get('[aria-label="FRONT EEN"]').attributes('disabled')).toBeDefined();
    expect(wrapper.get('#wet-auto-front-lot').attributes('disabled')).toBeDefined();
    expect(wrapper.get('#wet-auto-rear-lot').attributes('disabled')).toBeDefined();
    expect(wrapper.get('.wet-auto-start').attributes('disabled')).toBeUndefined();
    const dropdowns = wrapper.findAllComponents(BaseDropdownListStub);
    expect(dropdowns.map((dropdown) => dropdown.props('disabled'))).toEqual([false, false]);
    expect(dropdowns.map((dropdown) => dropdown.props('options'))).toEqual([[], []]);
    expect(wrapper.findComponent({ name: 'BaseScreen' }).exists()).toBe(true);
    wrapper.unmount();
  });

  it('keeps click lookup separate from barcode normalization and shows exact empty validation', async () => {
    const api = makeApi();
    const { wrapper } = await mountPage(api);
    const machine = wrapper.get('#wet-auto-machine');
    await machine.setValue('eqp-wet-01x');
    await wrapper.get('[aria-label="진행장비 조회"]').trigger('click');
    await flushPromises();
    expect(api.fetchEquipment).toHaveBeenCalledWith({ EQPID: 'EQP-WET-01X' });
    expect(wrapper.text()).not.toContain('READING ERROR');
    wrapper.unmount();
  });

  it('normalizes keyboard scanner input and preserves the visible EEN side inversion', async () => {
    const api = makeApi();
    const { wrapper } = await mountPage(api);
    const machine = wrapper.get('#wet-auto-machine');
    await machine.setValue('EQP-WET-01X');
    await machine.trigger('keydown.enter');
    await flushPromises();
    expect(api.fetchEquipment).toHaveBeenCalledWith({ EQPID: 'WET-01' });
    expect(wrapper.get('#wet-auto-machine').element).toBeTruthy();
    expect(wrapper.text()).toContain('진행 LOT 정보');
    expect(wrapper.get('[aria-label="FRONT EEN"]').attributes('disabled')).toBeDefined();
    wrapper.unmount();
  });

  it('rejects a whitespace-prefixed machine barcode and keeps prefix-only input silent', async () => {
    const api = makeApi();
    const { wrapper } = await mountPage(api);
    const machine = wrapper.get('#wet-auto-machine');

    await machine.setValue(' EQP-WET-01X');
    await machine.trigger('keydown.enter');
    await flushPromises();
    expect((machine.element as HTMLInputElement).value).toBe('');
    expect(api.fetchEquipment).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('READING ERROR');
    expect(wrapper.text()).toContain('진행할 장비를 읽어주세요.');

    await wrapper.get('.ds-modal button').trigger('click');
    await machine.setValue('EQP-');
    await machine.trigger('keydown.enter');
    await flushPromises();
    expect(api.fetchEquipment).not.toHaveBeenCalled();
    expect(wrapper.text()).not.toContain('READING ERROR');
    wrapper.unmount();
  });

  it('clears invalid scanner input without sending API requests', async () => {
    const lotInfo = {
      PRODUCT: 'PRODUCT-WET',
      JOBCODE: 'JOB-WET',
      OPERATION: '2100',
      SUBOPERATION: '010',
      PROCESSSTEP: 'WET-STEP',
      OPERSEQUENCE: '003',
      OPTYPE: 'WET',
      STATE: 'WIP',
    };
    const api = makeApi({ fetchLot: vi.fn(async () => success(lotInfo)) });
    const { wrapper } = await mountPage(api);

    await wrapper.get('#wet-auto-machine').setValue('BAD-MACHINE');
    await wrapper.get('#wet-auto-machine').trigger('keydown.enter');
    await flushPromises();
    expect((wrapper.get('#wet-auto-machine').element as HTMLInputElement).value).toBe('');
    expect(api.fetchEquipment).not.toHaveBeenCalled();

    await wrapper.get('#wet-auto-machine').setValue('WET-EQP-01');
    await wrapper.get('[aria-label="진행장비 조회"]').trigger('click');
    await flushPromises();
    await wrapper.get('#wet-auto-front-lot').setValue('BAD-LOT');
    await wrapper.get('#wet-auto-front-lot').trigger('keydown.enter');
    await flushPromises();
    expect((wrapper.get('#wet-auto-front-lot').element as HTMLInputElement).value).toBe('');
    expect(api.fetchLot).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('normalizes undefined BaseInput updates to empty strings', async () => {
    const lotInfo = {
      PRODUCT: 'PRODUCT-WET',
      JOBCODE: 'JOB-WET',
      OPERATION: '2100',
      SUBOPERATION: '010',
      PROCESSSTEP: 'WET-STEP',
      OPERSEQUENCE: '003',
      OPTYPE: 'WET',
      STATE: 'WIP',
    };
    const { wrapper } = await mountPage(makeApi({ fetchLot: vi.fn(async () => success(lotInfo)) }));

    await wrapper.get('#wet-auto-machine').setValue('WET-EQP-01');
    await wrapper.findComponent({ name: 'BaseInput' }).vm.$emit('update:modelValue', undefined);
    expect((wrapper.get('#wet-auto-machine').element as HTMLInputElement).value).toBe('');
    await wrapper.get('#wet-auto-machine').setValue('WET-EQP-01');
    await wrapper.get('[aria-label="진행장비 조회"]').trigger('click');
    await flushPromises();

    const inputs = wrapper.findAllComponents({ name: 'BaseInput' });
    await inputs[3].vm.$emit('update:modelValue', 'LOT-FRONT');
    await inputs[3].vm.$emit('update:modelValue', undefined);
    expect((wrapper.get('#wet-auto-front-lot').element as HTMLInputElement).value).toBe('');
    await inputs[4].vm.$emit('update:modelValue', 'LOT-REAR');
    await inputs[4].vm.$emit('update:modelValue', undefined);
    expect((wrapper.get('#wet-auto-rear-lot').element as HTMLInputElement).value).toBe('');
    wrapper.unmount();
  });

  it('normalizes LOT scanner input but sends click input exactly as typed', async () => {
    const lotInfo = {
      PRODUCT: 'PRODUCT-WET',
      JOBCODE: 'JOB-WET',
      OPERATION: '2100',
      SUBOPERATION: '010',
      PROCESSSTEP: 'WET-STEP',
      OPERSEQUENCE: '003',
      OPTYPE: 'WET',
      QUANTITY: '24',
      STATUS: 'WAIT',
      STATE: 'WIP',
      HOLDSTATUS: '',
      BATCHID: '',
      AREA: 'WET',
      LOTRESUSER: '',
      NWCOMMENTQTY: '0',
    };
    const scannerApi = makeApi({ fetchLot: vi.fn(async () => success(lotInfo)) });
    const scannerPage = await mountPage(scannerApi);
    await scannerPage.wrapper.get('#wet-auto-machine').setValue('WET-EQP-01');
    await scannerPage.wrapper.get('[aria-label="진행장비 조회"]').trigger('click');
    await flushPromises();
    await scannerPage.wrapper.get('#wet-auto-front-lot').setValue(' WET-LOT-01X');
    await scannerPage.wrapper.get('#wet-auto-front-lot').trigger('keydown.enter');
    await flushPromises();
    expect(scannerApi.fetchLot).toHaveBeenCalledWith({
      TYPE: 'MVIN',
      LOTID: 'WET-LOT-01',
      FACILITY: 'FAC-01',
    });
    scannerPage.wrapper.unmount();

    const clickApi = makeApi({ fetchLot: vi.fn(async () => success(lotInfo)) });
    const clickPage = await mountPage(clickApi);
    await clickPage.wrapper.get('#wet-auto-machine').setValue('WET-EQP-01');
    await clickPage.wrapper.get('[aria-label="진행장비 조회"]').trigger('click');
    await flushPromises();
    await clickPage.wrapper.get('#wet-auto-front-lot').setValue(' wet-lot-01x');
    await clickPage.wrapper.get('[aria-label="FRONT LOT 조회"]').trigger('click');
    await flushPromises();
    expect(clickApi.fetchLot).toHaveBeenCalledWith({
      TYPE: 'MVIN',
      LOTID: ' WET-LOT-01X',
      FACILITY: 'FAC-01',
    });
    clickPage.wrapper.unmount();
  });

  it('handles the REAR scanner and dependent carry selectors', async () => {
    const lotInfo = {
      PRODUCT: 'PRODUCT-WET',
      JOBCODE: 'JOB-WET',
      OPERATION: '2100',
      SUBOPERATION: '010',
      PROCESSSTEP: 'WET-STEP',
      OPERSEQUENCE: '003',
      OPTYPE: 'WET',
      QUANTITY: '24',
      STATUS: 'WAIT',
      STATE: 'WIP',
      HOLDSTATUS: '',
      BATCHID: '',
      AREA: 'WET',
      LOTRESUSER: '',
      NWCOMMENTQTY: '0',
    };
    const api = makeApi({
      fetchLot: vi.fn(async () => success(lotInfo)),
      fetchBays: vi.fn(async () => success({ BAYS: { ITEM: [{ BAY: 'BAY-01' }] } })),
      fetchStockers: vi.fn(async () => success({ STOCKERS: { ITEM: [{ STOCKER: 'STK-01' }] } })),
    });
    const { wrapper } = await mountPage(api);
    await wrapper.get('#wet-auto-machine').setValue('WET-EQP-01');
    await wrapper.get('[aria-label="진행장비 조회"]').trigger('click');
    await flushPromises();
    await wrapper.get('#wet-auto-front-lot').setValue('WET-LOT-01');
    await wrapper.get('[aria-label="FRONT LOT 조회"]').trigger('click');
    await flushPromises();

    await wrapper.findComponent({ name: 'BaseCheckbox' }).vm.$emit('update:modelValue', true);
    await flushPromises();
    await wrapper.get('#wet-auto-bay').setValue('BAY-01');
    await flushPromises();
    await wrapper.get('#wet-auto-stocker').setValue('STK-01');
    expect(api.fetchBays).toHaveBeenCalledWith({ FACILITY: 'FAC-01' });
    expect(api.fetchStockers).toHaveBeenCalledWith({ BAY: 'BAY-01', FACILITY: 'FAC-01' });

    await wrapper.get('#wet-auto-rear-lot').setValue(' WET-LOT-02X');
    await wrapper.get('#wet-auto-rear-lot').trigger('keydown.enter');
    await flushPromises();
    expect(api.fetchLot).toHaveBeenLastCalledWith({
      TYPE: 'MVIN',
      LOTID: 'WET-LOT-02',
      FACILITY: 'FAC-01',
    });
    wrapper.unmount();
  });

  it('normalizes non-string dropdown update values to empty selections', async () => {
    const api = makeApi();
    const { wrapper } = await mountPage(api);
    const dropdowns = wrapper.findAllComponents(BaseDropdownListStub);
    await dropdowns[0].vm.$emit('update:modelValue', []);
    await dropdowns[1].vm.$emit('update:modelValue', undefined);
    await flushPromises();
    expect(api.fetchStockers).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('honors recipe confirmation cancel/confirm and returns after successful START', async () => {
    const lotInfo = {
      PRODUCT: 'PRODUCT-WET',
      JOBCODE: 'JOB-WET',
      OPERATION: '2100',
      SUBOPERATION: '010',
      PROCESSSTEP: 'WET-STEP',
      OPERSEQUENCE: '003',
      OPTYPE: 'WET',
      QUANTITY: '24',
      STATUS: 'WAIT',
      STATE: 'WIP',
      HOLDSTATUS: '',
      BATCHID: '',
      AREA: 'WET',
      LOTRESUSER: '',
      NWCOMMENTQTY: '0',
    };
    const api = makeApi({ fetchLot: vi.fn(async () => success(lotInfo)) });
    const { wrapper, router, pinia } = await mountPage(api);
    await wrapper.get('#wet-auto-machine').setValue('WET-EQP-01');
    await wrapper.get('[aria-label="진행장비 조회"]').trigger('click');
    await flushPromises();
    await wrapper.get('#wet-auto-front-lot').setValue('WET-LOT-01');
    await wrapper.get('[aria-label="FRONT LOT 조회"]').trigger('click');
    await flushPromises();

    const recipeDialog = wrapper.findComponent({ name: 'RemoteRecipeDialog' });
    await wrapper.get('.wet-auto-start').trigger('click');
    await flushPromises();
    expect(recipeDialog.props()).toMatchObject({
      modelValue: true,
      recipeList: 'RCP-01',
      lotNo: '',
      legacyBackBehavior: true,
    });
    await recipeDialog.vm.$emit('cancel');
    await flushPromises();
    expect(api.start).not.toHaveBeenCalled();

    await wrapper.get('.wet-auto-start').trigger('click');
    await flushPromises();
    await recipeDialog.vm.$emit('confirm');
    await flushPromises();
    expect(api.start).toHaveBeenCalledOnce();
    expect(router.currentRoute.value.path).toBe('/');
    expect(useWetAutoStore(pinia).consumeSessionState()).toBeUndefined();
    wrapper.unmount();
  });

  it('sends each visible EEN button to the opposite LOT and snapshots Wet state', async () => {
    const lotInfo = {
      PRODUCT: 'PRODUCT-WET',
      JOBCODE: 'JOB-WET',
      OPERATION: '2100',
      SUBOPERATION: '010',
      PROCESSSTEP: 'WET-STEP',
      OPERSEQUENCE: '003',
      OPTYPE: 'WET',
      QUANTITY: '24',
      STATUS: 'WAIT',
      STATE: 'WIP',
      HOLDSTATUS: '',
      BATCHID: '',
      AREA: 'WET',
      LOTRESUSER: '',
      NWCOMMENTQTY: '0',
    };
    const api = makeApi({
      fetchLot: vi.fn(async () => success(lotInfo)),
      fetchRecipe: vi.fn(async () => success({ RECIPE: 'RCP-WET-01' })),
    });
    const { wrapper, router, pinia } = await mountPage(api);

    await wrapper.get('#wet-auto-machine').setValue('WET-EQP-01');
    await wrapper.get('[aria-label="진행장비 조회"]').trigger('click');
    await flushPromises();
    await wrapper.get('#wet-auto-front-lot').setValue('WET-LOT-01');
    await wrapper.get('[aria-label="FRONT LOT 조회"]').trigger('click');
    await flushPromises();
    expect(wrapper.get('[aria-label="FRONT EEN"]').attributes('disabled')).toBeDefined();
    expect(wrapper.get('[aria-label="REAR EEN"]').attributes('disabled')).toBeUndefined();
    await wrapper.get('#wet-auto-rear-lot').setValue('WET-LOT-02');
    await wrapper.get('[aria-label="REAR LOT 조회"]').trigger('click');
    await flushPromises();
    await wrapper.get('[aria-label="FRONT EEN"]').trigger('click');
    await flushPromises();

    expect(router.currentRoute.value.path).toBe('/comment-list');
    expect(router.currentRoute.value.query.lotId).toBe('WET-LOT-02');
    const wetStore = useWetAutoStore(pinia);
    const saved = wetStore.consumeSessionState();
    expect(saved).toMatchObject({
      machineInput: 'WET-EQP-01',
      frontInput: 'WET-LOT-01',
      rearInput: 'WET-LOT-02',
      recipe: 'RCP-WET-01',
      frontLotEnabled: true,
      frontCommentEnabled: true,
    });

    await router.back();
    await flushPromises();
    await wrapper.get('[aria-label="REAR EEN"]').trigger('click');
    await flushPromises();

    expect(router.currentRoute.value.path).toBe('/comment-list');
    expect(router.currentRoute.value.query).toMatchObject({
      lotId: 'WET-LOT-01',
      operation: '2100',
      subOperation: '010',
      processStep: 'WET-STEP',
      operSequence: '003',
      operatorId: 'USER-01',
    });
    expect(api.fetchRecipe).toHaveBeenLastCalledWith({
      ISPHOTO: 'N',
      LOTID: 'WET-LOT-02',
      OPERATION: '2100',
      SUBOPERATION: '010',
      PRODUCT: 'PRODUCT-WET (JOB-WET)',
      EQPID: 'WET-EQP-01',
      OPTYPE: 'WET',
      FACILITY: 'FAC-01',
    });

    await router.back();
    await flushPromises();
    await wrapper.get('.wet-auto-cancel').trigger('click');
    await flushPromises();
    expect(useWetAutoStore(pinia).consumeSessionState()).toBeUndefined();
    wrapper.unmount();
  });
});
