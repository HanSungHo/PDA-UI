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
    expect(wrapper.get('.ds-field__label').text()).toBe('Name');
    expect(wrapper.get('.ds-input__qinput').classes()).toContain('q-field--filled');
    expect(wrapper.get('input').attributes('placeholder')).toBe('Placeholder');
  });

  it('keeps the label outside the control when the field has a value', async () => {
    const wrapper = mount(BaseInput, { props: { label: 'Name', modelValue: '' } });
    const input = wrapper.get('.ds-input__qinput');

    expect(wrapper.find('.q-field__label').exists()).toBe(false);
    expect(wrapper.get('.ds-field__label').text()).toBe('Name');

    await wrapper.setProps({ modelValue: 'Ada' });
    expect(input.find('.q-field__label').exists()).toBe(false);
    expect(wrapper.get('.ds-field__label').text()).toBe('Name');
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
    expect(wrapper.get('input').attributes('aria-invalid')).toBe('true');
    expect(wrapper.find('.q-field__append .q-icon').exists()).toBe(false);
  });

  it('applies the semantic tone to the shared input root', () => {
    const wrapper = mount(BaseInput, { props: { tone: 'warning-subtle' } });

    expect(wrapper.classes()).toContain('ds-input--tone-warning-subtle');
  });

  it('supports optional bold text and truncation presentation', () => {
    const wrapper = mount(BaseInput, { props: { fontWeight: 'bold', truncate: true } });

    expect(wrapper.classes()).toContain('ds-input--font-weight-bold');
    expect(wrapper.classes()).toContain('ds-input--truncate');
  });

  it('keeps regular, untruncated presentation by default', () => {
    const wrapper = mount(BaseInput);

    expect(wrapper.classes()).not.toContain('ds-input--font-weight-bold');
    expect(wrapper.classes()).not.toContain('ds-input--truncate');
  });

  it('supports an error text tone without setting field error status', () => {
    const wrapper = mount(BaseInput, { props: { tone: 'error-text' } });

    expect(wrapper.classes()).toContain('ds-input--tone-error-text');
    expect(wrapper.classes()).toContain('ds-field--default');
  });

  it('emits v-model updates from input events', async () => {
    const wrapper = mount(BaseInput, { props: { modelValue: '' } });

    await wrapper.get('input').setValue('Nam');

    expect(wrapper.emitted('update:modelValue')).toEqual([['Nam']]);
    expect(wrapper.emitted('input')?.[0]?.[0]).toBe('Nam');
  });

  it('forwards focus and blur events from the input', async () => {
    const wrapper = mount(BaseInput);
    const input = wrapper.get('input');

    await input.trigger('focusin');
    expect(wrapper.emitted('focus')).toHaveLength(1);

    await input.trigger('focusout');
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

  it.each(['input', 'textarea'] as const)('links an external label in %s mode', (mode) => {
    const wrapper = mount(BaseInput, {
      props: {
        ...(mode === 'textarea' ? { mode: 'textarea' as const } : { mode: 'input' as const }),
        id: 'name',
        label: 'Name',
        hint: 'Helper Text',
        required: true,
      },
    });
    const control = wrapper.get(mode === 'textarea' ? 'textarea' : 'input');

    expect(wrapper.get('.ds-field__label').attributes('for')).toBe('name');
    expect(control.attributes('aria-labelledby')).toBe('name-label');
    expect(control.attributes('aria-describedby')).toBe('name-message');
    expect(control.attributes('aria-required')).toBe('true');
    expect(wrapper.find('.q-field__label').exists()).toBe(false);
    expect(wrapper.classes()).not.toContain('ds-input--textarea-labeled');
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
    const wrapper = mount(BaseInput, {
      props: { layout: 'horizontal', id: 'horizontal', label: 'Name', hint: 'Helper Text' },
    });

    expect(wrapper.classes()).toContain('ds-field--horizontal');
    expect(wrapper.get('.ds-field__label').attributes('for')).toBe('horizontal');
    expect(wrapper.get('input').attributes('aria-labelledby')).toBe('horizontal-label');
    expect(wrapper.get('input').attributes('aria-describedby')).toBe('horizontal-message');
  });

  it('provides an accessible name without a visible label in either layout', () => {
    for (const layout of ['vertical', 'horizontal'] as const) {
      const wrapper = mount(BaseInput, { props: { layout, ariaLabel: 'Search' } });

      expect(wrapper.get('input').attributes('aria-label')).toBe('Search');
      expect(wrapper.get('input').attributes('aria-labelledby')).toBeUndefined();
    }
  });

  it('prioritizes error messages over hints and links the alert to the control', () => {
    const wrapper = mount(BaseInput, {
      props: { id: 'error', hint: 'Hint', errorMessage: 'Required' },
    });

    expect(wrapper.get('[role="alert"]').text()).toBe('Required');
    expect(wrapper.get('input').attributes('aria-invalid')).toBe('true');
    expect(wrapper.get('input').attributes('aria-describedby')).toBe('error-message');
  });

  it.each(['readonly', 'loading'] as const)('locks model and change events while %s', (state) => {
    const wrapper = mount(BaseInput, { props: { [state]: true, modelValue: 'Locked' } });
    const input = wrapper.getComponent({ name: 'QInput' });

    input.vm.$emit('update:modelValue', 'Changed');
    input.vm.$emit('change', 'Changed');

    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    expect(wrapper.emitted('change')).toBeUndefined();
    if (state === 'loading') {
      expect(wrapper.get('input').attributes('aria-busy')).toBe('true');
      expect(wrapper.get('input').attributes('disabled')).toBeDefined();
    } else {
      expect(wrapper.get('input').attributes('readonly')).toBeDefined();
      expect(wrapper.get('input').attributes('disabled')).toBeUndefined();
    }
  });

  it('exposes focus and select for callers', () => {
    const wrapper = mount(BaseInput, {
      attachTo: document.body,
      props: { modelValue: 'Select me' },
    });
    const input = wrapper.get('input').element as HTMLInputElement;

    wrapper.vm.focus();
    expect(document.activeElement).toBe(input);
    wrapper.vm.select();
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(9);
  });

  it('forwards textarea rows and maximum length', () => {
    const wrapper = mount(BaseInput, { props: { mode: 'textarea', rows: 4, maxLength: 50 } });

    expect(wrapper.get('textarea').attributes('rows')).toBe('4');
    expect(wrapper.get('textarea').attributes('maxlength')).toBe('50');
  });
});
