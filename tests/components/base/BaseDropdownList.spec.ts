import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { enableAutoUnmount, mount } from '@vue/test-utils';
import { Select as AntSelect } from 'ant-design-vue';
import { BaseDropdownList } from 'src/components/base';
import {
  canHaveModifiers,
  createSourceFile,
  getModifiers,
  isFunctionDeclaration,
  isIdentifier,
  isInterfaceDeclaration,
  isTypeAliasDeclaration,
  isVariableStatement,
  ScriptKind,
  ScriptTarget,
  type Statement,
  SyntaxKind,
} from 'typescript';
import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick, type PropType } from 'vue';

const dropdownListStyles = readFileSync(
  resolve(process.cwd(), 'src/components/base/dropdown-list/base-dropdown-list.css'),
  'utf8',
);

type TestOptionValue = string | number;
type TestDropdownValue = TestOptionValue | TestOptionValue[] | undefined;

interface TestOption {
  label: string;
  value: TestOptionValue;
  disabled?: boolean;
}

type TestFilterOption = (input: string, option?: TestOption) => boolean;

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

const SelectStub = defineComponent({
  name: 'ASelect',
  inheritAttrs: false,
  props: {
    value: {
      type: [String, Number, Array] as PropType<TestDropdownValue>,
      default: undefined,
    },
    options: {
      type: Array as PropType<TestOption[]>,
      default: () => [],
    },
    size: {
      type: String as PropType<'small' | 'middle' | 'large'>,
      default: undefined,
    },
    status: {
      type: String as PropType<'warning' | 'error'>,
      default: undefined,
    },
    mode: {
      type: String as PropType<'multiple'>,
      default: undefined,
    },
    showSearch: Boolean,
    filterOption: {
      type: [Boolean, Function] as PropType<boolean | TestFilterOption>,
      default: false,
    },
    allowClear: Boolean,
    loading: Boolean,
    disabled: Boolean,
    autofocus: Boolean,
    open: {
      type: Boolean,
      default: undefined,
    },
    placeholder: {
      type: String,
      default: undefined,
    },
    id: {
      type: String,
      default: undefined,
    },
    popupClassName: {
      type: String,
      default: undefined,
    },
  },
  emits: ['change', 'clear', 'focus', 'blur'],
  setup(props, { attrs }) {
    return () =>
      h(
        'div',
        {
          ...attrs,
          class: ['select-stub', attrs.class],
        },
        [
          h('input', {
            id: props.id,
            role: 'combobox',
            disabled: props.disabled,
          }),
        ],
      );
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
        ASelect: SelectStub,
      },
    },
  });
}

function getExportedDeclarationNames(statement: Statement): string[] {
  const isExported =
    canHaveModifiers(statement) &&
    getModifiers(statement)?.some((modifier) => modifier.kind === SyntaxKind.ExportKeyword);

  if (!isExported) return [];

  if (
    isFunctionDeclaration(statement) ||
    isInterfaceDeclaration(statement) ||
    isTypeAliasDeclaration(statement)
  ) {
    return statement.name === undefined ? [] : [statement.name.text];
  }

  if (isVariableStatement(statement)) {
    return statement.declarationList.declarations.flatMap((declaration) =>
      isIdentifier(declaration.name) ? [declaration.name.text] : [],
    );
  }

  return [];
}

describe('BaseDropdownList', () => {
  describe('public API contract', () => {
    it('exposes exactly the documented BaseDropdownList props without Ant Select props', () => {
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

      expect(Object.keys(wrapper.props())).not.toEqual(
        expect.arrayContaining([
          'allowClear',
          'filterOption',
          'mode',
          'open',
          'popupClassName',
          'showSearch',
          'value',
        ]),
      );
    });

    it('never re-emits Ant-native Select event names', async () => {
      const wrapper = mountDropdown();
      const declaredEmits = (
        BaseDropdownList as unknown as { emits?: string[] | Record<string, unknown> }
      ).emits;
      const declaredEventNames = Array.isArray(declaredEmits)
        ? declaredEmits
        : Object.keys(declaredEmits ?? {});

      expect(declaredEventNames.sort()).toEqual(
        ['blur', 'change', 'clear', 'focus', 'update:modelValue'].sort(),
      );

      wrapper.getComponent(SelectStub).vm.$emit('change', 'alpha');
      await nextTick();

      expect(Object.keys(wrapper.emitted()).sort()).toEqual(['change', 'update:modelValue'].sort());

      for (const antEventName of [
        'after-change',
        'deselect',
        'dropdownVisibleChange',
        'search',
        'select',
        'update:open',
        'update:value',
      ]) {
        expect(wrapper.emitted(antEventName)).toBeUndefined();
      }
    });

    it('keeps the deep-importable type module framework-agnostic', () => {
      const sourceText = readFileSync(
        resolve(process.cwd(), 'src/components/base/dropdown-list/base-dropdown-list.types.ts'),
        'utf8',
      );
      const sourceFile = createSourceFile(
        'base-dropdown-list.types.ts',
        sourceText,
        ScriptTarget.Latest,
        true,
        ScriptKind.TS,
      );
      const exportedNames = sourceFile.statements.flatMap(getExportedDeclarationNames);

      expect(exportedNames.sort()).toEqual(
        [
          'BaseDropdownListEmits',
          'BaseDropdownListProps',
          'BaseDropdownValue',
          'BaseOption',
          'BaseOptionValue',
          'baseDropdownListDefaults',
        ].sort(),
      );
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
    it('uses the shared shell for the label, required marker and validation message', () => {
      const wrapper = mountDropdown({
        errorMessage: 'Machine is required',
        hint: 'Choose a machine',
        id: 'machine-select',
        label: 'Machine',
        required: true,
      });
      const selectBoundary = wrapper.get('.select-stub');

      expect(wrapper.classes()).toEqual(
        expect.arrayContaining([
          'ds-dropdown-list',
          'ds-field',
          'ds-field--block',
          'ds-field--error',
        ]),
      );
      expect(wrapper.get('.ds-field__label').attributes('for')).toBe('machine-select');
      expect(wrapper.get('.ds-field__required').text()).toContain('*');
      expect(wrapper.get('.ds-field__message').text()).toBe('Machine is required');
      expect(wrapper.get('.ds-field__message').attributes('role')).toBe('alert');
      expect(selectBoundary.attributes('role')).toBe('group');
      expect(selectBoundary.attributes('aria-labelledby')).toBe('machine-select-label');
      expect(selectBoundary.attributes('aria-describedby')).toBe('machine-select-message');
      expect(selectBoundary.attributes('aria-invalid')).toBe('true');
    });

    it('uses ariaLabel when no visible label is provided', () => {
      const wrapper = mountDropdown({ ariaLabel: 'Production process' });
      const selectBoundary = wrapper.get('.select-stub');

      expect(wrapper.find('.ds-field__label').exists()).toBe(false);
      expect(selectBoundary.attributes('aria-label')).toBe('Production process');
      expect(selectBoundary.attributes('aria-labelledby')).toBeUndefined();
    });

    it('renders hint text when the field has no error message', () => {
      const wrapper = mountDropdown({ hint: 'Choose the assigned machine' });

      expect(wrapper.get('.ds-field__message').text()).toBe('Choose the assigned machine');
      expect(wrapper.get('.ds-field__message').attributes('role')).toBeUndefined();
      expect(wrapper.classes()).not.toContain('ds-field--error');
    });

    it('lets error take precedence over the requested status', () => {
      const wrapper = mountDropdown({ error: true, status: 'warning' });

      expect(wrapper.getComponent(SelectStub).props('status')).toBe('error');
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

  describe('Select mapping and events', () => {
    it('passes the standard value, options and control props to the wrapped Select', () => {
      const wrapper = mountDropdown({
        autofocus: true,
        clearable: true,
        modelValue: 'alpha',
        placeholder: 'Select a machine',
        searchable: true,
      });
      const select = wrapper.getComponent(SelectStub);

      expect(select.props('value')).toBe('alpha');
      expect(select.props('options')).toEqual(options);
      expect(select.props('allowClear')).toBe(true);
      expect(select.props('autofocus')).toBe(true);
      expect(select.props('placeholder')).toBe('Select a machine');
      expect(select.props('showSearch')).toBe(true);
    });

    it.each([
      { modelValue: undefined, multiple: false },
      { modelValue: [], multiple: true },
    ] as const)(
      'hides the placeholder for an empty readonly value: $modelValue',
      ({ modelValue, multiple }) => {
        const wrapper = mountDropdown({
          modelValue,
          multiple,
          placeholder: 'Select a machine',
          readonly: true,
        });
        const select = wrapper.getComponent(SelectStub);

        expect(select.props('placeholder')).toBeUndefined();
        expect(select.props('disabled')).toBe(false);
      },
    );

    it('emits the standard model and change events exactly once', async () => {
      const wrapper = mountDropdown();

      wrapper.getComponent(SelectStub).vm.$emit('change', 2);
      await nextTick();

      expect(wrapper.emitted('update:modelValue')).toEqual([[2]]);
      expect(wrapper.emitted('change')).toEqual([[2]]);
    });

    it('forwards clear, focus and blur events', async () => {
      const wrapper = mountDropdown();
      const select = wrapper.getComponent(SelectStub);
      const focusEvent = new FocusEvent('focus');
      const blurEvent = new FocusEvent('blur');

      select.vm.$emit('clear');
      select.vm.$emit('focus', focusEvent);
      select.vm.$emit('blur', blurEvent);
      await nextTick();

      expect(wrapper.emitted('clear')).toEqual([[]]);
      expect(wrapper.emitted('focus')).toEqual([[focusEvent]]);
      expect(wrapper.emitted('blur')).toEqual([[blurEvent]]);
    });

    it.each([
      ['small', 'small'],
      ['medium', 'middle'],
      ['large', 'large'],
    ] as const)('maps the %s size to Ant Design Vue %s', (size, antSize) => {
      const wrapper = mountDropdown({ size });

      expect(wrapper.getComponent(SelectStub).props('size')).toBe(antSize);
      expect(wrapper.classes()).toContain(`ds-dropdown-list--${size}`);
    });

    it.each([
      ['default', undefined],
      ['success', undefined],
      ['warning', 'warning'],
      ['error', 'error'],
    ] as const)('maps the %s status without exposing Ant status values', (status, antStatus) => {
      const wrapper = mountDropdown({ status });

      expect(wrapper.getComponent(SelectStub).props('status')).toBe(antStatus);
      expect(wrapper.classes()).toContain(`ds-field--${status}`);
    });

    it('emits the complete multiple-selection array through the Base API', async () => {
      const wrapper = mountDropdown({ modelValue: ['alpha', 2], multiple: true });
      const select = wrapper.getComponent(SelectStub);

      expect(select.props('mode')).toBe('multiple');
      expect(select.props('value')).toEqual(['alpha', 2]);

      select.vm.$emit('change', ['alpha', 2]);
      await nextTick();

      expect(wrapper.emitted('update:modelValue')).toEqual([[['alpha', 2]]]);
      expect(wrapper.emitted('change')).toEqual([[['alpha', 2]]]);
    });

    it('filters searchable options case-insensitively and rejects an undefined option', () => {
      const wrapper = mountDropdown({ searchable: true });
      const filterOption = wrapper
        .getComponent(SelectStub)
        .props('filterOption') as TestFilterOption;

      expect(filterOption('ALP', options[0])).toBe(true);
      expect(filterOption('beta', options[1])).toBe(true);
      expect(filterOption('missing', options[0])).toBe(false);
      expect(filterOption('anything', undefined)).toBe(false);
    });
  });

  describe('interaction semantics', () => {
    it('disabled uses native disabled styling and blocks value mutations', async () => {
      const wrapper = mountDropdown({ clearable: true, disabled: true });
      const select = wrapper.getComponent(SelectStub);

      expect(select.props('disabled')).toBe(true);
      expect(select.props('allowClear')).toBe(false);
      expect(wrapper.classes()).toContain('ds-dropdown-list--disabled');

      select.vm.$emit('change', 'alpha');
      select.vm.$emit('clear');
      await nextTick();

      expect(wrapper.emitted('update:modelValue')).toBeUndefined();
      expect(wrapper.emitted('change')).toBeUndefined();
      expect(wrapper.emitted('clear')).toBeUndefined();
    });

    it('loading disables the Select and blocks value mutations', async () => {
      const wrapper = mountDropdown({ clearable: true, loading: true });
      const select = wrapper.getComponent(SelectStub);
      const selectBoundary = wrapper.get('.select-stub');

      expect(select.props('disabled')).toBe(true);
      expect(select.props('loading')).toBe(true);
      expect(select.props('allowClear')).toBe(false);
      expect(selectBoundary.attributes('aria-busy')).toBe('true');

      select.vm.$emit('change', 'alpha');
      select.vm.$emit('clear');
      await nextTick();

      expect(wrapper.emitted('update:modelValue')).toBeUndefined();
      expect(wrapper.emitted('change')).toBeUndefined();
      expect(wrapper.emitted('clear')).toBeUndefined();
    });

    it('readonly stays enabled and focusable while blocking value mutations', async () => {
      const wrapper = mountDropdown({
        clearable: true,
        modelValue: 'alpha',
        readonly: true,
        searchable: true,
      });
      const select = wrapper.getComponent(SelectStub);
      const combobox = wrapper.get('input[role="combobox"]');
      const selectBoundary = wrapper.get('.select-stub');
      const focusEvent = new FocusEvent('focus');
      const blurEvent = new FocusEvent('blur');

      expect(select.props('disabled')).toBe(false);
      expect(select.props('open')).toBe(false);
      expect(select.props('showSearch')).toBe(false);
      expect(select.props('allowClear')).toBe(false);
      expect(combobox.attributes('disabled')).toBeUndefined();
      expect(selectBoundary.attributes('role')).toBe('group');
      expect(wrapper.classes()).toContain('ds-dropdown-list--readonly');
      expect(wrapper.classes()).not.toContain('ds-dropdown-list--disabled');

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

    it('readonly multiple mode hides Ant removal affordances without disabling the control', () => {
      const style = document.createElement('style');
      style.textContent = dropdownListStyles;
      document.head.append(style);

      try {
        const wrapper = mount(BaseDropdownList, {
          attachTo: document.body,
          props: {
            modelValue: ['alpha', 2],
            multiple: true,
            options,
            readonly: true,
          },
        });
        const outerSelect = wrapper.get('.ant-select');
        const removeControls = wrapper.findAll('.ant-select-selection-item-remove');

        expect(outerSelect.classes()).not.toContain('ant-select-disabled');
        expect(removeControls.length).toBeGreaterThan(0);

        for (const removeControl of removeControls) {
          expect(getComputedStyle(removeControl.element).display).toBe('none');
        }
      } finally {
        style.remove();
      }
    });
  });

  it('uses Ant Select public props and attribute fallthrough for accessible state', async () => {
    const wrapper = mount(BaseDropdownList, {
      props: {
        ariaLabel: 'Machine',
        errorMessage: 'Machine is required',
        id: 'machine-select',
        options,
        required: true,
      },
    });

    const select = wrapper.getComponent(AntSelect);

    expect(select.props('id')).toBe('machine-select');
    expect(select.attributes('role')).toBe('group');
    expect(select.attributes('aria-label')).toBe('Machine');
    expect(select.attributes('aria-invalid')).toBe('true');
    expect(select.attributes('aria-describedby')).toBe('machine-select-message');

    await wrapper.setProps({
      errorMessage: undefined,
      hint: 'Optional machine',
      readonly: true,
      required: false,
    });

    expect(select.attributes('aria-invalid')).toBeUndefined();
    expect(select.attributes('aria-describedby')).toBe('machine-select-message');
    expect(select.props('disabled')).toBe(false);
    expect(select.classes()).not.toContain('ant-select-disabled');
  });
});
