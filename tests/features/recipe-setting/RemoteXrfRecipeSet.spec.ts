/* eslint-disable vue/one-component-per-file */

import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';

import { useRemoteXrfRecipe } from '~/features/recipe-setting/composables/useRemoteXrfRecipeSet';
import RemoteXrfRecipeSet from '~/features/recipe-setting/pages/RemoteXrfRecipeSet.vue';
import type { RemoteXrfRecipeResult } from '~/features/recipe-setting/types/remote-xrf-recipe-set.types';

vi.mock('~/features/recipe-setting/composables/useRemoteXrfRecipeSet', () => ({
  useRemoteXrfRecipe: vi.fn(),
}));

vi.mock('~/components/base', async () => {
  const { defineComponent, h } = await import('vue');

  const BaseButton = defineComponent({
    name: 'BaseButton',

    props: {
      label: { type: String, default: '' },
      variant: { type: String, default: '' },
      size: { type: String, default: '' },
    },

    emits: ['click'],

    setup(props, { emit }) {
      return () => h('button', { type: 'button', onClick: () => emit('click') }, props.label);
    },
  });

  const BaseScreen = defineComponent({
    name: 'BaseScreen',

    props: { title: { type: String, default: '' } },

    setup(props, { slots }) {
      return () =>
        h('section', [
          h('h1', props.title),
          h('div', slots.default?.()),
          h('footer', slots.footer?.()),
        ]);
    },
  });

  const BaseModal = defineComponent({
    name: 'BaseModal',

    props: {
      open: { type: Boolean, default: false },
      title: { type: String, default: '' },
    },

    emits: ['update:open'],

    setup(props, { slots }) {
      return () =>
        props.open
          ? h('div', { class: 'modal-stub' }, [
              h('h2', props.title),
              slots.default?.(),
              slots.footer?.(),
            ])
          : null;
    },
  });

  return { BaseButton, BaseScreen, BaseModal };
});

vi.mock('~/components/base/input/BaseInput.vue', async () => {
  const { defineComponent, h, ref } = await import('vue');

  return {
    default: defineComponent({
      name: 'BaseInput',

      props: {
        modelValue: { type: [String, Number], default: '' },
        label: { type: String, default: '' },
        readonly: Boolean,
      },

      emits: ['update:modelValue'],

      setup(props, { emit, expose }) {
        const inputRef = ref<HTMLInputElement | null>(null);

        // Mirrors BaseInput's real defineExpose({ focus, select }) so pages that
        // drive focus via a template ref can be tested against document.activeElement.
        expose({
          focus: () => inputRef.value?.focus(),
          select: () => inputRef.value?.select(),
        });

        return () =>
          h('input', {
            ref: inputRef,
            value: props.modelValue,
            readonly: props.readonly,
            'aria-label': props.label,
            onInput: (event: Event) =>
              emit('update:modelValue', (event.target as HTMLInputElement).value),
          });
      },
    }),
  };
});

vi.mock('~/components/base/dropdown-list/BaseDropdownList.vue', async () => {
  const { defineComponent, h } = await import('vue');

  return {
    default: defineComponent({
      name: 'BaseDropdownList',

      props: {
        modelValue: { type: [String, Number], default: '' },
        label: { type: String, default: '' },
        options: { type: Array, default: () => [] },
      },

      emits: ['update:modelValue'],

      setup(props) {
        return () =>
          h(
            'select',
            { value: props.modelValue, 'aria-label': props.label },
            (props.options as { label: string; value: string }[]).map((option) =>
              h('option', { value: option.value }, option.label),
            ),
          );
      },
    }),
  };
});

function createMockComposable() {
  return {
    Item: ref('ITEM_VAL'),
    eqpId: ref('EQP_VAL'),
    category: ref('CAT_VAL'),
    sample: ref('SAMPLE_VAL'),
    para: ref('PARA_VAL'),
    txtSlot: ref('SLOT_VAL'),
    txtRecipe: ref('RECIPE_VAL'),
    txtThick: ref('100'),
    linearThick: ref(false),
    spinnerItemOptions: ref([{ label: 'ITEM_VAL', value: 'ITEM_VAL' }]),
    spinnerProdeqpOptions: ref([{ label: 'EQP_VAL', value: 'EQP_VAL' }]),
    spinnerCategoryOptions: ref([{ label: 'CAT_VAL', value: 'CAT_VAL' }]),
    spinnerMdsOptions: ref([{ label: 'SAMPLE_VAL', value: 'SAMPLE_VAL' }]),
    spinnerParaOptions: ref([{ label: 'PARA_VAL', value: 'PARA_VAL' }]),
    dialog: ref({
      open: false,
      title: 'Error',
      message: 'Something went wrong',
      buttonText: 'OK',
    }),
    closeDialog: vi.fn(),
    itemSelectedListener: vi.fn(),
    onSingleClickListener: vi.fn(),
  };
}

describe('RemoteXrfRecipeSet.vue', () => {
  let mockComposable: ReturnType<typeof createMockComposable>;
  let capturedCallback: ((result: RemoteXrfRecipeResult) => void) | undefined;
  let capturedFocusSlot: (() => void) | undefined;

  beforeEach(() => {
    vi.clearAllMocks();

    mockComposable = createMockComposable();

    vi.mocked(useRemoteXrfRecipe).mockImplementation((onResult, focusSlot) => {
      capturedCallback = onResult;
      capturedFocusSlot = focusSlot;

      return mockComposable as unknown as ReturnType<typeof useRemoteXrfRecipe>;
    });
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  function createWrapper() {
    return mount(RemoteXrfRecipeSet, { attachTo: document.body });
  }

  it('renders the screen title and Android copy parity labels', () => {
    const wrapper = createWrapper();

    expect(wrapper.find('h1').text()).toBe('Recipe Setting');

    const labels = wrapper.findAll('[aria-label]').map((el) => el.attributes('aria-label'));

    expect(labels).toEqual(
      expect.arrayContaining([
        'SLOT',
        'ITEM',
        '생산장비',
        'Category',
        'SAMPLE',
        'Para',
        'RECIPE',
        'THICK',
      ]),
    );
  });

  it('should render all inputs and buttons', () => {
    const wrapper = createWrapper();

    [
      '#txt_slot',
      '#spinner_item',
      '#spinner_prodeqp',
      '#spinner_category',
      '#spinner_mds',
      '#spinner_para',
      '#txt_recipe',
      '#btn_save',
      '#btn_cancel',
    ].forEach((selector) => {
      expect(wrapper.find(selector).exists(), selector).toBe(true);
    });

    expect(wrapper.find('#btn_save').text()).toBe('등록');
    expect(wrapper.find('#btn_cancel').text()).toBe('취소');
  });

  it('renders the action buttons in the BaseScreen footer', () => {
    const wrapper = createWrapper();

    const footer = wrapper.find('footer');

    expect(footer.find('#btn_save').exists()).toBe(true);
    expect(footer.find('#btn_cancel').exists()).toBe(true);
  });

  it('binds composable state to the fields', () => {
    const wrapper = createWrapper();

    expect((wrapper.find('#txt_slot').element as HTMLInputElement).value).toBe('SLOT_VAL');
    expect((wrapper.find('#txt_recipe').element as HTMLInputElement).value).toBe('RECIPE_VAL');
    expect(wrapper.find('#txt_recipe').attributes('readonly')).toBeUndefined();
    expect((wrapper.find('#spinner_item').element as HTMLSelectElement).value).toBe('ITEM_VAL');
  });

  it('updates txtSlot and txtThick when the inputs emit update:modelValue', async () => {
    const wrapper = createWrapper();

    await wrapper.find('#txt_slot').setValue('NEW_SLOT');
    expect(mockComposable.txtSlot.value).toBe('NEW_SLOT');

    await wrapper.find('#linear_thick').setValue('250');
    expect(mockComposable.txtThick.value).toBe('250');
  });

  it('should call itemSelectedListener when dropdown emits update:modelValue', () => {
    const wrapper = createWrapper();

    const cases: [string, string][] = [
      ['spinner_item', 'NEW_ITEM'],
      ['spinner_prodeqp', 'NEW_EQP'],
      ['spinner_category', 'NEW_CAT'],
      ['spinner_mds', 'NEW_SMP'],
      ['spinner_para', 'NEW_PARA'],
    ];

    const dropdowns = wrapper.findAllComponents({ name: 'BaseDropdownList' });

    expect(dropdowns).toHaveLength(cases.length);

    cases.forEach(([parentId, value], index) => {
      dropdowns[index]!.vm.$emit('update:modelValue', value);

      expect(mockComposable.itemSelectedListener).toHaveBeenCalledWith(parentId, value);
    });
  });

  it('passes an empty string to itemSelectedListener when the dropdown is cleared', () => {
    const wrapper = createWrapper();

    wrapper.findComponent({ name: 'BaseDropdownList' }).vm.$emit('update:modelValue', undefined);

    expect(mockComposable.itemSelectedListener).toHaveBeenCalledWith('spinner_item', '');
  });

  it('should toggle linear_thick visibility based on linearThick ref', async () => {
    const wrapper = createWrapper();

    expect(wrapper.find('#linear_thick').attributes('style')).toContain('display: none');

    mockComposable.linearThick.value = true;
    await wrapper.vm.$nextTick();

    expect(wrapper.find('#linear_thick').attributes('style') || '').not.toContain('display: none');
  });

  it('should trigger onSingleClickListener on button clicks', async () => {
    const wrapper = createWrapper();

    await wrapper.find('#btn_save').trigger('click');
    expect(mockComposable.onSingleClickListener).toHaveBeenCalledWith('btn_save');

    await wrapper.find('#btn_cancel').trigger('click');
    expect(mockComposable.onSingleClickListener).toHaveBeenCalledWith('btn_cancel');
  });

  it('does not render the dialog while dialog.open is false', () => {
    const wrapper = createWrapper();

    expect(wrapper.find('.modal-stub').exists()).toBe(false);
  });

  it('renders the dialog title, message and button text when open', () => {
    mockComposable.dialog.value.open = true;

    const wrapper = createWrapper();
    const modal = wrapper.find('.modal-stub');

    expect(modal.exists()).toBe(true);
    expect(modal.find('h2').text()).toBe('Error');
    expect(modal.find('p').text()).toBe('Something went wrong');
    expect(modal.find('button').text()).toBe('OK');
  });

  it('should invoke closeDialog when modal close button is clicked', async () => {
    mockComposable.dialog.value.open = true;

    const wrapper = createWrapper();

    await wrapper.find('.modal-stub button').trigger('click');

    expect(mockComposable.closeDialog).toHaveBeenCalled();
  });

  it('should invoke closeDialog when the modal emits update:open', () => {
    mockComposable.dialog.value.open = true;

    const wrapper = createWrapper();

    wrapper.findComponent({ name: 'BaseModal' }).vm.$emit('update:open', false);

    expect(mockComposable.closeDialog).toHaveBeenCalled();
  });

  it('should emit result event when composable callback is executed', () => {
    const wrapper = createWrapper();

    const mockPayload: RemoteXrfRecipeResult = {
      ITEM: 'ITEM',
      PRODEQP: 'EQP',
      CATEGORY: 'CAT',
      SAMPLE: 'SMP',
      PARA: 'PARA',
      RECIPE: 'REC',
      SLOT: 'SLOT',
      THICK: 'THICK',
    };

    expect(capturedCallback).toBeDefined();

    capturedCallback!(mockPayload);

    expect(wrapper.emitted('result')).toBeTruthy();
    expect(wrapper.emitted('result')![0]).toEqual([mockPayload]);
  });

  it('should focus and select the SLOT input when the composable invokes focusSlot', async () => {
    createWrapper();

    expect(capturedFocusSlot).toBeDefined();
    expect(document.activeElement?.id).not.toBe('txt_slot');

    capturedFocusSlot!();
    await flushPromises();

    const slotInput = document.getElementById('txt_slot') as HTMLInputElement;
    expect(document.activeElement).toBe(slotInput);
    expect(slotInput.selectionStart).toBe(0);
    expect(slotInput.selectionEnd).toBe(slotInput.value.length);
  });
});
