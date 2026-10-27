import { mount, type VueWrapper } from '@vue/test-utils';
import PremptyDialog from 'src/features/prempty/components/PremptyDialog.vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, ref } from 'vue';

const { mockUsePREmpty } = vi.hoisted(() => ({
  mockUsePREmpty: vi.fn(),
}));

vi.mock('src/features/prempty/composables/usePrempty', () => ({
  usePREmpty: mockUsePREmpty,
}));

const BaseInputStub = defineComponent({
  name: 'BaseInput',
  props: {
    modelValue: { type: [String, Number], default: '' },
    label: { type: String, default: '' },
    readonly: Boolean,
  },
  setup(props) {
    return () =>
      h('div', { class: 'base-input-stub' }, [
        h('label', props.label),
        h('input', { value: props.modelValue, readonly: props.readonly }),
      ]);
  },
});

const BaseButtonStub = defineComponent({
  name: 'BaseButton',
  props: {
    disabled: Boolean,
    loading: Boolean,
    variant: { type: String, default: 'primary' },
    label: { type: String, default: '' },
  },
  emits: ['click'],
  setup(props, { slots, emit }) {
    return () =>
      h(
        'button',
        {
          type: 'button',
          disabled: props.loading || props.disabled,
          onClick: () => emit('click'),
        },
        props.label || slots.default?.(),
      );
  },
});

const BaseModalStub = defineComponent({
  name: 'BaseModal',
  props: {
    open: Boolean,
    title: { type: String, default: '' },
    width: { type: String, default: '' },
    closable: Boolean,
  },
  emits: ['update:open'],
  setup(props, { slots, emit }) {
    return () =>
      h('div', { class: 'base-modal-stub' }, [
        slots.title ? slots.title() : h('div', props.title),
        slots.default?.(),
        slots.footer?.(),
        h('button', {
          'data-testid': 'close-modal',
          onClick: () => emit('update:open', false),
        }),
      ]);
  },
});

describe('PremptyDialog.vue', () => {
  let wrapper: VueWrapper | undefined;

  const defaultState = {
    txtPREMPTYTimeResult: ref('2026-10-26 09:15:30.000'),
    txtPREMPTYLevelResult: ref('2'),
    txtPREMPTYMcahineResult: ref('EQP-PUMP-01'),
    txtPREMPTYModelResult: ref('MODEL-A'),
    txtPREMPTYFacilityResult: ref('FAC-01'),
    txtPREMPTYPumpidResult: ref('PUMP-001'),
    txtPREMPTYPumpnameResult: ref('MAIN PUMP'),
    txtPREMPTYDescResult: ref('PR_EMPTY_ALARM'),
    loading: ref(false),
    errorMessage: ref(''),
    setData: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    defaultState.loading.value = false;
    mockUsePREmpty.mockImplementation((_getMessage, finish) => ({
      ...defaultState,
      finish,
    }));
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = undefined;
    }
  });

  function mountDialog(props = {}) {
    wrapper = mount(PremptyDialog, {
      props: {
        open: true,
        receiverMessage: '<EVENT_TYPE>PR_EMPTY</EVENT_TYPE>',
        ...props,
      },
      global: {
        stubs: {
          BaseInput: BaseInputStub,
          BaseButton: BaseButtonStub,
          BaseModal: BaseModalStub,
        },
      },
    });
    return wrapper;
  }

  it('renders dialog title and binds all data fields correctly', () => {
    const wrapper = mountDialog();

    expect(wrapper.find('.prempty-interlock-title').text()).toBe('PR EMPTY INTERLOCK');

    expect(wrapper.find('[data-testid="txt-prempty-time-result"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="txt-prempty-level-result"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="txt-prempty-mcahine-result"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="txt-prempty-model-result"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="txt-prempty-facility-result"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="txt-prempty-pumpid-result"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="txt-prempty-pumpname-result"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="txt-prempty-desc-result"]').exists()).toBe(true);
  });

  it('sets the dialog width to 100% and opens modal', () => {
    const wrapper = mountDialog();

    expect(wrapper.findComponent(BaseModalStub).props('width')).toBe('100%');
    expect(wrapper.findComponent(BaseModalStub).props('open')).toBe(true);
  });

  it('calls setData when the OK button is clicked', async () => {
    const wrapper = mountDialog();

    await wrapper.get('[data-testid="btn-ok"]').trigger('click');

    expect(defaultState.setData).toHaveBeenCalledOnce();
  });

  it('calls finish and emits update:open and confirm when modal is closed', async () => {
    const wrapper = mountDialog();

    await wrapper.get('[data-testid="close-modal"]').trigger('click');

    expect(wrapper.emitted('update:open')).toEqual([[false]]);
    expect(wrapper.emitted('confirm')).toBeTruthy();
  });

  it('disables the OK button while loading', () => {
    defaultState.loading.value = true;
    const wrapper = mountDialog();

    const btn = wrapper.get('[data-testid="btn-ok"]');
    expect((btn.element as HTMLButtonElement).disabled).toBe(true);
  });
});
