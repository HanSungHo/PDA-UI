/* eslint-disable vue/one-component-per-file -- Test-local component stubs are used to mount the page. */
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, type PropType, reactive, ref } from 'vue';

interface PageDialog {
  kind: 'alert' | 'confirm';
  title: string;
  message: string;
}

interface PageState {
  editRunBoxNo: string;
  editInitialboxNo: string;
  txtInitialName: string;
  txtLotName: string;
  txtWaferName: string;
  selectedReason: string | undefined;
  reasonOptions: Array<{ label: string; value: string }>;
  reasonEnabled: boolean;
  loading: boolean;
  dialog: PageDialog | null;
}

const mocks = vi.hoisted(() => ({
  useWafercodecheck: vi.fn(),
  handlers: {
    getinitialInfo: vi.fn(),
    getWaferInfo: vi.fn(),
    handleRunEnter: vi.fn(),
    executewf: vi.fn(),
    confirmExecution: vi.fn(),
    acknowledgeDialog: vi.fn(),
    cancelDialog: vi.fn(),
  },
  router: {
    options: { history: { state: { back: null as string | null } } },
    back: vi.fn(),
    replace: vi.fn(),
  },
}));

vi.mock('src/features/wafer-code-check/composables/use-wafer-code-check', () => ({
  useWafercodecheck: mocks.useWafercodecheck,
}));
vi.mock('vue-router', () => ({ useRouter: () => mocks.router }));

import WaferCodeCheckPage from 'src/features/wafer-code-check/pages/WaferCodeCheckPage.vue';

let state: PageState;

const BaseScreenStub = defineComponent({
  name: 'BaseScreen',
  props: {
    title: { type: String, default: '' },
    okDisabled: Boolean,
    okLabel: { type: String, default: '실행' },
    okLoading: Boolean,
    cancelDisabled: Boolean,
    cancelLabel: { type: String, default: '닫기' },
  },
  emits: ['ok', 'cancel'],
  setup(props, { attrs, emit, expose, slots }) {
    const okButton = ref<HTMLButtonElement | null>(null);
    expose({ focusOkButton: () => okButton.value?.focus() });

    return () =>
      h('main', attrs, [
        h('h1', props.title),
        h('div', slots.default?.()),
        h(
          'footer',
          slots.footer?.() ?? [
            h(
              'button',
              {
                ref: okButton,
                class: 'ds-screen__ok',
                disabled: props.okDisabled,
                onClick: () => emit('ok'),
              },
              props.okLabel,
            ),
            h(
              'button',
              {
                class: 'ds-screen__cancel',
                disabled: props.cancelDisabled,
                onClick: () => emit('cancel'),
              },
              props.cancelLabel,
            ),
          ],
        ),
      ]);
  },
});

const BaseInputStub = defineComponent({
  name: 'BaseInput',
  inheritAttrs: false,
  props: {
    label: { type: String, default: '' },
    modelValue: { type: String, default: '' },
    placeholder: { type: String, default: '' },
    disabled: Boolean,
    readonly: Boolean,
    mode: { type: String, default: '' },
    rows: { type: Number, default: undefined },
  },
  emits: ['update:modelValue', 'keydown', 'keyup'],
  setup(props, { attrs, emit, expose, slots }) {
    const control = ref<HTMLInputElement | HTMLTextAreaElement | null>(null);
    expose({
      focus: () => control.value?.focus(),
      select: () => control.value?.select(),
    });

    return () => {
      const controlProps: Record<string, unknown> = {
        ...attrs,
        ref: control,
        placeholder: props.placeholder,
        disabled: props.disabled,
        readonly: props.readonly,
        value: props.modelValue,
        onInput: (event: Event) =>
          emit('update:modelValue', (event.target as HTMLInputElement).value),
        onKeydown: (event: KeyboardEvent) => emit('keydown', event),
        onKeyup: (event: KeyboardEvent) => emit('keyup', event),
      };

      if (props.mode === 'textarea') controlProps.rows = props.rows;

      return h('label', [
        h('span', props.label),
        h(props.mode === 'textarea' ? 'textarea' : 'input', controlProps),
        slots.append?.(),
      ]);
    };
  },
});

const BaseButtonStub = defineComponent({
  name: 'BaseButton',
  inheritAttrs: false,
  props: { disabled: Boolean, loading: Boolean },
  emits: ['click'],
  setup(props, { attrs, emit, slots }) {
    return () =>
      h(
        'button',
        {
          ...attrs,
          type: 'button',
          disabled: props.disabled,
          onClick: (event: MouseEvent) => emit('click', event),
        },
        slots.default?.(),
      );
  },
});

const BaseDropdownListStub = defineComponent({
  name: 'BaseDropdownList',
  inheritAttrs: false,
  props: {
    label: { type: String, default: '' },
    modelValue: { type: String, default: undefined },
    placeholder: { type: String, default: '' },
    options: { type: Array as PropType<{ label: string; value: string }[]>, default: () => [] },
    disabled: Boolean,
  },
  emits: ['update:modelValue'],
  setup(props, { attrs, emit }) {
    return () =>
      h('label', [
        h('span', props.label),
        h(
          'select',
          {
            ...attrs,
            disabled: props.disabled,
            value: props.modelValue ?? '',
            onChange: (event: Event) => {
              const value = (event.target as HTMLSelectElement).value;
              emit('update:modelValue', value || undefined);
            },
          },
          [
            h('option', { value: '' }, props.placeholder),
            ...props.options.map((option) => h('option', { value: option.value }, option.label)),
          ],
        ),
      ]);
  },
});

const BaseModalStub = defineComponent({
  name: 'BaseModal',
  props: {
    open: Boolean,
    title: { type: String, default: '' },
  },
  setup(props, { slots }) {
    return () =>
      props.open
        ? h('section', { role: 'dialog', 'aria-label': props.title }, [
            h('h2', props.title),
            h('div', slots.default?.()),
            h('footer', slots.footer?.()),
          ])
        : null;
  },
});

function createState(): PageState {
  return reactive({
    editRunBoxNo: '',
    editInitialboxNo: '',
    txtInitialName: '',
    txtLotName: '',
    txtWaferName: '',
    selectedReason: undefined,
    reasonOptions: [],
    reasonEnabled: false,
    loading: false,
    dialog: null,
  });
}

function mountPage() {
  return mount(WaferCodeCheckPage, {
    attachTo: document.body,
    global: {
      stubs: {
        BaseScreen: BaseScreenStub,
        BaseInput: BaseInputStub,
        BaseButton: BaseButtonStub,
        BaseDropdownList: BaseDropdownListStub,
        BaseModal: BaseModalStub,
        QIcon: true,
      },
    },
  });
}

enableAutoUnmount(afterEach);

describe('WaferCodeCheckPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state = createState();
    mocks.useWafercodecheck.mockReturnValue({ state, ...mocks.handlers });
    mocks.router.options.history.state.back = null;
  });

  it('uppercases edited inputs and forwards a reason selection to state', async () => {
    state.reasonEnabled = true;
    state.reasonOptions = [{ label: 'NORMAL', value: 'NORMAL' }];
    const wrapper = mountPage();

    await wrapper.get('[data-testid="wafer-code-check-run-search"]').setValue('run-01');
    await wrapper.get('[data-testid="wafer-code-check-initial-search"]').setValue('initial-01');
    await wrapper.get('[data-testid="wafer-code-check-reason"]').setValue('NORMAL');

    expect(state.editRunBoxNo).toBe('RUN-01');
    expect(state.editInitialboxNo).toBe('INITIAL-01');
    expect(state.selectedReason).toBe('NORMAL');
    expect(
      wrapper.get('[data-testid="wafer-code-check-reason"]').attributes('disabled'),
    ).toBeUndefined();
  });

  it('forwards search clicks and focuses the next control after success', async () => {
    mocks.handlers.getinitialInfo.mockReturnValue(true);
    mocks.handlers.getWaferInfo.mockResolvedValue(true);
    const wrapper = mountPage();

    await wrapper.get('[data-testid="wafer-code-check-initial-lookup"]').trigger('click');
    expect(mocks.handlers.getinitialInfo).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(wrapper.get('.ds-screen__ok').element);

    await wrapper.get('[data-testid="wafer-code-check-run-lookup"]').trigger('click');
    await flushPromises();
    expect(mocks.handlers.getWaferInfo).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(
      wrapper.get('[data-testid="wafer-code-check-initial-search"]').element,
    );
  });

  it('routes Enter events through the composable and selects RUN after INITIAL Enter', async () => {
    mocks.handlers.getinitialInfo.mockReturnValue(true);
    mocks.handlers.handleRunEnter.mockResolvedValue(true);
    const wrapper = mountPage();
    const initialInput = wrapper.get('[data-testid="wafer-code-check-initial-search"]');
    const runInput = wrapper.get('[data-testid="wafer-code-check-run-search"]');

    state.editInitialboxNo = 'INITIAL-01';
    state.editRunBoxNo = 'RUN-01';
    await initialInput.trigger('keyup', { key: 'Enter' });
    expect(mocks.handlers.getinitialInfo).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(runInput.element);
    expect((runInput.element as HTMLInputElement).selectionStart).toBe(0);
    expect((runInput.element as HTMLInputElement).selectionEnd).toBe('RUN-01'.length);

    await runInput.trigger('keyup', { key: 'Enter' });
    await flushPromises();
    expect(mocks.handlers.handleRunEnter).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(initialInput.element);
  });

  it('acknowledges alerts and restores the focus target returned by the composable', async () => {
    state.dialog = { kind: 'alert', title: 'ERROR', message: 'RUN NAME을 입력하여 주세요.' };
    mocks.handlers.acknowledgeDialog.mockReturnValue('run');
    const wrapper = mountPage();

    expect(wrapper.get('[role="dialog"]').text()).toContain('RUN NAME을 입력하여 주세요.');
    await wrapper.get('[role="dialog"] footer button').trigger('click');

    expect(mocks.handlers.acknowledgeDialog).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(
      wrapper.get('[data-testid="wafer-code-check-run-search"]').element,
    );
  });

  it('routes confirmation actions to the composable', async () => {
    state.dialog = {
      kind: 'confirm',
      title: 'INFORM',
      message: 'INITIALBOX내용이 확인되지 않습니다.\n진행 하시겠습니까?',
    };
    const wrapper = mountPage();
    const dialogButtons = wrapper.get('[role="dialog"] footer').findAll('button');

    await dialogButtons[0]!.trigger('click');
    expect(mocks.handlers.cancelDialog).toHaveBeenCalledOnce();

    await dialogButtons[1]!.trigger('click');
    expect(mocks.handlers.confirmExecution).toHaveBeenCalledOnce();
  });

  it('uses browser back when available and replaces the main route otherwise', async () => {
    const wrapper = mountPage();
    const closeButton = wrapper.get('.ds-screen__cancel');

    mocks.router.options.history.state.back = '/previous';
    await closeButton.trigger('click');
    expect(mocks.router.back).toHaveBeenCalledOnce();
    expect(mocks.router.replace).not.toHaveBeenCalled();

    mocks.router.options.history.state.back = null;
    await closeButton.trigger('click');
    expect(mocks.router.replace).toHaveBeenCalledWith('/main');
  });
});
