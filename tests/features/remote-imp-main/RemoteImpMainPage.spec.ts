import { flushPromises, mount } from '@vue/test-utils';
import { ROUTE } from 'src/constants/routes';
import routes from 'src/router/routes';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { reactive } from 'vue';

const { route, router, useScreen, handlers, parseBarcode } = vi.hoisted(() => ({
  route: { query: {} as Record<string, string> },
  router: { push: vi.fn(), replace: vi.fn() },
  useScreen: vi.fn(),
  parseBarcode: vi.fn(),
  handlers: {
    initDisable: vi.fn(),
    setLotInfo: vi.fn(),
    getMachineInfo: vi.fn(),
    updateMachineName: vi.fn(),
    setCarry: vi.fn(),
    setStkSpinner: vi.fn(),
    selectPort: vi.fn(),
    memorizationRecipe: vi.fn(),
    executeClearPort: vi.fn(),
    executeComment: vi.fn(),
    executeStart: vi.fn(),
  },
}));
vi.mock('vue-router', () => ({ useRoute: () => route, useRouter: () => router }));
vi.mock('pinia', () => ({
  storeToRefs: () => ({ facility: { value: 'FAB-A' }, operatorId: { value: 'OP-A' } }),
}));
vi.mock('src/features/main/stores/main.store', () => ({ useMainStore: () => ({}) }));
vi.mock('src/utils/barcode-style', () => ({
  barcodeStyleEqpId: parseBarcode,
}));
vi.mock('src/features/remote-imp-main/composables/useRemoteImpMain', () => ({
  useRemoteImpMain: useScreen,
}));

import RemoteImpMainPage from 'src/features/remote-imp-main/pages/RemoteImpMainPage.vue';

const InputStub = {
  props: ['label', 'modelValue', 'id'],
  emits: ['update:modelValue', 'keydown'],
  template:
    '<label>{{ label }}<input :id="id" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" @keydown="$emit(\'keydown\', $event)" /></label>',
};
const SelectStub = {
  props: ['label', 'modelValue', 'options'],
  emits: ['update:modelValue'],
  template:
    '<label>{{ label }}<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="item in options" :key="item.value" :value="item.value">{{ item.label }}</option></select></label>',
};
const ButtonStub = {
  props: ['disabled'],
  emits: ['click'],
  template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
};
const CheckboxStub = { props: ['modelValue'], template: '<span>반송</span>' };
const ModalStub = {
  props: ['open'],
  template: '<div v-if="open"><slot /><slot name="footer" /></div>',
};

describe('RemoteImpMainPage', () => {
  let state: ReturnType<typeof reactive<Record<string, unknown>>>;
  beforeEach(() => {
    vi.clearAllMocks();
    parseBarcode.mockReturnValue({ isValid: true, parsedId: 'IMP-1' });
    route.query = { LOTID: 'LOT-1', EQPID: 'IMP-1' };
    state = reactive({
      lotId: 'LOT-1',
      machineName: 'IMP-1',
      machineState: 'READY',
      standardMachine: 'FAB1',
      recipe: 'RCP-A',
      port: '1',
      recipeList: ['RCP-A'],
      portList: ['1'],
      bayList: [],
      stkList: [],
      bay: '',
      stk: '',
      carry: false,
      carryEnabled: true,
      machineDisabled: false,
      recipeDisabled: false,
      portDisabled: false,
      startEnabled: true,
      clearPortEnabled: false,
      commentEnabled: true,
      jobCode: 'JOB-1',
      product: 'PRODUCT-A',
      currentOperation: 'STEP(20000)',
      qty: '25',
      engineer: 'ENG',
      customer: 'CUSTOMER-A',
      saleType: 'SALE',
      facility: 'FAB-A',
      packing: 'PACKING-A',
      goodChips: '100',
      starting: false,
      commentCount: '2',
    });
    useScreen.mockReturnValue({ state, ...handlers });
  });

  function createPage() {
    return mount(RemoteImpMainPage, {
      global: {
        stubs: {
          BaseInput: InputStub,
          BaseDropdownList: SelectStub,
          BaseButton: ButtonStub,
          BaseCheckbox: CheckboxStub,
          BaseModal: ModalStub,
        },
      },
    });
  }

  it('registers Remote IMP Main as the IMP automation route', () => {
    const route = routes.find((item) => item.path === `/${ROUTE.remoteImpMain}`);
    expect(String(route?.component)).toContain('remote-imp-main/pages/RemoteImpMainPage.vue');
  });

  it('loads the route context and renders the designed fields and actions', async () => {
    const wrapper = createPage();
    await flushPromises();
    expect(handlers.initDisable).toHaveBeenCalledOnce();
    expect(handlers.setLotInfo).toHaveBeenCalledWith('LOT-1');
    expect(handlers.getMachineInfo).toHaveBeenCalledWith('IMP-1');
    expect(wrapper.text()).toContain('진행 장비 선택');
    expect(wrapper.text()).toContain('JOB CODE');
    expect(wrapper.findAll('.remote-imp-card')).toHaveLength(4);
    expect(wrapper.findAll('.remote-imp-product input')).toHaveLength(10);
  });

  it('shows the product fields of the hifos2 layout in order, including FACILITY and GOOD CHIPS', () => {
    const wrapper = createPage();
    const fields = wrapper
      .findAll('.remote-imp-product label')
      .map((label) => [label.text(), label.get<HTMLInputElement>('input').element.value]);
    expect(fields).toEqual([
      ['JOB CODE', 'JOB-1'],
      ['제품명', 'PRODUCT-A'],
      ['현재공정', 'STEP(20000)'],
      ['수량', '25'],
      ['FACILITY', 'FAB-A'],
      ['CUSTOMER', 'CUSTOMER-A'],
      ['SALE TYPE', 'SALE'],
      ["담당 Eng'r", 'ENG'],
      ['PACKING', 'PACKING-A'],
      ['GOOD CHIPS', '100'],
    ]);
    expect(wrapper.text()).not.toContain('Responsible');
  });

  it('shows the comment count and unit at the start of the input', async () => {
    const wrapper = createPage();
    const count = () =>
      wrapper.get<HTMLInputElement>('.remote-imp-comment-count input').element.value;
    expect(count()).toBe('2개');
    state.commentCount = '';
    await wrapper.vm.$nextTick();
    expect(count()).toBe('개');
  });

  it('disables the confirm button while a start request is in progress', async () => {
    const wrapper = createPage();
    const confirmButton = () =>
      wrapper
        .findAll('button')
        .filter((button) => button.text() === '확인')
        .at(0);
    expect(confirmButton()?.attributes('disabled')).toBeUndefined();
    state.starting = true;
    await wrapper.vm.$nextTick();
    expect(confirmButton()?.attributes('disabled')).toBeDefined();
  });

  it('cancels the previous confirm dialog when a new one replaces it', async () => {
    createPage();
    const callbacks = useScreen.mock.calls[0]?.[0] as {
      confirm: (dialog: { title: string; message: string }) => Promise<boolean>;
    };
    const first = callbacks.confirm({ title: 'A', message: 'first' });
    const second = callbacks.confirm({ title: 'B', message: 'second' });
    expect(await first).toBe(false);
    expect(second).toBeInstanceOf(Promise);
  });

  it('wires scanner, port and start actions', async () => {
    const wrapper = createPage();
    await wrapper.get('#remote-imp-machine').trigger('keydown.enter');
    expect(handlers.getMachineInfo).toHaveBeenCalledWith('IMP-1');
    await wrapper.findAll('select')[1]?.setValue('1');
    expect(handlers.selectPort).toHaveBeenCalledWith('1');
    await wrapper
      .findAll('button')
      .find((button) => button.text() === '확인')
      ?.trigger('click');
    expect(handlers.executeStart).toHaveBeenCalledOnce();
  });

  it('shows a warning popup for the missing Batch screen', async () => {
    const wrapper = createPage();
    const batch = wrapper.findAll('button').find((button) => button.text() === '동시진행');
    expect(batch?.attributes('disabled')).toBeUndefined();
    await batch?.trigger('click');
    expect(wrapper.text()).toContain('동시진행 화면은 아직 구현되지 않았습니다.');
    expect(router.push).not.toHaveBeenCalled();
  });

  it('opens the existing Comment List and returns to eSheet on cancel', async () => {
    const wrapper = createPage();
    const callbacks = useScreen.mock.calls[0]?.[0] as {
      onComment: (query: Record<string, string>) => void;
    };
    callbacks.onComment({ lotId: 'LOT-1', operation: '20000' });
    await flushPromises();
    expect(router.replace).toHaveBeenCalledWith({
      path: `/${ROUTE.remoteImpMain}`,
      query: { LOTID: 'LOT-1', EQPID: 'IMP-1' },
    });
    expect(router.push).toHaveBeenCalledWith({
      path: `/${ROUTE.commentList}`,
      query: { lotId: 'LOT-1', operation: '20000' },
    });

    await wrapper
      .findAll('button')
      .find((button) => button.text() === '취소')
      ?.trigger('click');
    expect(router.replace).toHaveBeenCalledWith({
      path: `/${ROUTE.esheet}`,
      query: { lotId: 'LOT-1' },
    });
  });

  it('clears an invalid equipment barcode like the hifos2 scanner handler', async () => {
    parseBarcode.mockReturnValue({ isValid: false, parsedId: '' });
    const wrapper = createPage();
    await flushPromises();
    handlers.getMachineInfo.mockClear();
    await wrapper.get('#remote-imp-machine').trigger('keydown.enter');
    expect(handlers.updateMachineName).toHaveBeenCalledWith('');
    expect(handlers.getMachineInfo).not.toHaveBeenCalled();
  });

  it('memorizes the recipe when it changes', async () => {
    const wrapper = createPage();
    await wrapper.findAll('select')[0]?.setValue('RCP-A');
    expect(state.recipe).toBe('RCP-A');
    expect(handlers.memorizationRecipe).toHaveBeenCalledOnce();
  });

  it('loads the STK list when the BAY changes and stores the selected STK', async () => {
    state.bayList = ['B1'];
    state.stkList = ['S1'];
    const wrapper = createPage();
    await wrapper.findAll('select')[2]?.setValue('B1');
    expect(state.bay).toBe('B1');
    expect(handlers.setStkSpinner).toHaveBeenCalledOnce();
    await wrapper.findAll('select')[3]?.setValue('S1');
    expect(state.stk).toBe('S1');
  });

  it('forwards equipment input and clear port / comment buttons', async () => {
    state.clearPortEnabled = true;
    const wrapper = createPage();
    await wrapper.get('#remote-imp-machine').setValue('IMP-2');
    expect(handlers.updateMachineName).toHaveBeenCalledWith('IMP-2');
    const click = (text: string) =>
      wrapper
        .findAll('button')
        .find((button) => button.text() === text)
        ?.trigger('click');
    await click('초기화');
    expect(handlers.executeClearPort).toHaveBeenCalledOnce();
    await click('읽기');
    expect(handlers.executeComment).toHaveBeenCalledOnce();
  });

  it('falls back to empty values when a dropdown or input emits null', async () => {
    const wrapper = createPage();
    const dropdowns = wrapper.findAllComponents(SelectStub);
    expect(dropdowns).toHaveLength(4);
    dropdowns.forEach((dropdown) => dropdown.vm.$emit('update:modelValue', null));
    expect(state.recipe).toBe('');
    expect(handlers.selectPort).toHaveBeenCalledWith('');
    expect(state.bay).toBe('');
    expect(state.stk).toBe('');
    wrapper.findAllComponents(InputStub)[3]?.vm.$emit('update:modelValue', null);
    expect(handlers.updateMachineName).toHaveBeenCalledWith('');
  });

  it('passes Null placeholders to base controls when the screen has no data', () => {
    Object.assign(state, {
      lotId: '',
      machineState: '',
      standardMachine: '',
      recipe: '',
      port: '',
      stk: '',
      commentCount: '',
      jobCode: '',
    });
    const wrapper = createPage();
    expect(
      wrapper.findAllComponents(SelectStub).map((control) => control.props('modelValue')),
    ).toEqual(['Null', 'Null', 'Null', 'Null']);
    expect(wrapper.get<HTMLInputElement>('.remote-imp-comment-count input').element.value).toBe(
      '개',
    );
  });

  it('closes an alert dialog with the confirm button', async () => {
    const wrapper = createPage();
    await wrapper
      .findAll('button')
      .find((button) => button.text() === '동시진행')
      ?.trigger('click');
    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
    await wrapper
      .findAll('button')
      .filter((button) => button.text() === '확인')
      .at(-1)
      ?.trigger('click');
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
  });

  it.each([
    ['확인', true],
    ['취소', false],
  ])('resolves the confirm dialog with the %s button', async (label, expected) => {
    const wrapper = createPage();
    const callbacks = useScreen.mock.calls[0]?.[0] as {
      confirm: (dialog: { title: string; message: string }) => Promise<boolean>;
    };
    const answer = callbacks.confirm({ title: 'RECIPE 확인', message: 'RCP-A' });
    await flushPromises();
    expect(wrapper.find('.remote-imp-dialog-message').text()).toBe('RCP-A');
    await wrapper
      .findAll('button')
      .filter((button) => button.text() === label)
      .at(-1)
      ?.trigger('click');
    expect(await answer).toBe(expected);
    expect(wrapper.find('.remote-imp-dialog-message').exists()).toBe(false);
  });

  it('shows alerts pushed by the screen logic', async () => {
    const wrapper = createPage();
    const callbacks = useScreen.mock.calls[0]?.[0] as {
      alert: (dialog: { title: string; message: string }) => void;
    };
    callbacks.alert({ title: '오류', message: 'something failed' });
    await flushPromises();
    expect(wrapper.text()).toContain('something failed');
  });

  it('returns to eSheet when the screen completes', () => {
    createPage();
    const callbacks = useScreen.mock.calls[0]?.[0] as { onComplete: () => void };
    callbacks.onComplete();
    expect(router.replace).toHaveBeenCalledWith({
      path: `/${ROUTE.esheet}`,
      query: { lotId: 'LOT-1' },
    });
  });

  it('reads the first value of array query params', async () => {
    (route as { query: Record<string, unknown> }).query = { LOTID: ['LOT-9'], EQPID: [] };
    createPage();
    await flushPromises();
    expect(handlers.setLotInfo).toHaveBeenCalledWith('LOT-9');
    expect(handlers.getMachineInfo).not.toHaveBeenCalled();
  });

  it('skips lookups without query params or when the machine is disabled', async () => {
    route.query = {};
    createPage();
    await flushPromises();
    expect(handlers.setLotInfo).not.toHaveBeenCalled();
    expect(handlers.getMachineInfo).not.toHaveBeenCalled();

    route.query = { LOTID: 'LOT-1', EQPID: 'IMP-1' };
    state.machineDisabled = true;
    createPage();
    await flushPromises();
    expect(handlers.getMachineInfo).not.toHaveBeenCalled();
  });
});
