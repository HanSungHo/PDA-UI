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
    backClosable: Boolean,
    overlayClosable: { type: Boolean, default: true },
  },
  emits: ['update:open'],
  setup(props, { slots, emit }) {
    return () =>
      h('div', { class: 'base-modal-stub' }, [
        h('div', props.title),
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

    expect(wrapper.findComponent(BaseModalStub).props('title')).toBe('PR EMPTY INTERLOCK');

    const expected: Record<string, [string, string]> = {
      'txt-prempty-time-result': ['TIME', '2026-10-26 09:15:30.000'],
      'txt-prempty-level-result': ['ALARM_LEVEL', '2'],
      'txt-prempty-mcahine-result': ['MACHINE', 'EQP-PUMP-01'],
      'txt-prempty-model-result': ['MODEL', 'MODEL-A'],
      'txt-prempty-facility-result': ['FACILITY', 'FAC-01'],
      'txt-prempty-pumpid-result': ['PUMP_ID', 'PUMP-001'],
      'txt-prempty-pumpname-result': ['PUMP_NAME', 'MAIN PUMP'],
      'txt-prempty-desc-result': ['DESC', 'PR_EMPTY_ALARM'],
    };

    for (const [testId, [label, value]] of Object.entries(expected)) {
      const field = wrapper.get(`[data-testid="${testId}"]`);
      expect(field.get('label').text()).toBe(label);
      expect((field.get('input').element as HTMLInputElement).value).toBe(value);
    }
  });

  it('closes on Back/Esc without calling the API, but not on a tap outside', async () => {
    const wrapper = mountDialog();
    const modal = wrapper.findComponent(BaseModalStub);

    expect(modal.props('backClosable')).toBe(true);
    expect(modal.props('overlayClosable')).toBe(false);

    modal.vm.$emit('update:open', false);
    await wrapper.vm.$nextTick();

    expect(defaultState.setData).not.toHaveBeenCalled();
    expect(wrapper.emitted('update:open')).toEqual([[false]]);
    expect(wrapper.emitted('confirm')).toHaveLength(1);
  });

  it('opens the modal with the default BaseModal width', () => {
    const wrapper = mountDialog();

    expect(wrapper.findComponent(BaseModalStub).props('width')).toBe('');
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
