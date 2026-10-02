import { mount, type Stubs } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
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
    lotId: { value: 'L1' },
    batchId: { value: 'B1' },
    batchBtnEnabled: true,
    eqpId: { value: 'EQ1' },
    recipeText: { value: 'R1' },
    recipeChanged: { value: true },
    selectedRecipe: { value: 'R1' },
    recipeItems: { value: [{ label: 'R1', value: 'R1' }] },
    standardMachine: { value: 'FAB1' },
    standardMachineChanged: { value: true },
    autoMotiveFlag: { value: 'N' },
    exMachine: { value: 'EQ0' },
    product: { value: 'P1' },
    productDisplay: 'P1(J1)',
    currentOperation: { value: 'OP1' },
    engineer: { value: 'ENG1' },
    customer: { value: 'C1' },
    quantity: { value: '10' },
    goodChips: { value: '9' },
    comment: { value: '' },
    commentSize: { value: '2' },
    probeCard: { value: '' },
    probeOD: { value: '' },
    probeZ: { value: '' },
    probeCardEnabled: { value: true },
    createCategory: { value: '' },
    countName: { value: '' },
    area: { __v_isRef: true, value: '' },
    machineSearchId: { value: '' },
    waferMachines: { __v_isRef: true, value: {} },
    waferDialogOpen: { __v_isRef: true, value: false },
    waferOptions: { __v_isRef: true, value: [] },
    selectedWafers: { __v_isRef: true, value: [] },
    skipCurrentOperation: { value: false },
    isSkipAllowed: { value: true },
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
  props: ['modelValue', 'label', 'placeholder'],
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
  props: ['modelValue', 'label'],
  setup(props) {
    return () => h('label', props.label);
  },
});
const DropdownStub = defineComponent({
  props: ['modelValue', 'label'],
  setup(props) {
    return () => h('label', props.label);
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

describe('MoveInPage', () => {
  beforeEach(() => vi.clearAllMocks());

  function mountPage(stubs: Stubs, routeName = 'move-in') {
    return mount(MoveInPage, {
      global: {
        provide: { [routeLocationKey as symbol]: { name: routeName } },
        stubs,
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
    expect(wrapper.findAll('input')).toHaveLength(17);
    expect(wrapper.find('.move-in-field-product input').element.getAttribute('value')).toBe(
      'P1(J1)',
    );
    expect(wrapper.findAll('.move-in-value--changed')).toHaveLength(2);

    await wrapper.get('.move-in-back').trigger('click');
    await wrapper.get('.move-in-row-lot button').trigger('click');
    await wrapper.get('.move-in-comment-row button').trigger('click');
    const footerButtons = wrapper.findAll('.move-in-footer button');
    await footerButtons[0].trigger('click');
    await footerButtons[1].trigger('click');
    expect(handlers.onCancel).toHaveBeenCalledOnce();
    expect(footerButtons[2].text()).toBe('취소');
    expect(handlers.onBatIdClick).toHaveBeenCalledOnce();
    expect(handlers.onReadClick).toHaveBeenCalledOnce();
    expect(handlers.onOK).toHaveBeenCalledOnce();
    expect(handlers.onWHClick).toHaveBeenCalledOnce();
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

  it('shows the automotive icon only for automotive LOTs', async () => {
    state.autoMotiveFlag = ref('N');
    const wrapper = mountPage({
      BaseInput: InputStub,
      BaseButton: ButtonStub,
      BaseCheckbox: CheckboxStub,
      BaseDropdownList: DropdownStub,
      RouterView: { template: '<div />' },
    });

    expect(wrapper.find('.move-in-automotive-icon').exists()).toBe(false);
    state.autoMotiveFlag.value = 'Y';
    await nextTick();
    const automotiveIcon = wrapper.find('.move-in-automotive-icon');
    expect(automotiveIcon.exists()).toBe(true);
    expect(automotiveIcon.attributes('width')).toBe('24');
    expect(automotiveIcon.attributes('height')).toBe('24');
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
