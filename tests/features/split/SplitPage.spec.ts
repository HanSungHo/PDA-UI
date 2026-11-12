import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, type PropType, ref, type VNode } from 'vue';

interface GridRow {
  id: number;
  lotNo: string;
  [field: string]: unknown;
}

interface GridColumn {
  prop: string;
  cellTemplate?: unknown;
}

const { handlers, mockUseSplitPage } = vi.hoisted(() => ({
  handlers: {
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
const BaseScreenStub = {
  props: ['title'],
  template:
    '<div class="ds-screen"><h1>{{ title }}</h1><div class="ds-screen__content"><slot /></div><footer><slot name="footer" /></footer></div>',
};
const BaseInputStub = {
  inheritAttrs: false,
  props: ['modelValue', 'label', 'disabled', 'readonly'],
  emits: ['update:modelValue', 'focus', 'keyup'],
  template:
    '<label><span>{{ label }}</span><input v-bind="$attrs" :disabled="disabled" :readonly="readonly" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" @focus="$emit(\'focus\', $event)" @keyup="$emit(\'keyup\', $event)" /></label>',
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
const BaseRevoGridStub = defineComponent({
  props: {
    rows: { type: Array as PropType<GridRow[]>, default: () => [] },
    columns: { type: Array as PropType<GridColumn[]>, default: () => [] },
    selectedRowKey: { type: Number, default: undefined },
    stretch: { type: [Boolean, String], default: false },
    resize: { type: Boolean, default: true },
    filter: { type: Boolean, default: true },
    readonly: { type: Boolean, default: undefined },
  },
  emits: ['rowSelect', 'cellEdit'],
  setup(props, { emit }) {
    return () =>
      h('table', { 'data-testid': 'split-grid' }, [
        h(
          'tbody',
          props.rows.map((row) =>
            h(
              'tr',
              { onClick: () => emit('rowSelect', row.id, row) },
              props.columns.map((column) => {
                const renderCell = column.cellTemplate as
                  | ((createElement: typeof h, context: { model: GridRow }) => VNode)
                  | undefined;
                const content = renderCell
                  ? renderCell(h, { model: row })
                  : String(row[column.prop] ?? '');

                if (column.prop === 'waferText' && typeof content === 'object') {
                  return h('td', [
                    h(
                      'div',
                      {
                        class: content.props?.class,
                        onDblclick: content.props?.onDblClick,
                      },
                      content.children ?? [],
                    ),
                  ]);
                }

                if (column.prop !== 'lotNo') return h('td', [content]);

                return h('td', [
                  h('input', {
                    value: String(row[column.prop] ?? ''),
                    onInput: (event: Event) => {
                      const target = event.target;
                      const value = target instanceof HTMLInputElement ? target.value : '';
                      emit('cellEdit', { rowKey: row.id, row, prop: column.prop, value });
                    },
                  }),
                ]);
              }),
            ),
          ),
        ),
      ]);
  },
});
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
    waferDialogOpen: ref(true),
    waferDialogPayload: ref(null),
    ...handlers,
  };
}

function mountPage(state = createState()) {
  mockUseSplitPage.mockReturnValue(state);

  return mount(SplitPage, {
    global: {
      stubs: {
        ArrowLeftOutlined: { template: '<span />' },
        BaseButton: BaseButtonStub,
        BaseScreen: BaseScreenStub,
        BaseInput: BaseInputStub,
        BaseDropdownList: BaseDropdownListStub,
        BaseCheckbox: BaseCheckboxStub,
        BaseRevoGrid: BaseRevoGridStub,
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
    const formInputValues = wrapper
      .find('.ds-screen__card')
      .findAll('input')
      .map((input) => (input.element as HTMLInputElement).value);

    expect(wrapper.get('h1').text()).toBe('SPLIT');
    expect(formInputValues).toEqual(
      expect.arrayContaining(['ABC1234X', 'PROD-A100', '25', 'STEP01(1000A)']),
    );
    const grid = wrapper.get('[data-testid="split-grid"]');
    expect(grid.text()).toContain('PROD-A100');
    expect(grid.text()).toContain('01,02');
    expect(
      grid
        .findAll('tbody tr td:nth-child(1) input')
        .map((input) => (input.element as HTMLInputElement).value),
    ).toEqual(['ABC1234N1', 'ABC1234N2']);
    expect(wrapper.text()).toContain('잔여');
  });

  it('renders the Figma card layout inside BaseScreen with footer actions', () => {
    const wrapper = mountPage();

    expect(wrapper.findAll('.ds-screen__content > .ds-screen__card')).toHaveLength(3);
    expect(wrapper.find('.split-page__grid [data-testid="split-grid"]').exists()).toBe(true);
    expect(wrapper.findAll('.ds-screen__card-row')).toHaveLength(4);
    expect(wrapper.findAll('footer button').map((button) => button.text())).toEqual([
      '확인',
      '취소',
    ]);
  });

  it('configures the grid for the Figma layout and passes the selected row', () => {
    const wrapper = mountPage();
    const grid = wrapper.findComponent(BaseRevoGridStub);

    expect(grid.props('selectedRowKey')).toBe(1);
    expect(grid.props('stretch')).toBe(true);
    expect(grid.props('resize')).toBe(false);
    expect(grid.props('filter')).toBe(false);
    expect(grid.props('readonly')).toBe(false);
  });

  it('passes no selected row key when nothing is selected', () => {
    const state = createState();
    state.selectedRowId.value = null as unknown as number;
    const grid = mountPage(state).findComponent(BaseRevoGridStub);

    expect(grid.props('selectedRowKey')).toBeUndefined();
  });

  it('disables 확인, SPLIT, W/F and the count dropdown from the composable state', () => {
    const state = createState();
    state.canOk.value = false;
    state.canSplit.value = false;
    state.canWafer.value = false;
    state.canChangeCount.value = false;
    const wrapper = mountPage(state);
    const isDisabled = (label: string) =>
      (
        wrapper
          .findAll('footer button, .ds-screen__card button')
          .find((button) => button.text() === label)?.element as HTMLButtonElement
      ).disabled;

    expect(isDisabled('확인')).toBe(true);
    expect(isDisabled('SPLIT')).toBe(true);
    expect(isDisabled('W/F')).toBe(true);
    expect((wrapper.get('select').element as HTMLSelectElement).disabled).toBe(true);
  });

  it('keeps the actions disabled while busy even when the state allows them', () => {
    const state = createState();
    state.busy.value = true;
    const wrapper = mountPage(state);

    const buttonOf = (label: string) =>
      wrapper
        .findAll('footer button, .ds-screen__card button')
        .find((item) => item.text() === label)?.element as HTMLButtonElement;

    for (const label of ['확인', 'SPLIT', 'W/F']) {
      expect(buttonOf(label).disabled).toBe(true);
    }
    expect(buttonOf('취소').disabled).toBe(false);
  });

  it('ignores grid edits that are not a LOT No. of a known row', async () => {
    const state = createState();
    const wrapper = mountPage(state);
    const grid = wrapper.findComponent(BaseRevoGridStub);

    grid.vm.$emit('cellEdit', { rowKey: 1, prop: 'product', value: 'CHANGED' });
    grid.vm.$emit('cellEdit', { rowKey: 99, prop: 'lotNo', value: 'unknown' });
    await wrapper.vm.$nextTick();

    expect(state.rows.value.map((row) => row.lotNo)).toEqual(['ABC1234N1', 'ABC1234N2']);
    expect(state.rows.value[0]?.product).toBe('PROD-A100');
  });

  it('forwards table and action events to the composable handlers', async () => {
    const wrapper = mountPage();

    await wrapper.find('tbody tr:nth-child(2)').trigger('click');
    await wrapper.findAll('.cell-text')[1].trigger('dblclick');
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'SPLIT')
      ?.trigger('click');
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'W/F')
      ?.trigger('click');
    const footerButtons = wrapper.findAll('footer button');
    await footerButtons.find((button) => button.text() === '확인')?.trigger('click');
    await footerButtons.find((button) => button.text() === '취소')?.trigger('click');
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
    await inputs[4]?.setValue('updated memo');
    await wrapper.get('[data-testid="split-grid"] tbody tr').trigger('click');
    const childLotInput = wrapper.get(
      '[data-testid="split-grid"] tbody tr:nth-child(1) td:nth-child(1) input',
    );
    await childLotInput.setValue('childlot');
    await wrapper.find('select').setValue('1');
    await inputs.find((input) => input.attributes('type') === 'checkbox')?.setValue(true);
    await wrapper.findAll('[data-testid="wafer-dialog"] button')[1].trigger('click');

    expect(handlers.onLotSubmit).toHaveBeenCalledOnce();
    expect(handlers.selectRow).toHaveBeenCalledWith(1);
    expect((childLotInput.element as HTMLInputElement).value).toBe('CHILDLOT');
    expect(handlers.onWaferCancel).toHaveBeenCalledOnce();
  });
});
