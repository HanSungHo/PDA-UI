import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, ref } from 'vue';

const { useSampleReleaseMock } = vi.hoisted(() => ({
  useSampleReleaseMock: vi.fn(),
}));

vi.mock('src/features/sample-release/composables/use-sample-release', () => ({
  useSampleRelease: useSampleReleaseMock,
}));

import SampleReleasePage from 'src/features/sample-release/pages/SampleReleasePage.vue';

const BaseScreenStub = defineComponent({
  name: 'BaseScreen',
  setup(_, { slots }) {
    return () => h('div', { 'data-testid': 'base-screen' }, [slots.default?.(), slots.footer?.()]);
  },
});

const BaseInputStub = defineComponent({
  name: 'BaseInput',
  inheritAttrs: false,
  props: {
    modelValue: { type: [String, Number], default: '' },
    label: { type: String, default: '' },
    disabled: Boolean,
    readonly: Boolean,
    mode: { type: String, default: 'input' },
    rows: { type: Number, default: undefined },
  },
  emits: ['update:modelValue'],
  setup(props, { attrs, emit, slots }) {
    return () =>
      h('label', attrs, [
        h('span', props.label),
        h(props.mode === 'textarea' ? 'textarea' : 'input', {
          value: props.modelValue,
          disabled: props.disabled,
          readonly: props.readonly,
          rows: props.rows,
          onInput: (event: Event) =>
            emit('update:modelValue', (event.target as HTMLInputElement).value),
        }),
        slots.append?.(),
      ]);
  },
});

const BaseButtonStub = defineComponent({
  name: 'BaseButton',
  props: {
    label: { type: String, default: '' },
    disabled: Boolean,
    loading: Boolean,
  },
  emits: ['click'],
  setup(props, { emit }) {
    return () =>
      h(
        'button',
        { type: 'button', disabled: props.disabled, onClick: () => emit('click') },
        props.label,
      );
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
            slots.default?.(),
            slots.footer?.(),
          ])
        : null;
  },
});

function createSampleReleaseState() {
  return {
    editLotNo: ref('LOT-001'),
    txtReleaseProduct: ref('PRODUCT-01'),
    txtReleaseRoute: ref('ROUTE-01'),
    txtReleaseProcessname: ref('OP-100'),
    txtReleaseMachinename: ref('MACHINE-01'),
    txtSampleLotname: ref('SAMPLE-001'),
    txtSampleQty: ref('5'),
    txtSampleProduct: ref('PRODUCT-01'),
    txtSampleProcessname: ref('OP-100'),
    txtSampleProcessnamedesc: ref('Sample operation'),
    txtSampleRoute: ref('ROUTE-01'),
    txtMainLotname: ref('MAIN-001'),
    txtMainQty: ref('20'),
    txtMainProduct: ref('PRODUCT-01'),
    txtMainRoute: ref('ROUTE-01'),
    txtMainProcessname: ref('OP-100'),
    txtMainProcessdesc: ref('Main operation'),
    txtMainComment: ref('Release comment'),
    isExecutionEnabled: ref(true),
    loading: ref(false),
    dialogOpen: ref(false),
    dialogTitle: ref(''),
    dialogMessage: ref(''),
    closeDialog: vi.fn(),
    searchData: vi.fn(),
    onLotNoInput: vi.fn(),
    onLotNoEnter: vi.fn(),
    execution: vi.fn(),
    onClose: vi.fn(),
  };
}

function mountSampleReleasePage() {
  return mount(SampleReleasePage, {
    global: {
      stubs: {
        BaseButton: BaseButtonStub,
        BaseInput: BaseInputStub,
        BaseModal: BaseModalStub,
        BaseScreen: BaseScreenStub,
        QIcon: true,
      },
    },
  });
}

describe('SampleReleasePage', () => {
  let state: ReturnType<typeof createSampleReleaseState>;

  beforeEach(() => {
    state = createSampleReleaseState();
    useSampleReleaseMock.mockReturnValue(state);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders the sample release sections and returned lot data', () => {
    const wrapper = mountSampleReleasePage();

    expect(wrapper.findAll('h2').map((heading) => heading.text())).toEqual([
      'SAMPLE RELEASE 공정정보',
      'SAMPLE LOT정보',
      'MAIN LOT 정보',
    ]);
    const inputValues = wrapper.findAll('input').map((input) => input.element.value);
    expect(inputValues).toContain('PRODUCT-01');
    expect(inputValues).toContain('SAMPLE-001');
    expect(inputValues).toContain('MAIN-001');
    expect(wrapper.find('textarea').element.value).toBe('Release comment');
  });

  it('updates the lot input and searches with its current value', async () => {
    const wrapper = mountSampleReleasePage();
    const lotInput = wrapper.get('input');

    await lotInput.setValue('LOT-002');
    await wrapper.get('button').trigger('click');

    expect(state.onLotNoInput).toHaveBeenCalledWith('LOT-002');
    expect(state.searchData).toHaveBeenCalledWith('LOT-002');
  });

  it('forwards Enter on the lot input to the barcode handler', async () => {
    const wrapper = mountSampleReleasePage();

    await wrapper.get('input').trigger('keyup.enter');

    expect(state.onLotNoEnter).toHaveBeenCalledTimes(1);
  });

  it('reflects execution availability and loading state in the action buttons', async () => {
    state.isExecutionEnabled.value = false;
    const wrapper = mountSampleReleasePage();
    const buttons = wrapper.findAll('button');
    const executeButton = buttons.find((button) => button.text() === '실행');
    const closeButton = buttons.find((button) => button.text() === '닫기');

    expect(executeButton?.attributes('disabled')).toBeDefined();
    expect(closeButton?.attributes('disabled')).toBeUndefined();

    state.isExecutionEnabled.value = true;
    state.loading.value = true;
    await wrapper.vm.$nextTick();

    expect(executeButton?.attributes('disabled')).toBeDefined();
    expect(closeButton?.attributes('disabled')).toBeDefined();
  });

  it('calls execution and close handlers from the footer actions', async () => {
    const wrapper = mountSampleReleasePage();
    const buttons = wrapper.findAll('button');

    await buttons.find((button) => button.text() === '실행')?.trigger('click');
    await buttons.find((button) => button.text() === '닫기')?.trigger('click');

    expect(state.execution).toHaveBeenCalledTimes(1);
    expect(state.onClose).toHaveBeenCalledTimes(1);
  });

  it('shows dialog content and calls closeDialog from the confirmation action', async () => {
    state.dialogOpen.value = true;
    state.dialogTitle.value = 'ERROR';
    state.dialogMessage.value = 'Invalid lot';
    const wrapper = mountSampleReleasePage();

    expect(wrapper.get('[role="dialog"]').attributes('aria-label')).toBe('ERROR');
    expect(wrapper.get('[role="alert"]').text()).toBe('Invalid lot');

    await wrapper
      .findAll('button')
      .find((button) => button.text() === '확인')
      ?.trigger('click');

    expect(state.closeDialog).toHaveBeenCalledTimes(1);
  });
});
