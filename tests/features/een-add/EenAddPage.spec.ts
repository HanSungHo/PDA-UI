import { mount } from '@vue/test-utils';
import { QIcon } from 'quasar';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type Ref, ref } from 'vue';

const { handlers, mockUseEenAdd } = vi.hoisted(() => ({
  handlers: {
    loadOperations: vi.fn(),
    addWaferNumber: vi.fn(),
    onTagChange: vi.fn(),
    submit: vi.fn(),
    confirmSubmit: vi.fn(),
    cancel: vi.fn(),
    closeDialog: vi.fn(),
    cancelDialog: vi.fn(),
  },
  mockUseEenAdd: vi.fn(),
}));

vi.mock('src/features/een-add/composables/use-een-add', () => ({
  useEenAdd: mockUseEenAdd,
}));

import EenAddPage from 'src/features/een-add/pages/EenAddPage.vue';

const InputStub = {
  props: ['modelValue', 'label', 'placeholder', 'readonly', 'ariaLabel', 'mode'],
  emits: ['update:modelValue'],
  template:
    '<label>{{ label }}<input :placeholder="placeholder" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" /></label>',
};
const SelectStub = {
  props: ['modelValue', 'label', 'options'],
  emits: ['update:modelValue'],
  template:
    '<label>{{ label }}<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="option in options" :key="option.value" :value="option.value">{{ option.label }}</option></select><slot name="append" /></label>',
};
const ButtonStub = {
  props: ['htmlType', 'disabled', 'loading', 'ariaLabel'],
  emits: ['click'],
  template:
    '<button :type="htmlType || \'button\'" :aria-label="ariaLabel" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
};
const ModalStub = {
  props: ['open', 'title'],
  emits: ['cancel'],
  template: '<section v-if="open"><h2>{{ title }}</h2><slot /><slot name="footer" /></section>',
};

describe('EenAddPage', () => {
  let context: Ref<{ lotId: string; facility: string; product: string; processStep: string }>;
  let selectedOperationOption: Ref<{ description: string } | undefined>;
  let dialogTitle: Ref<string>;
  let dialogMessage: Ref<string>;
  let dialogMode: Ref<string>;

  beforeEach(() => {
    vi.clearAllMocks();
    context = ref({ lotId: '', facility: '', product: '', processStep: '' });
    selectedOperationOption = ref(undefined);
    dialogTitle = ref('');
    dialogMessage = ref('');
    dialogMode = ref('');
    mockUseEenAdd.mockReturnValue({
      ACTION_POINTS: ['MOVEIN', 'MOVEOUT', 'MOVEIN/OUT'],
      context,
      routeOptions: ref([]),
      operationOptions: ref([]),
      tagOptions: ref([]),
      selectedRoute: ref(undefined),
      selectedOperation: ref(undefined),
      selectedActionPoint: ref('MOVEIN'),
      selectedTagId: ref(undefined),
      selectedOperationOption,
      comment: ref(''),
      loading: ref(false),
      routeLoading: ref(false),
      operationLoading: ref(false),
      dialogTitle,
      dialogMessage,
      dialogMode,
      ...handlers,
    });
  });

  function createPage() {
    return mount(EenAddPage, {
      global: {
        stubs: {
          BaseInput: InputStub,
          QSelect: SelectStub,
          BaseButton: ButtonStub,
          BaseModal: ModalStub,
        },
      },
    });
  }

  it('renders blank fields without Null placeholders', () => {
    const wrapper = createPage();

    expect(wrapper.text()).toContain('EEN 정보 입력');
    expect(wrapper.text()).toContain('LOT ID');
    expect(wrapper.text()).toContain('FACILITY');
    expect(wrapper.text()).toContain('ROUTE');
    expect(wrapper.text()).toContain('제품');
    expect(wrapper.text()).toContain('ROUTE');
    expect(wrapper.text()).toContain('공정');
    expect(wrapper.text()).toContain('공정 DESC');
    expect(wrapper.text()).toContain('ACTION POINT');
    expect(wrapper.text()).toContain('TAG ID');
    expect(wrapper.text()).toContain('W/F NO 입력');
    expect(wrapper.text()).toContain('확인');
    expect(wrapper.text()).toContain('취소');
    expect(
      wrapper
        .findAll('input')
        .every(
          (input) => !input.attributes('placeholder') || input.attributes('placeholder') === '',
        ),
    ).toBe(true);
    expect(wrapper.findAll('select').every((select) => !select.attributes('placeholder'))).toBe(
      true,
    );
    expect(wrapper.text()).not.toContain('Null');
  });

  it('uses Google Symbol icons for all four base selects without a header back button', () => {
    const wrapper = createPage();

    expect(wrapper.findAllComponents({ name: 'BaseDropdownList' })).toHaveLength(4);
    expect(wrapper.findAllComponents(QIcon).map((icon) => icon.props('name'))).toEqual([
      'sym_o_arrow_drop_down',
      'sym_o_arrow_drop_down',
      'sym_o_arrow_drop_down',
      'sym_o_arrow_drop_down',
    ]);
    expect(wrapper.find('svg').exists()).toBe(false);
  });

  it('renders selected operation description and falls back to process step', () => {
    selectedOperationOption.value = { description: 'Inspection' };
    const withOperationDescription = createPage();
    expect((withOperationDescription.findAll('input')[3].element as HTMLInputElement).value).toBe(
      'Inspection',
    );

    selectedOperationOption.value = undefined;
    context.value.processStep = 'Legacy step';
    const withProcessStep = createPage();
    expect((withProcessStep.findAll('input')[3].element as HTMLInputElement).value).toBe(
      'Legacy step',
    );
  });

  it('forwards form and action button events to composable handlers', async () => {
    const wrapper = createPage();
    for (const input of wrapper.findAll('input')) await input.setValue('updated');
    for (const select of wrapper.findAll('select')) await select.trigger('change');
    await wrapper.get('form').trigger('submit');
    await wrapper.get('.een-add-action--cancel').trigger('click');
    await wrapper.get('.een-add-wafer').trigger('click');

    expect(handlers.loadOperations).toHaveBeenCalledOnce();
    expect(handlers.onTagChange).toHaveBeenCalledOnce();
    expect(handlers.submit).toHaveBeenCalledOnce();
    expect(handlers.cancel).toHaveBeenCalledOnce();
    expect(handlers.addWaferNumber).toHaveBeenCalledOnce();
  });

  it('renders confirm dialog actions and wires both choices', async () => {
    dialogMode.value = 'confirm';
    dialogTitle.value = '확  인';
    dialogMessage.value = '입력하시겠습니까?';
    const wrapper = createPage();

    expect(wrapper.text()).toContain('입력하시겠습니까?');
    expect(wrapper.text()).toContain('예');
    expect(wrapper.text()).toContain('아니오');
    const buttons = wrapper.findAll('button');
    await buttons[buttons.length - 2].trigger('click');
    await buttons[buttons.length - 1].trigger('click');

    expect(handlers.cancelDialog).toHaveBeenCalledOnce();
    expect(handlers.confirmSubmit).toHaveBeenCalledOnce();
    dialogMode.value = '';
  });

  it('renders alert dialog with a single OK action', async () => {
    dialogMode.value = 'alert';
    dialogTitle.value = '에  러';
    dialogMessage.value = 'Route를 입력하세요.';
    const wrapper = createPage();

    expect(wrapper.text()).toContain('Route를 입력하세요.');
    const buttons = wrapper.findAll('button');
    expect(buttons[buttons.length - 1].text()).toBe('확인');
    await buttons[buttons.length - 1].trigger('click');

    expect(handlers.closeDialog).toHaveBeenCalledOnce();
  });
});
