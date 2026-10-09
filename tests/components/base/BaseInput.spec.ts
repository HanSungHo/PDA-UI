import { enableAutoUnmount, mount } from '@vue/test-utils';
import { BaseInput } from 'src/components/base';
import { afterEach, describe, expect, it } from 'vitest';

enableAutoUnmount(afterEach);

describe('BaseInput', () => {
  it('uses the filled Quasar input with documented defaults', () => {
    const wrapper = mount(BaseInput, { props: { label: 'Name', placeholder: 'Placeholder' } });

    expect(wrapper.get('input').attributes('type')).toBe('text');
    expect(wrapper.classes()).toContain('ds-input--medium');
    expect(wrapper.get('input').attributes('aria-label')).toBeUndefined();
    expect(wrapper.get('.q-field__label').text()).toBe('Name');
    expect(wrapper.get('.ds-input__qinput').classes()).toContain('q-field--filled');
    expect(wrapper.get('input').attributes('placeholder')).toBe('Placeholder');
  });

  it('lets Quasar float the label while focused or when the field has a value', async () => {
    const wrapper = mount(BaseInput, { props: { label: 'Name', modelValue: '' } });
    const input = wrapper.get('.ds-input__qinput');

    expect(input.classes()).not.toContain('q-field--float');

    await wrapper.setProps({ modelValue: 'Ada' });
    expect(input.classes()).toContain('q-field--float');
  });

  it('forwards native focus for readonly fields so callers can blur them', () => {
    const wrapper = mount(BaseInput, {
      attachTo: document.body,
      props: { readonly: true, modelValue: 'Read only' },
      attrs: {
        onFocus: (event: FocusEvent) => (event.target as HTMLElement).blur(),
      },
    });
    const input = wrapper.get('input').element as HTMLInputElement;

    input.focus();

    expect(wrapper.emitted('focus')).toHaveLength(1);
    expect(document.activeElement).not.toBe(input);
  });

  it('uses Quasar error styling without adding its default error icon', () => {
    const wrapper = mount(BaseInput, { props: { status: 'error', label: 'Name' } });

    expect(wrapper.get('.ds-input__qinput').classes()).toContain('q-field--error');
    expect(wrapper.find('.q-field__append .q-icon').exists()).toBe(false);
  });

  it('emits v-model updates from input events', async () => {
    const wrapper = mount(BaseInput, { props: { modelValue: '' } });

    await wrapper.get('input').setValue('Nam');

    expect(wrapper.emitted('update:modelValue')).toEqual([['Nam']]);
    expect(wrapper.emitted('input')?.[0]?.[0]).toBe('Nam');
  });

  it('forwards native focus and blur events', () => {
    const wrapper = mount(BaseInput, { attachTo: document.body });
    const input = wrapper.get('input').element as HTMLInputElement;

    input.focus();
    expect(wrapper.emitted('focus')).toHaveLength(1);

    input.blur();
    expect(wrapper.emitted('blur')).toHaveLength(1);
  });

  it('clears the current value when clearable', async () => {
    const wrapper = mount(BaseInput, { props: { modelValue: 'Filled', clearable: true } });

    await wrapper.get('[role="button"][aria-label="Clear"]').trigger('click');

    expect(wrapper.emitted('update:modelValue')).toEqual([[undefined]]);
    expect(wrapper.emitted('clear')).toHaveLength(1);
  });

  it('renders textarea mode with count metadata', () => {
    const wrapper = mount(BaseInput, {
      props: {
        mode: 'textarea',
        modelValue: 'Hello',
        hint: 'Helper Text',
        maxLength: 50,
        showCount: true,
      },
    });

    expect(wrapper.find('textarea').exists()).toBe(true);
    expect(wrapper.get('.ds-input__qinput').classes()).not.toContain('q-textarea--autogrow');
    expect(wrapper.get('textarea').attributes('style')).toContain('resize: none');
    expect(wrapper.text()).toContain('Helper Text');
    expect(wrapper.text()).toContain('5 / 50');
  });

  it('enables textarea resizing only when explicitly requested', () => {
    const wrapper = mount(BaseInput, { props: { mode: 'textarea', resize: 'vertical' } });

    expect(wrapper.get('.ds-input__qinput').classes()).toContain('q-textarea--autogrow');
    expect(wrapper.get('textarea').attributes('style')).toContain('resize: vertical');
  });

  it('forwards Quasar prefix and suffix props', () => {
    const wrapper = mount(BaseInput, {
      attrs: { prefix: '$', suffix: 'USD' },
    });

    expect(wrapper.get('.q-field__prefix').text()).toBe('$');
    expect(wrapper.get('.q-field__suffix').text()).toBe('USD');
  });

  it('treats append and suffix slots as aliases for Quasar append content', () => {
    const appendWrapper = mount(BaseInput, {
      slots: {
        append: { template: '<span class="append-icon">append</span>' },
      },
    });
    const suffixWrapper = mount(BaseInput, {
      slots: {
        suffix: { template: '<span class="suffix-icon">suffix</span>' },
      },
    });
    const bothWrapper = mount(BaseInput, {
      slots: {
        append: { template: '<span class="append-icon">append</span>' },
        suffix: { template: '<span class="suffix-icon">suffix</span>' },
      },
    });

    expect(appendWrapper.get('.q-field__append .append-icon').text()).toBe('append');
    expect(suffixWrapper.get('.q-field__append .suffix-icon').text()).toBe('suffix');
    expect(bothWrapper.get('.q-field__append .append-icon').text()).toBe('append');
    expect(bothWrapper.find('.q-field__append .suffix-icon').exists()).toBe(false);
  });

  it('locks value updates while disabled', async () => {
    const wrapper = mount(BaseInput, { props: { disabled: true, modelValue: 'Locked' } });

    expect(wrapper.get('input').attributes('disabled')).toBeDefined();
    await wrapper.get('input').trigger('input');

    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  });

  it('converts numeric input values to numbers', async () => {
    const wrapper = mount(BaseInput, { props: { type: 'number', modelValue: undefined } });

    await wrapper.get('input').setValue('42');

    expect(wrapper.emitted('update:modelValue')).toEqual([[42]]);
    expect(wrapper.emitted('input')?.[0]?.[0]).toBe(42);
  });

  it('uses empty-string clear behavior for the field compatibility option', async () => {
    const wrapper = mount(BaseInput, { props: { modelValue: 'Filled', allowClear: true } });

    await wrapper.get('[role="button"][aria-label="Clear"]').trigger('click');

    expect(wrapper.emitted('update:modelValue')).toEqual([['']]);
    expect(wrapper.emitted('clear')).toHaveLength(1);
  });

  it('forwards native attributes and preserves the caller-provided input id', () => {
    const wrapper = mount(BaseInput, {
      attrs: { autocapitalize: 'characters', 'data-testid': 'machine-field' },
      props: {
        id: 'machine-id',
        name: 'machine',
        autocomplete: 'off',
        maxLength: 20,
      },
    });
    const input = wrapper.get('input');

    expect(input.attributes('id')).toBe('machine-id');
    expect(input.attributes('name')).toBe('machine');
    expect(input.attributes('autocomplete')).toBe('off');
    expect(input.attributes('maxlength')).toBe('20');
    expect(input.attributes('autocapitalize')).toBe('characters');
    expect(wrapper.attributes('data-testid')).toBe('machine-field');
  });

  it('supports horizontal field layout', () => {
    const wrapper = mount(BaseInput, { props: { layout: 'horizontal' } });

    expect(wrapper.classes()).toContain('ds-field--horizontal');
  });
});
