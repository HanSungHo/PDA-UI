/* eslint-disable vue/one-component-per-file */

import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';

import OkDialog from '~/components/OkDialog.vue';
import { useTestTuningLogic } from '~/features/test-tuning/composables/useTestTuning';
import TestTuningPage from '~/features/test-tuning/pages/TestTuningPage.vue';
import type {
  DropdownItem,
  GridRowData,
  RevoGridColumn,
  ScreenMode,
} from '~/features/test-tuning/types/test-tuning.types';
import { okDialog } from '~/services/ok-dialog.service';

vi.mock('~/features/test-tuning/composables/useTestTuning', () => ({
  useTestTuningLogic: vi.fn(),
}));

vi.mock('~/components/base/button/BaseButton.vue', async () => {
  const { defineComponent, h } = await import('vue');

  return {
    default: defineComponent({
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
    }),
  };
});

vi.mock('~/components/base/screen/BaseScreen.vue', async () => {
  const { defineComponent, h } = await import('vue');

  return {
    default: defineComponent({
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
    }),
  };
});

vi.mock('~/components/base/input/BaseInput.vue', async () => {
  const { defineComponent, h, ref: vueRef } = await import('vue');

  return {
    default: defineComponent({
      name: 'BaseInput',
      props: {
        modelValue: { type: [String, Number], default: '' },
        label: { type: String, default: '' },
        readonly: Boolean,
        uppercase: Boolean,
      },
      emits: ['update:modelValue'],
      setup(props, { emit, expose }) {
        const inputRef = vueRef<HTMLInputElement | null>(null);

        // Mirrors BaseInput's real defineExpose({ focus, select }) so pages that
        // drive focus via a template ref can be tested against document.activeElement.
        expose({
          focus: () => inputRef.value?.focus(),
          select: () => inputRef.value?.select(),
        });

        // 'keyup' is not declared in emits, so Vue falls the parent's @keyup.enter
        // listener through as a native attr onto this root <input>, same as real BaseInput.
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
      setup(props, { emit }) {
        return () =>
          h(
            'select',
            {
              value: props.modelValue,
              'aria-label': props.label,
              onChange: (event: Event) =>
                emit('update:modelValue', (event.target as HTMLSelectElement).value),
            },
            (props.options as DropdownItem[]).map((option) =>
              h('option', { value: option.value }, option.label),
            ),
          );
      },
    }),
  };
});

vi.mock('~/components/base/revo-grid/BaseRevoGrid.vue', async () => {
  const { defineComponent, h } = await import('vue');

  return {
    default: defineComponent({
      name: 'BaseRevoGrid',
      props: {
        rows: { type: Array, default: () => [] },
        columns: { type: Array, default: () => [] },
      },
      setup(props) {
        return () =>
          h(
            'div',
            { class: 'base-revo-grid-stub' },
            (props.rows as GridRowData[]).map((row, index) =>
              h('div', { class: 'grid-row', key: index }, JSON.stringify(row)),
            ),
          );
      },
    }),
  };
});

function createMockComposable() {
  return {
    editEqpId: ref(''),
    txtLot: ref(''),
    radioMode: ref<ScreenMode>('TEST'),
    radioModeOptions: [
      { label: 'TEST', value: 'TEST' },
      { label: 'TUNING', value: 'TUNING' },
    ],
    spinnerMainOptions: ref<DropdownItem[]>([{ label: 'GRP1', value: 'GRP1' }]),
    spinnerSubOptions: ref<DropdownItem[]>([{ label: 'SUB1', value: 'SUB1' }]),
    selectedMain: ref(''),
    selectedSub: ref(''),
    gridData: ref<GridRowData[]>([]),
    columns: ref<RevoGridColumn[]>([{ prop: 'SLOT', name: 'SLOT', size: 100 }]),
    baseWidth: ref(0),
    handleEditorAction: vi.fn(),
    handleSearchClick: vi.fn(),
    handleCancelClick: vi.fn(),
    handleRadioChange: vi.fn(),
    onMainSpinnerChange: vi.fn(),
    onSubSpinnerChange: vi.fn(),
  };
}

let resizeObserverCallback: ((entries: ResizeObserverEntry[]) => void) | null = null;
let resizeObserverDisconnect: ReturnType<typeof vi.fn>;
let resizeObserverUnobserve: ReturnType<typeof vi.fn>;

class MockResizeObserver {
  constructor(callback: (entries: ResizeObserverEntry[]) => void) {
    resizeObserverCallback = callback;
  }
  observe = vi.fn();
  unobserve = resizeObserverUnobserve;
  disconnect = resizeObserverDisconnect;
}

describe('TestTuningPage.vue', () => {
  let mockComposable: ReturnType<typeof createMockComposable>;
  let capturedFocusEqpIdInput: (() => void) | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    resizeObserverCallback = null;
    resizeObserverDisconnect = vi.fn();
    resizeObserverUnobserve = vi.fn();
    vi.stubGlobal('ResizeObserver', MockResizeObserver);

    mockComposable = createMockComposable();
    vi.mocked(useTestTuningLogic).mockImplementation((focusEqpIdInput) => {
      capturedFocusEqpIdInput = focusEqpIdInput;
      return mockComposable as unknown as ReturnType<typeof useTestTuningLogic>;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
    okDialog.confirm();
    okDialog.message.value = '';
    okDialog.title.value = '';
  });

  function createWrapper() {
    return mount(TestTuningPage, { attachTo: document.body });
  }

  it('renders the legacy title and the Machine/일련번호 fields', () => {
    const wrapper = createWrapper();

    expect(wrapper.find('h1').text()).toBe('TEST | TUNING');

    const labels = wrapper.findAll('[aria-label]').map((el) => el.attributes('aria-label'));
    expect(labels).toEqual(expect.arrayContaining(['Machine', '일련번호', 'MAIN', 'SUB']));

    expect(wrapper.find('#edit_eqp_id').exists()).toBe(true);
    expect(wrapper.find('#btn_cancel').exists()).toBe(true);
    wrapper.unmount();
  });

  it('renders the action buttons in the BaseScreen footer', () => {
    const wrapper = createWrapper();

    const footer = wrapper.find('footer');
    expect(footer.find('#btn_cancel').exists()).toBe(true);
    expect(footer.text()).toBe('취소');
    wrapper.unmount();
  });

  it('binds composable state to the fields', () => {
    mockComposable.editEqpId.value = 'TT-EQP01';
    mockComposable.txtLot.value = 'LOT-0001';
    mockComposable.selectedMain.value = 'GRP1';
    mockComposable.selectedSub.value = 'SUB1';

    const wrapper = createWrapper();

    expect((wrapper.find('#edit_eqp_id').element as HTMLInputElement).value).toBe('TT-EQP01');
    const dropdowns = wrapper.findAll('select');
    expect((dropdowns[0]?.element as HTMLSelectElement).value).toBe('GRP1');
    expect((dropdowns[1]?.element as HTMLSelectElement).value).toBe('SUB1');
    wrapper.unmount();
  });

  it('updates editEqpId when the Machine input emits update:modelValue', async () => {
    const wrapper = createWrapper();

    await wrapper.find('#edit_eqp_id').setValue('eqp-new');

    expect(mockComposable.editEqpId.value).toBe('eqp-new');
    wrapper.unmount();
  });

  it('triggers handleEditorAction when Enter is pressed in the Machine input', async () => {
    const wrapper = createWrapper();

    await wrapper.find('#edit_eqp_id').trigger('keyup.enter');

    expect(mockComposable.handleEditorAction).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it('triggers handleSearchClick when 조회 is clicked', async () => {
    const wrapper = createWrapper();

    const searchBtn = wrapper.findAll('button').find((btn) => btn.text() === '조회');
    expect(searchBtn).toBeDefined();

    await searchBtn!.trigger('click');
    expect(mockComposable.handleSearchClick).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it('triggers handleCancelClick when 취소 is clicked', async () => {
    const wrapper = createWrapper();

    await wrapper.find('#btn_cancel').trigger('click');

    expect(mockComposable.handleCancelClick).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it('triggers handleRadioChange with the selected mode', async () => {
    const wrapper = createWrapper();

    // Quasar QRadio renders [role="radio"], not a native <input type="radio">.
    const radios = wrapper.findAll('[role="radio"]');
    expect(radios.length).toBe(2);

    await radios[1]?.trigger('click');
    expect(mockComposable.handleRadioChange).toHaveBeenCalledWith('TUNING');
    wrapper.unmount();
  });

  it('triggers onMainSpinnerChange and onSubSpinnerChange with string values', async () => {
    const wrapper = createWrapper();
    const dropdowns = wrapper.findAll('select');

    await dropdowns[0]?.setValue('GRP1');
    expect(mockComposable.onMainSpinnerChange).toHaveBeenCalledWith('GRP1');

    await dropdowns[1]?.setValue('SUB1');
    expect(mockComposable.onSubSpinnerChange).toHaveBeenCalledWith('SUB1');
    wrapper.unmount();
  });

  it('passes rows and columns through to the grid', () => {
    mockComposable.gridData.value = [
      { SLOT: '1', RECIPE: 'RCP-A', CHAMBER: 'CH1', MEAS_RECIPE: 'M-A' },
    ];

    const wrapper = createWrapper();
    const grid = wrapper.find('.base-revo-grid-stub');

    expect(grid.exists()).toBe(true);
    expect(grid.findAll('.grid-row')).toHaveLength(1);
    wrapper.unmount();
  });

  it('focuses the Machine input on mount', async () => {
    const wrapper = createWrapper();
    await flushPromises();

    expect(document.activeElement?.id).toBe('edit_eqp_id');
    wrapper.unmount();
  });

  it('refocuses the Machine input when the composable invokes the focus callback', async () => {
    const wrapper = createWrapper();
    await flushPromises();

    const input = document.getElementById('edit_eqp_id') as HTMLInputElement;
    input.blur();
    expect(document.activeElement?.id).not.toBe('edit_eqp_id');

    expect(capturedFocusEqpIdInput).toBeDefined();
    capturedFocusEqpIdInput!();
    await flushPromises();

    expect(document.activeElement).toBe(input);
    wrapper.unmount();
  });

  it('captures baseWidth from the main body ResizeObserver and disconnects after one notification', () => {
    const wrapper = createWrapper();

    expect(resizeObserverCallback).toBeDefined();
    const entry = { contentRect: { width: 1024 } } as unknown as ResizeObserverEntry;

    resizeObserverCallback!([entry]);

    expect(mockComposable.baseWidth.value).toBe(1024);
    expect(resizeObserverUnobserve).toHaveBeenCalledTimes(1);
    expect(resizeObserverDisconnect).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it('renders the shared OkDialog bound to the global okDialog service and confirms it', async () => {
    const wrapper = createWrapper();

    expect(okDialog.isOpen.value).toBe(false);

    void okDialog.show('에  러', 'Equipment not found', '확인');
    await flushPromises();

    expect(okDialog.isOpen.value).toBe(true);
    expect(okDialog.title.value).toBe('에  러');
    expect(okDialog.message.value).toBe('Equipment not found');

    wrapper.findComponent(OkDialog).vm.$emit('confirm');
    await flushPromises();

    expect(okDialog.isOpen.value).toBe(false);
    wrapper.unmount();
  });
});
