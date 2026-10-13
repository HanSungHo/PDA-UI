import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';

const { handlers, mockUseSplitPage } = vi.hoisted(() => ({
  handlers: {
    closeError: vi.fn(),
    selectRow: vi.fn(),
    onLotSubmit: vi.fn(),
    onSplitClick: vi.fn(),
    onWaferClick: vi.fn(),
    onRowDoubleClick: vi.fn(),
    onWaferConfirm: vi.fn(),
    onWaferCancel: vi.fn(),
    onOkClick: vi.fn(),
    onCancel: vi.fn(),
  },
  mockUseSplitPage: vi.fn(),
}));

vi.mock('src/features/split/composables/useSplitPage.ts', () => ({
  useSplitPage: mockUseSplitPage,
}));

import SplitPage from 'src/features/split/pages/SplitPage.vue';

const BaseButtonStub = {
  props: ['label', 'disabled', 'ariaLabel'],
  emits: ['click'],
  template:
    '<button :aria-label="ariaLabel" :disabled="disabled" @click="$emit(\'click\')"><slot />{{ label }}</button>',
};
const BaseInputFieldStub = {
  inheritAttrs: false,
  props: ['modelValue', 'disabled'],
  emits: ['update:modelValue', 'focus', 'keyup'],
  template:
    '<input v-bind="$attrs" :disabled="disabled" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" @focus="$emit(\'focus\', $event)" @keyup="$emit(\'keyup\', $event)" />',
};
const BaseDropdownListStub = {
  props: ['modelValue', 'options', 'disabled'],
  emits: ['update:modelValue'],
  template:
    '<select :disabled="disabled" :value="modelValue" @change="$emit(\'update:modelValue\', Number($event.target.value))"><option v-for="option in options" :key="option.value" :value="option.value">{{ option.label }}</option></select>',
};
const BaseCheckboxStub = {
  props: ['modelValue', 'label'],
  emits: ['update:modelValue'],
  template:
    '<label><input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />{{ label }}</label>',
};
const BaseTableCellStub = {
  props: ['value'],
  template: '<span>{{ value }}</span>',
};
const BaseModalStub = {
  props: ['open', 'title'],
  template: '<section v-if="open"><h2>{{ title }}</h2><slot /></section>',
};
const SplitWaferSelectDialogStub = {
  props: ['open', 'payload'],
  emits: ['confirm', 'cancel'],
  template:
    '<section v-if="open" data-testid="wafer-dialog"><button @click="$emit(\'confirm\', [\'01\'])">confirm wafer</button><button @click="$emit(\'cancel\')">cancel wafer</button></section>',
};

function createState() {
  return {
    product: ref('PROD-A100'),
    originalQtyText: ref('25'),
    currentOperation: ref('STEP01(1000A)'),
    comment: ref(''),
    rows: ref([
      { id: 1, lotNo: 'ABC1234N1', wafers: ['01', '02'], product: 'PROD-A100' },
      { id: 2, lotNo: 'ABC1234N2', wafers: ['03'], product: 'PROD-A100' },
    ]),
    selectedRowId: ref(1),
    isEtch: ref(false),
    childCount: ref(2),
    canChangeCount: ref(true),
    canSplit: ref(true),
    canOk: ref(true),
    canWafer: ref(true),
    remainQtyText: ref('22'),
    busy: ref(false),
    lotInputWrapper: ref(null),
    lotNoModel: ref('ABC1234X'),
    childCountOptions: [
      { label: '1', value: 1 },
      { label: '2', value: 2 },
    ],
    errorOpen: ref(true),
    errorTitle: ref('오류'),
    errorMessage: ref('message'),
    waferDialogOpen: ref(true),
    waferDialogPayload: ref(null),
    ...handlers,
  };
}

function mountPage() {
  return mount(SplitPage, {
    global: {
      stubs: {
        ArrowLeftOutlined: { template: '<span />' },
        BaseButton: BaseButtonStub,
        BaseInputField: BaseInputFieldStub,
        BaseDropdownList: BaseDropdownListStub,
        BaseCheckbox: BaseCheckboxStub,
        BaseTableCell: BaseTableCellStub,
        BaseModal: BaseModalStub,
        SplitWaferSelectDialog: SplitWaferSelectDialogStub,
      },
    },
  });
}

describe('SplitPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSplitPage.mockReturnValue(createState());
  });

  it('renders LOT summary and split grid rows from useSplitPage state', () => {
    const wrapper = mountPage();
    const inputValues = wrapper
      .findAll('input')
      .map((input) => (input.element as HTMLInputElement).value);

    expect(wrapper.text()).toContain('SPLIT');
    expect(wrapper.text()).toContain('PROD-A100');
    expect(inputValues).toEqual(
      expect.arrayContaining([
        'ABC1234X',
        'PROD-A100',
        '25',
        'STEP01(1000A)',
        'ABC1234N1',
        'ABC1234N2',
      ]),
    );
    expect(wrapper.text()).toContain('01,02');
    expect(wrapper.text()).toContain('잔여');
    expect(wrapper.text()).toContain('message');
  });

  it('forwards table and action events to the composable handlers', async () => {
    const wrapper = mountPage();

    await wrapper.find('tbody tr:nth-child(2)').trigger('click');
    await wrapper.find('tbody tr:nth-child(2) td:nth-child(3)').trigger('dblclick');
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'SPLIT')
      ?.trigger('click');
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'W/F')
      ?.trigger('click');
    await wrapper
      .findAll('button')
      .find((button) => button.text() === '확인')
      ?.trigger('click');
    await wrapper
      .findAll('button')
      .find((button) => button.text() === '취소')
      ?.trigger('click');
    await wrapper.find('[data-testid="wafer-dialog"] button').trigger('click');

    expect(handlers.selectRow).toHaveBeenCalledWith(2);
    expect(handlers.onRowDoubleClick).toHaveBeenCalledWith(2);
    expect(handlers.onSplitClick).toHaveBeenCalledOnce();
    expect(handlers.onWaferClick).toHaveBeenCalledOnce();
    expect(handlers.onOkClick).toHaveBeenCalledOnce();
    expect(handlers.onCancel).toHaveBeenCalledOnce();
    expect(handlers.onWaferConfirm).toHaveBeenCalledWith(['01']);
  });

  it('wires v-model, keyboard, modal, and wafer cancel events', async () => {
    const wrapper = mountPage();
    const inputs = wrapper.findAll('input');

    await inputs[0].setValue('NEXTLOT');
    await inputs[0].trigger('keyup.enter');
    await inputs[4].setValue('updated memo');
    await inputs[5].setValue('CHILDLOT');
    await inputs[5].trigger('focus');
    await wrapper.find('select').setValue('1');
    await inputs.find((input) => input.attributes('type') === 'checkbox')?.setValue(true);
    await wrapper.findAll('[data-testid="wafer-dialog"] button')[1].trigger('click');
    await wrapper.findAll('section')[0].find('button').trigger('click');

    expect(handlers.onLotSubmit).toHaveBeenCalledOnce();
    expect(handlers.selectRow).toHaveBeenCalledWith(1);
    expect(handlers.onWaferCancel).toHaveBeenCalledOnce();
    expect(handlers.closeError).toHaveBeenCalledOnce();
  });
});
