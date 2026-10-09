import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { reactive, ref } from 'vue';

const { route, router, mockUseRemoteMachineSelect, handlers } = vi.hoisted(() => ({
  route: { query: {} as Record<string, string> },
  router: { replace: vi.fn() },
  mockUseRemoteMachineSelect: vi.fn(),
  handlers: {
    searchData: vi.fn(),
    setEQPInfo: vi.fn(),
    setPortStatus: vi.fn(),
    execute: vi.fn(),
    dismissDialog: vi.fn(),
    showDialog: vi.fn(),
  },
}));

vi.mock('vue-router', () => ({ useRoute: () => route, useRouter: () => router }));
vi.mock('pinia', () => ({
  storeToRefs: () => ({
    facility: { value: 'FAB-A' },
    operatorId: { value: 'OP-A' },
    operatorName: { value: 'Operator A' },
  }),
}));
vi.mock('src/features/main/stores/main.store', () => ({ useMainStore: () => ({}) }));
vi.mock('src/features/remote-machine-select/composables/useRemoteMachineSelect', () => ({
  useRemoteMachineSelect: mockUseRemoteMachineSelect,
}));

import RemoteMachineSelectPage from 'src/features/remote-machine-select/pages/RemoteMachineSelectPage.vue';
import type {
  RemoteMachineChildFlow,
  RemoteMachineSelectState,
} from 'src/features/remote-machine-select/types/remote-machine-select.types';
import { okDialog } from 'src/services/ok-dialog.service';

const InputStub = {
  props: ['modelValue', 'label', 'placeholder', 'disabled', 'id'],
  emits: ['update:modelValue', 'keydown'],
  template:
    '<label>{{ label }}<input :id="id" :value="modelValue" :placeholder="placeholder" :disabled="disabled" @input="$emit(\'update:modelValue\', $event.target.value)" @keydown="$emit(\'keydown\', $event)" /></label>',
};
const DropdownStub = {
  props: ['modelValue', 'options'],
  emits: ['update:modelValue'],
  template:
    '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option value="">Search</option><option v-for="option in options" :key="option.value" :value="option.value">{{ option.label }}</option></select>',
};
const ButtonStub = {
  props: ['disabled'],
  emits: ['click'],
  template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
};
const ModalStub = {
  props: ['open', 'title'],
  emits: ['afterClose'],
  template: '<section v-if="open"><h2>{{ title }}</h2><slot /><slot name="footer" /></section>',
};

function createState(): RemoteMachineSelectState {
  return reactive({
    lotId: 'WP00001',
    status: 'WAIT',
    product: 'PRODUCT-A',
    jobCode: '',
    currentOper: 'BARC(10000)',
    nextOper: 'NEXT(10001)',
    recipe: '',
    pr: '',
    rework: '',
    hold: 'N',
    qty: '25',
    eqpGroup: 'PHOTO',
    machineSelect: '',
    portList: ['P01', 'P02'],
    selectedPort: '',
    portStatus: '',
    portStatusKind: '',
    machineDisabled: false,
    okDisabled: false,
    refreshDisabled: false,
    loading: false,
    dialogTitle: '',
    dialogMessage: '',
    dialogKind: 'info',
  });
}

describe('RemoteMachineSelectPage', () => {
  let state: RemoteMachineSelectState;
  let confirm: ((title: string, message: string) => Promise<boolean>) | undefined;
  let openChildScreen: ((flow: RemoteMachineChildFlow, lotId: string) => void) | undefined;
  let requestMachineFocus: (() => void) | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    route.query = { LOTID: 'WP00001' };
    state = createState();
    confirm = undefined;
    openChildScreen = undefined;
    requestMachineFocus = undefined;
    mockUseRemoteMachineSelect.mockImplementation(
      (context: {
        confirm: (title: string, message: string) => Promise<boolean>;
        onOpenChildScreen: (flow: RemoteMachineChildFlow, lotId: string) => void;
        onRequestMachineFocus: () => void;
      }) => {
        confirm = context.confirm;
        openChildScreen = context.onOpenChildScreen;
        requestMachineFocus = context.onRequestMachineFocus;
        return { state, statusKind: ref('wait'), ...handlers };
      },
    );
  });

  afterEach(() => {
    okDialog.confirm();
  });

  function createPage(attachTo?: Element) {
    return mount(RemoteMachineSelectPage, {
      attachTo,
      global: {
        stubs: {
          BaseInput: InputStub,
          BaseDropdownList: DropdownStub,
          BaseButton: ButtonStub,
          BaseModal: ModalStub,
          BaseLoading: { template: '<span role="status">Loading</span>' },
        },
      },
    });
  }

  it('loads LOTID and renders the Quasar layout with existing fields and PORT choices', async () => {
    const wrapper = createPage();

    expect(handlers.searchData).toHaveBeenCalledWith('WP00001');
    expect(wrapper.text()).toContain('진행 장비 선택');
    expect(wrapper.findAll('.q-card')).toHaveLength(2);
    expect(wrapper.find('.remote-machine-select__header .q-icon').attributes('class')).toContain(
      'q-icon',
    );
    expect((wrapper.findAll('input')[2].element as HTMLInputElement).value).toBe('PRODUCT-A');
    expect(wrapper.findAll('input')).toHaveLength(13);
    expect((wrapper.findAll('input')[5].element as HTMLInputElement).value).toBe('');
    expect(wrapper.get('#remote-machine-select-machine').attributes('placeholder')).toBeUndefined();
    expect(wrapper.findAll('option').map((option) => option.text())).toEqual([
      'Search',
      'P01',
      'P02',
    ]);

    await wrapper.get('select').setValue('P02');
    expect(state.selectedPort).toBe('P02');
    expect(handlers.setPortStatus).toHaveBeenCalledOnce();
  });

  it.each([
    ['ready', 'WP00001', 'PHOTO01-P01'],
    ['busy', 'WP00001', 'PHOTO01-P02'],
    ['idle', 'WP00001', 'PHOTO01-P03'],
    ['long', 'WP-LARGE', 'PHOTO01-P01'],
    ['run', 'WP-RUN', ''],
    ['hold', 'WP-HOLD', ''],
    ['empty', '', ''],
  ])('preloads the %s mock case without a backend request', async (mockCase, lotId, machine) => {
    route.query = { mock: '1', mockCase };
    state.lotId = lotId;
    const wrapper = createPage();
    await flushPromises();

    expect(mockUseRemoteMachineSelect.mock.calls[0]?.[0]?.lotId).toBe(lotId);
    expect(handlers.searchData).toHaveBeenCalledTimes(lotId ? 1 : 0);
    if (lotId) expect(handlers.searchData).toHaveBeenCalledWith(lotId);
    expect(state.machineSelect).toBe(machine);
    expect(handlers.setEQPInfo).toHaveBeenCalledTimes(machine ? 1 : 0);
    wrapper.unmount();
  });

  it('parses an EQP barcode with the shared utility and reports invalid scans', async () => {
    const wrapper = createPage();
    const machine = wrapper.get('#remote-machine-select-machine');

    await machine.setValue('EQP-PHOTO01-P01X');
    await machine.trigger('keydown.enter');
    expect(state.machineSelect).toBe('PHOTO01-P01');
    expect(handlers.setEQPInfo).toHaveBeenCalledOnce();

    await machine.setValue('bad-code');
    await machine.trigger('keydown.enter');
    expect(state.machineSelect).toBe('');
    expect(okDialog.title.value).toBe('READING ERROR');
    expect(okDialog.message.value).toBe('진행할 장비를 읽어주세요.');

    await machine.setValue('EQP-');
    await machine.trigger('keydown.enter');
    expect(okDialog.message.value).toBe('진행할 장비를 읽어주세요.');
    expect(handlers.setEQPInfo).toHaveBeenCalledOnce();
  });

  it('focuses and selects the machine field after the PORT error dialog closes', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const wrapper = createPage(host);
    const machine = wrapper.get('#remote-machine-select-machine').element as HTMLInputElement;
    state.machineSelect = 'PHOTO01';
    state.dialogMessage = 'PORT 정보를 가져올 수 없습니다.';
    handlers.dismissDialog.mockImplementationOnce(() => {
      state.dialogMessage = '';
    });

    requestMachineFocus?.();
    await wrapper.vm.$nextTick();
    await wrapper.get('.remote-machine-select__dialog-confirm').trigger('click');
    wrapper.findAllComponents(ModalStub)[0]?.vm.$emit('afterClose');
    await wrapper.vm.$nextTick();

    expect(document.activeElement).toBe(machine);
    expect(machine.selectionStart).toBe(0);
    expect(machine.selectionEnd).toBe('PHOTO01'.length);
    wrapper.unmount();
    host.remove();
  });

  it('opens a reusable confirmation modal and resolves accept or cancel', async () => {
    const wrapper = createPage();
    const accepted = confirm?.('확인', '예약하시겠습니까?');
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('예약하시겠습니까?');
    await wrapper.findAll('section').at(-1)?.findAll('button').at(-1)?.trigger('click');
    expect(await accepted).toBe(true);

    const canceled = confirm?.('확인', '다시 확인');
    await wrapper.vm.$nextTick();
    await wrapper.findAll('section').at(-1)?.findAll('button').at(0)?.trigger('click');
    expect(await canceled).toBe(false);
  });

  it('routes back to eSheet and skips a LOT request when no LOTID was provided', async () => {
    route.query = {};
    state.lotId = '';
    const wrapper = createPage();
    expect(handlers.searchData).not.toHaveBeenCalled();

    await wrapper.get('button[aria-label="뒤로"]').trigger('click');
    expect(router.replace).toHaveBeenCalledWith({ path: '/esheet', query: { lotId: '' } });
  });

  it.each([
    ['meas', '/meas-remote'],
    ['imp', '/remote-imp-main'],
    ['cvd', '/remote-cvd'],
  ] as const)('routes the %s flow with LOTID', (flow, path) => {
    createPage();
    openChildScreen?.(flow, 'LOT-A');

    expect(router.replace).toHaveBeenCalledWith({ path, query: { LOTID: 'LOT-A' } });
  });

  it('renders alert and loading states and resolves a pending confirm on unmount', async () => {
    const wrapper = createPage();
    state.dialogTitle = '오류';
    state.dialogMessage = 'PORT 오류';
    state.loading = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('PORT 오류');
    expect(wrapper.text()).toContain('Loading');
    await wrapper.findAll('section').at(-1)?.get('button').trigger('click');
    expect(handlers.dismissDialog).toHaveBeenCalledOnce();

    const pending = confirm?.('확인', '작업할까요?');
    wrapper.unmount();
    expect(await pending).toBe(false);
  });
});
