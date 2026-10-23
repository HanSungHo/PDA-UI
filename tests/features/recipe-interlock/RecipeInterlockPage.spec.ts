/* eslint vue/one-component-per-file: off -- Test-local component stubs are used to mount the dialog. */
import { mount, type VueWrapper } from '@vue/test-utils';
import RecipeInterlockDialog from 'src/features/recipe-interlock/components/RecipeInterlockDialog.vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, ref } from 'vue';

const { mockUseRecipeInterlock } = vi.hoisted(() => ({
  mockUseRecipeInterlock: vi.fn(),
}));

vi.mock('src/features/recipe-interlock/composables/useRecipeInterlock', () => ({
  useRecipeInterlock: mockUseRecipeInterlock,
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
  },
  emits: ['click'],
  setup(props, { slots, emit }) {
    return () =>
      h(
        'button',
        {
          type: 'button',
          disabled: props.disabled,
          onClick: () => emit('click'),
        },
        slots.default?.(),
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

describe('RecipeInterlockDialog', () => {
  let wrapper: VueWrapper | undefined;

  const defaultState = {
    txtReceiverMACHINEValue: ref('EQP-TEST01'),
    txtReceiverLOTIDValue: ref('LOT-20260601'),
    txtReceiverRemoteRecipeValue: ref('RCP_REMOTE_001'),
    txtReceiverProcessRecipeValue: ref('RCP_PROCESS_999'),
    txtReceiverTIMEValue: ref('2026-06-01 21:37:02.000'),
    isRecipeMismatch: ref(true),
    loading: ref(false),
    errorMessage: ref(''),
    setData: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRecipeInterlock.mockImplementation((_getMessage, finish) => ({
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

  function mountDialog() {
    wrapper = mount(RecipeInterlockDialog, {
      props: { open: true, receiverMessage: '<EVENT_TYPE>RECIPE</EVENT_TYPE>' },
      global: {
        stubs: {
          BaseInput: BaseInputStub,
          BaseButton: BaseButtonStub,
          BaseModal: BaseModalStub,
          QIcon: true,
        },
      },
    });
    return wrapper;
  }

  it('renders dialog title, notice banner, and input labels', () => {
    const wrapper = mountDialog();

    expect(wrapper.find('.recipe-interlock-title').text()).toBe('RECIPE 진행 오류');
    expect(wrapper.find('[data-testid="txt-notice"]').text()).toContain(
      '예약된 Recipe 와 진행되는 Recipe가 다릅니다',
    );
    expect(wrapper.find('.recipe-interlock-container').element.firstElementChild).toBe(
      wrapper.find('[data-testid="txt-notice"]').element.parentElement,
    );

    expect(wrapper.find('[data-testid="txt-receiver-machine-value"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="txt-receiver-lotid-value"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="txt-receiver-remote-recipe-value"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="txt-receiver-process-recipe-value"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="txt-receiver-time-value"]').exists()).toBe(true);
  });

  it('sets the dialog width to the viewport with 10px side margins', () => {
    const wrapper = mountDialog();

    expect(wrapper.findComponent(BaseModalStub).props('width')).toBe('calc(100vw - 20px)');
    expect(wrapper.findComponent(BaseModalStub).props('open')).toBe(true);
  });

  it('applies mismatch class to Process Recipe when isRecipeMismatch is true', () => {
    const wrapper = mountDialog();
    const processRecipeField = wrapper.find('[data-testid="txt-receiver-process-recipe-value"]');
    expect(processRecipeField.classes()).toContain('recipe-interlock-field--mismatch');
  });

  it('calls setData when clicking Ok button', async () => {
    const wrapper = mountDialog();
    const okBtn = wrapper.find('[data-testid="btn-ok"]');
    await okBtn.trigger('click');

    expect(defaultState.setData).toHaveBeenCalledTimes(1);
  });

  it('emits close events when the modal requests closing', async () => {
    const wrapper = mountDialog();
    await wrapper.get('[data-testid="close-modal"]').trigger('click');

    expect(wrapper.emitted('update:open')).toEqual([[false]]);
    expect(wrapper.emitted('confirm')).toHaveLength(1);
  });
});
