import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { enableAutoUnmount, mount } from '@vue/test-utils';
import { BaseDropdownList } from 'src/components/base/dropdown-list';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, type PropType } from 'vue';

type TestOptionValue = string | number;
type TestDropdownValue = TestOptionValue | TestOptionValue[] | undefined;

interface TestOption {
  label: string;
  value: TestOptionValue;
  disabled?: boolean;
}

interface TestDropdownProps {
  id?: string;
  modelValue?: TestDropdownValue;
  disabled?: boolean;
  readonly?: boolean;
  loading?: boolean;
  required?: boolean;
  clearable?: boolean;
  autofocus?: boolean;
  size?: 'small' | 'medium' | 'large';
  status?: 'default' | 'success' | 'warning' | 'error';
  placeholder?: string;
  label?: string;
  ariaLabel?: string;
  hint?: string;
  error?: boolean;
  errorMessage?: string;
  options?: TestOption[];
  block?: boolean;
  multiple?: boolean;
  searchable?: boolean;
}

const options: TestOption[] = [
  { label: 'Alpha', value: 'alpha' },
  { label: 'Beta', value: 2, disabled: true },
];

const QSelectStub = defineComponent({
  name: 'QSelect',
  inheritAttrs: false,
  props: {
    modelValue: {
      type: [String, Number, Array] as PropType<TestDropdownValue>,
      default: undefined,
    },
    options: {
      type: Array as PropType<TestOption[]>,
      default: () => [],
    },
    multiple: Boolean,
    useInput: Boolean,
    label: {
      type: String,
      default: undefined,
    },
    required: Boolean,
    emitValue: Boolean,
    mapOptions: Boolean,
    filled: Boolean,
    clearable: Boolean,
    loading: Boolean,
    disable: Boolean,
    readonly: Boolean,
    autofocus: Boolean,
    hideBottomSpace: Boolean,
    dense: Boolean,
    error: Boolean,
    for: {
      type: String,
      default: undefined,
    },
    placeholder: {
      type: String,
      default: undefined,
    },
    displayValue: {
      type: String,
      default: undefined,
    },
    popupContentClass: {
      type: String,
      default: undefined,
    },
    behavior: {
      type: String,
      default: undefined,
    },
  },
  emits: ['update:modelValue', 'change', 'clear', 'focus', 'blur', 'filter'],
  setup(props, { attrs }) {
    return () => {
      const rootAttrs = Object.fromEntries(
        Object.entries(attrs).filter(([key]) => !key.startsWith('aria-')),
      );
      const ariaAttrs = Object.fromEntries(
        Object.entries(attrs).filter(([key]) => key.startsWith('aria-')),
      );

      return h(
        'div',
        {
          ...rootAttrs,
          class: ['q-select-stub', rootAttrs.class],
        },
        [
          h('input', {
            id: props.for,
            role: 'combobox',
            disabled: props.disable,
            readonly: props.readonly,
            ...ariaAttrs,
          }),
        ],
      );
    };
  },
});

enableAutoUnmount(afterEach);

function mountDropdown(props: TestDropdownProps = {}) {
  return mount(BaseDropdownList, {
    props: {
      options,
      ...props,
    },
    global: {
      stubs: {
        QSelect: QSelectStub,
      },
    },
  });
}

describe('BaseDropdownList', () => {
  describe('public API contract', () => {
    it('keeps the documented props independent from the UI framework', () => {
      const wrapper = mountDropdown();

      expect(Object.keys(wrapper.props()).sort()).toEqual(
        [
          'ariaLabel',
          'autofocus',
          'block',
          'clearable',
          'disabled',
          'error',
          'errorMessage',
          'hint',
          'id',
          'label',
          'loading',
          'modelValue',
          'multiple',
          'options',
          'placeholder',
          'readonly',
          'required',
          'searchable',
          'size',
          'status',
        ].sort(),
      );
    });

    it('keeps Base events and does not expose framework-native event names', async () => {
      const wrapper = mountDropdown();
      const select = wrapper.getComponent(QSelectStub);

      select.vm.$emit('update:modelValue', 'alpha');
      select.vm.$emit('change', 'alpha');
      select.vm.$emit('clear');
      await nextTick();

      expect(wrapper.emitted('update:modelValue')).toEqual([['alpha']]);
      expect(wrapper.emitted('change')).toEqual([['alpha']]);
      expect(wrapper.emitted('clear')).toEqual([[]]);
      expect(wrapper.emitted('update:model-value')).toBeUndefined();
      expect(wrapper.emitted('popup-show')).toBeUndefined();
    });

    it('applies every documented default when optional props are omitted', () => {
      const wrapper = mountDropdown({ options: undefined });

      expect(wrapper.props()).toMatchObject({
        ariaLabel: 'Dropdown list',
        autofocus: false,
        block: true,
        clearable: false,
        disabled: false,
        error: false,
        loading: false,
        modelValue: undefined,
        multiple: false,
        options: [],
        readonly: false,
        required: false,
        searchable: false,
        size: 'medium',
        status: 'default',
      });
    });
  });

  describe('shared field rendering and accessibility', () => {
    it('uses the floating label and required state with the shared validation message', () => {
      const wrapper = mountDropdown({
        errorMessage: 'Machine is required',
        hint: 'Choose a machine',
        id: 'machine-select',
        label: 'Machine',
        required: true,
      });
      expect(wrapper.classes()).toEqual(
        expect.arrayContaining([
          'ds-dropdown-list',
          'ds-field',
          'ds-field--block',
          'ds-field--error',
          'ds-dropdown-list--required',
        ]),
      );
      expect(wrapper.find('.ds-field__label').exists()).toBe(false);
      expect(wrapper.find('.ds-field__required').exists()).toBe(false);
      expect(wrapper.get('.ds-field__message').text()).toBe('Machine is required');
      expect(wrapper.get('.ds-field__message').attributes('role')).toBe('alert');
      expect(wrapper.getComponent(QSelectStub).props('label')).toBe('Machine');
      expect(wrapper.getComponent(QSelectStub).props('required')).toBe(true);
      const combobox = wrapper.get('input[role="combobox"]');
      expect(combobox.attributes('aria-label')).toBe('Machine');
      expect(combobox.attributes('aria-labelledby')).toBeUndefined();
      expect(combobox.attributes('aria-describedby')).toBe('machine-select-message');
      expect(combobox.attributes('aria-invalid')).toBe('true');
    });

    it('uses ariaLabel when no visible label is provided', () => {
      const wrapper = mountDropdown({ ariaLabel: 'Production process' });
      expect(wrapper.find('.ds-field__label').exists()).toBe(false);
      const combobox = wrapper.get('input[role="combobox"]');
      expect(combobox.attributes('aria-label')).toBe('Production process');
      expect(combobox.attributes('aria-labelledby')).toBeUndefined();
    });

    it('renders hint text when the field has no error message', () => {
      const wrapper = mountDropdown({ hint: 'Choose the assigned machine' });

      expect(wrapper.get('.ds-field__message').text()).toBe('Choose the assigned machine');
      expect(wrapper.get('.ds-field__message').attributes('role')).toBeUndefined();
      expect(wrapper.classes()).not.toContain('ds-field--error');
    });

    it('lets error take precedence over the requested status', () => {
      const wrapper = mountDropdown({ error: true, status: 'warning' });

      expect(wrapper.getComponent(QSelectStub).props('error')).toBe(true);
      expect(wrapper.classes()).toContain('ds-field--error');
      expect(wrapper.classes()).not.toContain('ds-field--warning');
    });

    it('supports non-block layout without changing the field status', () => {
      const wrapper = mountDropdown({ block: false, status: 'warning' });

      expect(wrapper.classes()).toEqual(
        expect.arrayContaining(['ds-dropdown-list', 'ds-field', 'ds-field--warning']),
      );
      expect(wrapper.classes()).not.toContain('ds-field--block');
    });
  });

  describe('Quasar mapping and events', () => {
    it('passes scalar values, options and control props to QSelect', () => {
      const wrapper = mountDropdown({
        autofocus: true,
        clearable: true,
        modelValue: 'alpha',
        placeholder: 'Select a machine',
        searchable: true,
      });
      const select = wrapper.getComponent(QSelectStub);

      expect(select.props('modelValue')).toBe('alpha');
      expect(select.props('options')).toEqual(options);
      expect(select.props('emitValue')).toBe(true);
      expect(select.props('mapOptions')).toBe(true);
      expect(select.props('filled')).toBe(true);
      expect(select.props('behavior')).toBe('menu');
      expect(select.props('clearable')).toBe(true);
      expect(select.props('autofocus')).toBe(true);
      expect(select.props('placeholder')).toBe('Select a machine');
      expect(select.props('displayValue')).toBeUndefined();
      expect(select.props('useInput')).toBe(true);
      expect(select.props('hideBottomSpace')).toBe(true);
    });

    it('shows the placeholder in a non-searchable empty selection', () => {
      const wrapper = mountDropdown({ placeholder: 'Select a machine' });

      expect(wrapper.getComponent(QSelectStub).props('displayValue')).toBe('Select a machine');
    });

    it('uses the input placeholder without duplicating it in searchable fields', () => {
      const wrapper = mountDropdown({ placeholder: 'Select a machine', searchable: true });
      const select = wrapper.getComponent(QSelectStub);

      expect(select.props('displayValue')).toBeUndefined();
      expect(select.props('placeholder')).toBe('Select a machine');
    });

    it('hides the placeholder for an empty readonly selection', () => {
      const wrapper = mountDropdown({ placeholder: 'Select a machine', readonly: true });
      const select = wrapper.getComponent(QSelectStub);

      expect(select.props('displayValue')).toBeUndefined();
      expect(select.props('placeholder')).toBeUndefined();
    });

    it.each([
      ['small', 'ds-dropdown-list--small'],
      ['medium', 'ds-dropdown-list--medium'],
      ['large', 'ds-dropdown-list--large'],
    ] as const)('applies the %s size variant to its own styling boundary', (size, sizeClass) => {
      const wrapper = mountDropdown({ size });

      expect(wrapper.classes()).toContain(sizeClass);
    });

    it.each(['default', 'success', 'warning', 'error'] as const)(
      'preserves the %s field status without exposing framework status values',
      (status) => {
        const wrapper = mountDropdown({ status });

        expect(wrapper.classes()).toContain(`ds-field--${status}`);
        expect(wrapper.getComponent(QSelectStub).props('error')).toBe(status === 'error');
      },
    );

    it('emits the complete multiple-selection array through the Base API', async () => {
      const wrapper = mountDropdown({ modelValue: ['alpha', 2], multiple: true });
      const select = wrapper.getComponent(QSelectStub);

      expect(select.props('multiple')).toBe(true);
      expect(select.props('modelValue')).toEqual(['alpha', 2]);
      expect(select.props('emitValue')).toBe(true);

      select.vm.$emit('update:modelValue', ['alpha', 2]);
      select.vm.$emit('change', ['alpha', 2]);
      await nextTick();

      expect(wrapper.emitted('update:modelValue')).toEqual([[['alpha', 2]]]);
      expect(wrapper.emitted('change')).toEqual([[['alpha', 2]]]);
    });

    it('filters options case-insensitively for searchable fields', async () => {
      const wrapper = mountDropdown({ searchable: true });
      const select = wrapper.getComponent(QSelectStub);
      const updateOptions = (apply: () => void) => apply();

      select.vm.$emit('filter', 'ALP', updateOptions, () => undefined);
      await nextTick();

      expect(select.props('options')).toEqual([options[0]]);

      select.vm.$emit('filter', '', updateOptions, () => undefined);
      await nextTick();

      expect(select.props('options')).toEqual(options);
    });

    it('refreshes the filtered options when the source options change', async () => {
      const wrapper = mountDropdown({ searchable: true });
      const select = wrapper.getComponent(QSelectStub);
      const updateOptions = (apply: () => void) => apply();
      const nextOptions = [{ label: 'Process 120', value: 'process-120' }];

      select.vm.$emit('filter', 'process', updateOptions, () => undefined);
      await wrapper.setProps({ options: nextOptions });

      expect(select.props('options')).toEqual(nextOptions);
    });

    it.each([{ disabled: true }, { loading: true }])(
      'aborts filtering when the field is locked: $disabled/$loading',
      async (lockedProps) => {
        const wrapper = mountDropdown({ searchable: true, ...lockedProps });
        const abort = vi.fn();

        wrapper
          .getComponent(QSelectStub)
          .vm.$emit('filter', 'ALP', (apply: () => void) => apply(), abort);
        await nextTick();

        expect(abort).toHaveBeenCalledOnce();
      },
    );

    it('normalizes a cleared scalar selection to undefined', async () => {
      const wrapper = mountDropdown({ clearable: true, modelValue: 'alpha' });

      wrapper.getComponent(QSelectStub).vm.$emit('update:modelValue', null);
      await nextTick();

      expect(wrapper.emitted('update:modelValue')).toEqual([[undefined]]);
      expect(wrapper.emitted('change')).toEqual([[undefined]]);
    });

    it('forwards focus and blur events', async () => {
      const wrapper = mountDropdown();
      const select = wrapper.getComponent(QSelectStub);
      const focusEvent = new FocusEvent('focus');
      const blurEvent = new FocusEvent('blur');

      select.vm.$emit('focus', focusEvent);
      select.vm.$emit('blur', blurEvent);
      await nextTick();

      expect(wrapper.emitted('focus')).toEqual([[focusEvent]]);
      expect(wrapper.emitted('blur')).toEqual([[blurEvent]]);
    });
  });

  describe('interaction semantics', () => {
    it('disabled blocks all value mutations and disables QSelect', async () => {
      const wrapper = mountDropdown({ clearable: true, disabled: true });
      const select = wrapper.getComponent(QSelectStub);

      expect(select.props('disable')).toBe(true);
      expect(select.props('clearable')).toBe(false);
      expect(wrapper.classes()).toContain('ds-dropdown-list--disabled');

      select.vm.$emit('update:modelValue', 'alpha');
      select.vm.$emit('change', 'alpha');
      select.vm.$emit('clear');
      await nextTick();

      expect(wrapper.emitted('update:modelValue')).toBeUndefined();
      expect(wrapper.emitted('change')).toBeUndefined();
      expect(wrapper.emitted('clear')).toBeUndefined();
    });

    it('loading disables QSelect and blocks value mutations', async () => {
      const wrapper = mountDropdown({ clearable: true, loading: true });
      const select = wrapper.getComponent(QSelectStub);
      expect(select.props('disable')).toBe(true);
      expect(select.props('loading')).toBe(true);
      expect(select.props('clearable')).toBe(false);
      expect(wrapper.get('input[role="combobox"]').attributes('aria-busy')).toBe('true');

      select.vm.$emit('update:modelValue', 'alpha');
      select.vm.$emit('change', 'alpha');
      select.vm.$emit('clear');
      await nextTick();

      expect(wrapper.emitted('update:modelValue')).toBeUndefined();
      expect(wrapper.emitted('change')).toBeUndefined();
      expect(wrapper.emitted('clear')).toBeUndefined();
    });

    it('readonly stays focusable while preventing popup changes and value mutations', async () => {
      const wrapper = mountDropdown({
        clearable: true,
        modelValue: 'alpha',
        readonly: true,
        searchable: true,
      });
      const select = wrapper.getComponent(QSelectStub);
      const combobox = wrapper.get('input[role="combobox"]');
      const focusEvent = new FocusEvent('focus');
      const blurEvent = new FocusEvent('blur');

      expect(select.props('disable')).toBe(false);
      expect(select.props('readonly')).toBe(true);
      expect(select.props('useInput')).toBe(false);
      expect(select.props('clearable')).toBe(false);
      expect(combobox.attributes('disabled')).toBeUndefined();
      expect(combobox.attributes('readonly')).toBe('');
      expect(wrapper.classes()).toContain('ds-dropdown-list--readonly');
      expect(wrapper.classes()).not.toContain('ds-dropdown-list--disabled');

      select.vm.$emit('update:modelValue', 'beta');
      select.vm.$emit('change', 'beta');
      select.vm.$emit('clear');
      select.vm.$emit('focus', focusEvent);
      select.vm.$emit('blur', blurEvent);
      await nextTick();

      expect(wrapper.emitted('update:modelValue')).toBeUndefined();
      expect(wrapper.emitted('change')).toBeUndefined();
      expect(wrapper.emitted('clear')).toBeUndefined();
      expect(wrapper.emitted('focus')).toEqual([[focusEvent]]);
      expect(wrapper.emitted('blur')).toEqual([[blurEvent]]);
    });
  });

  it('uses QSelect public attributes for accessible state', async () => {
    const wrapper = mountDropdown({
      ariaLabel: 'Machine',
      errorMessage: 'Machine is required',
      id: 'machine-select',
      required: true,
    });
    const select = wrapper.getComponent(QSelectStub);

    expect(select.props('for')).toBe('machine-select');
    const combobox = wrapper.get('input[role="combobox"]');
    expect(combobox.attributes('aria-label')).toBe('Machine');
    expect(combobox.attributes('aria-invalid')).toBe('true');
    expect(combobox.attributes('aria-describedby')).toBe('machine-select-message');
    expect(combobox.attributes('aria-required')).toBe('true');

    await wrapper.setProps({
      errorMessage: undefined,
      hint: 'Optional machine',
      readonly: true,
      required: false,
    });

    const updatedCombobox = wrapper.get('input[role="combobox"]');
    expect(updatedCombobox.attributes('aria-invalid')).toBeUndefined();
    expect(updatedCombobox.attributes('aria-describedby')).toBe('machine-select-message');
    expect(select.props('disable')).toBe(false);
  });

  it('uses design-system menu styles and does not depend on Ant Design selectors', () => {
    const styles = readFileSync(
      resolve(process.cwd(), 'src/components/base/dropdown-list/base-dropdown-list.css'),
      'utf8',
    );
    const tokens = readFileSync(resolve(process.cwd(), 'src/css/base-tokens.css'), 'utf8');

    expect(styles).toContain('.q-item');
    expect(styles).not.toContain('transform: none');
    expect(styles).toContain('var(--ds-font-family-sans)');
    expect(styles).toContain('var(--ds-dropdown-list-shadow)');
    expect(styles).not.toContain('outline:');
    expect(styles).toContain('var(--background-placeholder)');
    expect(styles).toContain('var(--text-text-info)');
    expect(styles).toContain('height: var(--ds-input-min-height-md');
    expect(styles).toContain('min-height: var(--ds-input-min-height-sm');
    expect(styles).toContain('.ds-field--success .ds-dropdown-list__control .q-field__control');
    expect(styles).toContain('.ds-field--warning .ds-dropdown-list__control .q-field__control');
    expect(styles).toContain('inset 0 -1px 0 var(--border-border-success)');
    expect(styles).toContain('inset 0 -1px 0 var(--border-border-warning)');
    expect(styles).toContain('.ds-dropdown-list--required .q-field__label::after');
    expect(styles).toContain("content: ' *'");
    expect(tokens).toContain('--ds-dropdown-list-shadow:');
    expect(styles).not.toContain('.ant-select');
    expect(styles).not.toContain('Inter');
  });
});
