import { mount, type Stubs } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import { routeLocationKey } from 'vue-router';

const { handlers, state } = vi.hoisted(() => ({
  handlers: {
    onCancel: vi.fn(),
    onOK: vi.fn(),
    onWHClick: vi.fn(),
    onBatIdClick: vi.fn(),
    onReadClick: vi.fn(),
    onEqpIdCommit: vi.fn(),
    onProbeCardCommit: vi.fn(),
    showStandardMachineInfo: vi.fn(),
    toggleWaferSelection: vi.fn(),
    cancelWaferSelection: vi.fn(),
    confirmWaferSelection: vi.fn(),
    lookupWaferMachine: vi.fn(),
    closeProcessInquire: vi.fn(),
    completeProcessInquire: vi.fn(),
    cancelInlineActivity: vi.fn(),
    completeInlineActivity: vi.fn(),
  },
  state: {
    lotId: { __v_isRef: true, value: 'L1' },
    batchId: { __v_isRef: true, value: 'B1' },
    batchBtnEnabled: true,
    eqpId: { __v_isRef: true, value: 'EQ1' },
    recipeText: { __v_isRef: true, value: 'R1' },
    recipeChanged: { value: true },
    selectedRecipe: { __v_isRef: true, value: 'R1' },
    recipeItems: { __v_isRef: true, value: [{ label: 'R1', value: 'R1' }] },
    standardMachine: { __v_isRef: true, value: 'FAB1' },
    standardMachineChanged: { value: true },
    autoMotiveFlag: { value: 'N' },
    exMachine: { __v_isRef: true, value: 'EQ0' },
    product: { value: 'P1' },
    productDisplay: 'P1(J1)',
    currentOperation: { __v_isRef: true, value: 'OP1' },
    engineer: { __v_isRef: true, value: 'ENG1' },
    customer: { __v_isRef: true, value: 'C1' },
    quantity: { __v_isRef: true, value: '10' },
    goodChips: { __v_isRef: true, value: '9' },
    comment: { __v_isRef: true, value: '' },
    commentSize: { __v_isRef: true, value: '2' },
    probeCard: { __v_isRef: true, value: '' },
    probeOD: { __v_isRef: true, value: '' },
    probeZ: { __v_isRef: true, value: '' },
    probeCardEnabled: { value: true },
    createCategory: { value: '' },
    countName: { __v_isRef: true, value: '' },
    area: { __v_isRef: true, value: '' },
    machineSearchId: { __v_isRef: true, value: '' },
    waferMachines: { __v_isRef: true, value: {} },
    waferDialogOpen: { __v_isRef: true, value: false },
    waferOptions: { __v_isRef: true, value: [] as string[] },
    selectedWafers: { __v_isRef: true, value: [] },
    skipCurrentOperation: { __v_isRef: true, value: false },
    isSkipAllowed: { __v_isRef: true, value: true },
    whLabel: { value: 'W/H' },
    readBtnEnabled: true,
    okEnabled: true,
    loading: false,
  },
}));

vi.mock('src/features/move-in/composables/use-move-in', () => ({
  useMoveIn: () => ({ ...state, ...handlers }),
}));

import MoveInPage from 'src/features/move-in/pages/MoveInPage.vue';

const InputStub = defineComponent({
  props: ['modelValue', 'label', 'placeholder', 'size'],
  emits: ['update:modelValue', 'input', 'change'],
  setup(props, { slots }) {
    return () =>
      h('label', [props.label, h('input', { value: props.modelValue }), slots.default?.()]);
  },
});
const ButtonStub = defineComponent({
  props: ['disabled', 'loading'],
  emits: ['click'],
  setup(props, { emit, slots }) {
    return () =>
      h('button', { disabled: props.disabled, onClick: () => emit('click') }, slots.default?.());
  },
});
const CheckboxStub = defineComponent({
  props: ['modelValue', 'label', 'disabled'],
  emits: ['update:modelValue'],
  setup(props, { attrs, emit }) {
    return () =>
      h('label', attrs, [
        h('input', {
          type: 'checkbox',
          checked: props.modelValue,
          disabled: props.disabled,
          onChange: (event: Event) =>
            emit('update:modelValue', (event.target as HTMLInputElement).checked),
        }),
        props.label,
      ]);
  },
});
const DropdownStub = defineComponent({
  props: ['modelValue', 'label', 'options', 'disabled', 'loading'],
  emits: ['update:modelValue'],
  setup(props, { attrs }) {
    return () => h('div', attrs, [props.label, props.modelValue]);
  },
});

const ModalStub = defineComponent({
  props: ['open', 'title'],
  setup(props, { slots }) {
    return () => (props.open ? h('div', { 'data-title': props.title }, slots.default?.()) : null);
  },
});

const InlineChildStub = defineComponent({
  emits: ['inline-cancel', 'inline-complete'],
  setup(_, { emit }) {
    return () =>
      h('div', [
        h(
          'button',
          { 'data-test': 'inline-cancel', onClick: () => emit('inline-cancel') },
          'cancel-inline',
        ),
        h(
          'button',
          {
            'data-test': 'inline-complete',
            onClick: () => emit('inline-complete', { eqpGroup: 'PHOTO-GROUP' }),
          },
          'complete-inline',
        ),
      ]);
  },
});

const InlineRouterViewStub = defineComponent({
  setup(_, { slots }) {
    return () => slots.default?.({ Component: InlineChildStub });
  },
});

const quasarStubs: Stubs = {
  'q-dialog': {
    props: ['modelValue'],
    template: '<div v-if="modelValue"><slot /></div>',
  },
  'q-card': true,
  'q-card-section': true,
  'q-card-actions': true,
  'q-btn': true,
};

describe('MoveInPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.lotId.value = 'L1';
    state.batchId.value = 'B1';
    state.eqpId.value = 'EQ1';
    state.recipeText.value = 'R1';
    state.standardMachine.value = 'FAB1';
    state.exMachine.value = 'EQ0';
    state.currentOperation.value = 'OP1';
    state.engineer.value = 'ENG1';
    state.customer.value = 'C1';
    state.quantity.value = '10';
    state.goodChips.value = '9';
    state.comment.value = '';
    state.probeCard.value = '';
    state.probeOD.value = '';
    state.probeZ.value = '';
    state.countName.value = '';
    state.machineSearchId.value = '';
    state.selectedRecipe.value = 'R1';
    state.recipeItems.value = [{ label: 'R1', value: 'R1' }];
    state.recipeChanged.value = true;
    state.standardMachineChanged.value = true;
    state.skipCurrentOperation.value = false;
    state.waferDialogOpen.value = false;
    state.waferOptions.value = [];
    state.selectedWafers.value = [];
    state.waferMachines.value = {};
    state.createCategory.value = '';
    state.loading = false;
    state.isSkipAllowed.value = true;
  });

  function mountPage(stubs: Stubs, routeName = 'move-in') {
    return mount(MoveInPage, {
      global: {
        provide: { [routeLocationKey as symbol]: { name: routeName } },
        stubs: { ...quasarStubs, ...stubs },
      },
    });
  }

  it('renders legacy move-in fields and footer actions', async () => {
    const wrapper = mountPage({
      BaseInput: InputStub,
      BaseButton: ButtonStub,
      BaseCheckbox: CheckboxStub,
      BaseDropdownList: DropdownStub,
      RouterView: { template: '<div />' },
    });

    expect(wrapper.text()).toContain('MOVE IN');
    expect(wrapper.text()).toContain('LOT No.');
    expect(wrapper.text()).toContain('진행장비');
    expect(wrapper.text()).toContain('PRO CARD');
    expect(wrapper.text()).toContain('COMMENT');
    expect(wrapper.text()).toContain('제품명');
    expect(wrapper.text()).toContain('현재 공정');
    expect(wrapper.text()).toContain("담당 Eng'r");
    expect(wrapper.text()).toContain('CUSTOMER');
    expect(wrapper.text()).toContain('수량');
    expect(wrapper.text()).toContain('Good Chips');
    expect(wrapper.text()).toContain('현공정 Skip');
    expect(wrapper.text()).not.toContain('Null');
    expect(wrapper.find('.move-in-comment-count').text()).toBe('COMMENT');
    expect(wrapper.find('.move-in-comment-count input').element.getAttribute('value')).toBe('2');
    expect(wrapper.find('.move-in-comment-unit').text()).toBe('개');
    expect(wrapper.findAll('input')).toHaveLength(18);
    expect((wrapper.get('.move-in-skip-option input').element as HTMLInputElement).checked).toBe(
      false,
    );
    expect(
      wrapper
        .findAllComponents(InputStub)
        .filter((field) => field.classes().includes('move-in-field-procard-sub'))
        .map((field) => field.props('size')),
    ).toEqual(['small', 'small']);
    expect(wrapper.find('.move-in-field-product input').element.getAttribute('value')).toBe(
      'P1(J1)',
    );
    expect(wrapper.findAll('.move-in-value--changed')).toHaveLength(2);
    expect(wrapper.find('.move-in-back').exists()).toBe(false);
    expect(wrapper.get('.move-in-title').text()).toBe('MOVE IN');

    await wrapper.get('.move-in-row-lot button').trigger('click');
    await wrapper.get('.move-in-comment-row button').trigger('click');
    const footerButtons = wrapper.findAll('.move-in-footer button');
    await footerButtons[0].trigger('click');
    await footerButtons[1].trigger('click');
    await footerButtons[2].trigger('click');
    expect(handlers.onCancel).toHaveBeenCalledOnce();
    expect(footerButtons[2].text()).toBe('취소');
    expect(handlers.onBatIdClick).toHaveBeenCalledOnce();
    expect(handlers.onReadClick).toHaveBeenCalledOnce();
    expect(handlers.onOK).toHaveBeenCalledOnce();
    expect(handlers.onWHClick).toHaveBeenCalledOnce();
  });

  it('keeps two-way field bindings connected to the parent form state', async () => {
    const wrapper = mountPage({
      BaseInput: InputStub,
      BaseButton: ButtonStub,
      BaseCheckbox: CheckboxStub,
      BaseDropdownList: DropdownStub,
      RouterView: { template: '<div />' },
    });
    const fields = wrapper.findAllComponents(InputStub);

    for (const [index, field] of fields.entries()) {
      await field.vm.$emit('update:modelValue', `UPDATED-${index}`);
    }

    expect(state.lotId.value).toBe('UPDATED-0');
    expect(state.batchId.value).toBe('UPDATED-1');
    expect(state.comment.value).toBe('UPDATED-6');
  });

  it('binds recipe options, disabled state, and selection through BaseDropdownList', async () => {
    const wrapper = mountPage({
      BaseInput: InputStub,
      BaseButton: ButtonStub,
      BaseCheckbox: CheckboxStub,
      BaseDropdownList: DropdownStub,
      RouterView: { template: '<div />' },
    });
    const dropdown = wrapper.getComponent(DropdownStub);

    expect(wrapper.get('.move-in-select-field .ds-field__label').text()).toBe('진행 RCP');
    expect(dropdown.attributes('aria-label')).toBe('진행 RCP');
    expect(dropdown.props('modelValue')).toBe('R1');
    expect(dropdown.props('options')).toEqual([{ label: 'R1', value: 'R1' }]);
    expect(dropdown.props('disabled')).toBe(false);

    await dropdown.vm.$emit('update:modelValue', 'R2');

    expect(state.selectedRecipe.value).toBe('R2');
  });

  it('binds skip state and disabled conditions through BaseCheckbox', async () => {
    const wrapper = mountPage({
      BaseInput: InputStub,
      BaseButton: ButtonStub,
      BaseCheckbox: CheckboxStub,
      BaseDropdownList: DropdownStub,
      RouterView: { template: '<div />' },
    });
    const checkbox = wrapper.getComponent(CheckboxStub);

    expect(checkbox.props('label')).toBe('현공정 Skip');
    expect(checkbox.props('modelValue')).toBe(false);
    expect(checkbox.props('disabled')).toBe(false);

    await checkbox.vm.$emit('update:modelValue', true);

    expect(state.skipCurrentOperation.value).toBe(true);
  });

  it('disables the skip checkbox when the current operation cannot be skipped', () => {
    state.isSkipAllowed.value = false;
    const wrapper = mountPage({
      BaseInput: InputStub,
      BaseButton: ButtonStub,
      BaseCheckbox: CheckboxStub,
      BaseDropdownList: DropdownStub,
      RouterView: { template: '<div />' },
    });

    expect(wrapper.getComponent(CheckboxStub).props('disabled')).toBe(true);
  });

  it('uses BaseCheckbox for wafer selection inside the parent dialog', async () => {
    state.waferDialogOpen.value = true;
    state.waferOptions.value = ['01'];
    state.waferMachines.value = { '01': 'EQ1' };
    const wrapper = mountPage({
      BaseInput: InputStub,
      BaseButton: ButtonStub,
      BaseCheckbox: CheckboxStub,
      BaseDropdownList: DropdownStub,
      BaseModal: ModalStub,
      RouterView: { template: '<div />' },
    });
    const checkbox = wrapper.findAllComponents(CheckboxStub)[1];

    expect(checkbox.props('label')).toBe('01 (EQ1)');
    expect(checkbox.props('modelValue')).toBe(false);

    await checkbox.vm.$emit('update:modelValue', true);

    expect(handlers.toggleWaferSelection).toHaveBeenCalledWith('01');
  });

  it('disables the legacy 확인 action when LOT interlocks block submission', () => {
    state.okEnabled = false;
    const wrapper = mountPage({
      BaseInput: InputStub,
      BaseButton: ButtonStub,
      BaseCheckbox: CheckboxStub,
      BaseDropdownList: DropdownStub,
      RouterView: { template: '<div />' },
    });

    expect(
      (wrapper.findAll('.move-in-footer button')[0].element as HTMLButtonElement).disabled,
    ).toBe(true);
    state.okEnabled = true;
    wrapper.unmount();
  });

  it('forwards Inline child cancel and result events to the parent flow', async () => {
    const wrapper = mountPage({
      BaseInput: InputStub,
      BaseButton: ButtonStub,
      BaseCheckbox: CheckboxStub,
      BaseDropdownList: DropdownStub,
      RouterView: InlineRouterViewStub,
    });

    await wrapper.get('[data-test="inline-cancel"]').trigger('click');
    expect(handlers.cancelInlineActivity).toHaveBeenCalledOnce();

    await wrapper.get('[data-test="inline-complete"]').trigger('click');
    expect(handlers.completeInlineActivity).toHaveBeenCalledWith({ eqpGroup: 'PHOTO-GROUP' });
  });

  it('shows the child screen instead of appending it below the parent screen', () => {
    const wrapper = mountPage(
      {
        BaseInput: InputStub,
        BaseButton: ButtonStub,
        BaseCheckbox: CheckboxStub,
        BaseDropdownList: DropdownStub,
        RouterView: InlineRouterViewStub,
      },
      'move-in-inline',
    );

    expect(wrapper.find('.move-in-page').exists()).toBe(false);
    expect(wrapper.find('[data-test="inline-complete"]').exists()).toBe(true);
  });

  it('commits equipment input when Enter is pressed by the operator or barcode scanner', async () => {
    const wrapper = mountPage({
      BaseInput: InputStub,
      BaseButton: ButtonStub,
      BaseCheckbox: CheckboxStub,
      BaseDropdownList: DropdownStub,
      RouterView: { template: '<div />' },
    });

    await wrapper.get('.move-in-field-equipment input').trigger('keydown.enter');

    expect(handlers.onEqpIdCommit).toHaveBeenCalledOnce();
  });

  it('commits probe-card input when Enter is pressed', async () => {
    const wrapper = mountPage({
      BaseInput: InputStub,
      BaseButton: ButtonStub,
      BaseCheckbox: CheckboxStub,
      BaseDropdownList: DropdownStub,
      RouterView: { template: '<div />' },
    });

    await wrapper.get('.move-in-field-procard-main input').trigger('keydown.enter');

    expect(handlers.onProbeCardCommit).toHaveBeenCalledOnce();
  });

  it('normalizes equipment and probe-card text as the operator types', async () => {
    const wrapper = mountPage({
      BaseInput: InputStub,
      BaseButton: ButtonStub,
      BaseCheckbox: CheckboxStub,
      BaseDropdownList: DropdownStub,
      RouterView: { template: '<div />' },
    });
    const fields = wrapper.findAllComponents(InputStub);
    const equipment = fields.find((field) =>
      field.attributes('class')?.includes('move-in-field-equipment'),
    );
    const probeCard = fields.find((field) =>
      field.attributes('class')?.includes('move-in-field-procard-main'),
    );

    await equipment?.vm.$emit('input', 'eqp-01');
    await probeCard?.vm.$emit('input', 'probe-02');

    expect(state.eqpId.value).toBe('EQP-01');
    expect(state.probeCard.value).toBe('PROBE-02');
  });

  it.each([
    ['COUNT', 'COUNT'],
    ['SLOT', 'SLOT'],
    ['', 'Select wafers'],
  ])('shows the correct wafer dialog title for %s mode', (category, expectedTitle) => {
    state.waferDialogOpen.value = true;
    state.createCategory.value = category;
    const wrapper = mountPage({
      BaseInput: InputStub,
      BaseButton: ButtonStub,
      BaseCheckbox: CheckboxStub,
      BaseDropdownList: DropdownStub,
      BaseModal: ModalStub,
      RouterView: { template: '<div />' },
    });

    expect(wrapper.getComponent(ModalStub).props('title')).toBe(expectedTitle);
  });

  it('does not validate equipment or probe-card fields when they change', async () => {
    const wrapper = mountPage({
      BaseInput: InputStub,
      BaseButton: ButtonStub,
      BaseCheckbox: CheckboxStub,
      BaseDropdownList: DropdownStub,
      RouterView: { template: '<div />' },
    });
    const fields = wrapper.findAllComponents(InputStub);
    const equipment = fields.find((field) =>
      field.attributes('class')?.includes('move-in-field-equipment'),
    );
    const probeCard = fields.find((field) =>
      field.attributes('class')?.includes('move-in-field-procard-main'),
    );

    equipment?.vm.$emit('change');
    probeCard?.vm.$emit('change');

    expect(handlers.onEqpIdCommit).not.toHaveBeenCalled();
    expect(handlers.onProbeCardCommit).not.toHaveBeenCalled();
  });

  it('does not add an automotive icon that is absent from the HTML design', () => {
    state.autoMotiveFlag = ref('Y');
    const wrapper = mountPage({
      BaseInput: InputStub,
      BaseButton: ButtonStub,
      BaseCheckbox: CheckboxStub,
      BaseDropdownList: DropdownStub,
      RouterView: { template: '<div />' },
    });

    expect(wrapper.find('.move-in-automotive-icon').exists()).toBe(false);
  });

  it('opens standard-machine information on double tap', async () => {
    const wrapper = mountPage({
      BaseInput: InputStub,
      BaseButton: ButtonStub,
      BaseCheckbox: CheckboxStub,
      BaseDropdownList: DropdownStub,
      RouterView: { template: '<div />' },
    });
    const standardMachine = wrapper
      .findAllComponents(InputStub)
      .find((field) => field.props('label') === '기준장비');

    await standardMachine?.trigger('dblclick');

    expect(handlers.showStandardMachineInfo).toHaveBeenCalledOnce();
  });
});
