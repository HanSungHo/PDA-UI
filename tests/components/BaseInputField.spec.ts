import { mount } from '@vue/test-utils';
import { baseInputFieldDefaults } from 'components/base/input-field';
import BaseInputField from 'components/base/input-field/BaseInputField.vue';
import { describe, expect, it } from 'vitest';
import { nextTick, ref } from 'vue';

const PrefixIcon = {
  template: '<span class="test-prefix-icon" />',
};

describe('BaseInputField', () => {
  it('exports documented defaults from the input-field module', () => {
    expect(baseInputFieldDefaults).toMatchObject({
      allowClear: false,
      disabled: false,
      errorMessage: '',
      hint: '',
      layout: 'vertical',
      modelValue: '',
      placeholder: '',
      required: false,
      showCount: false,
      type: 'text',
    });
  });

  it('renders the vertical layout by default with label, placeholder, and helper text', () => {
    const wrapper = mount(BaseInputField, {
      props: {
        hint: 'Helper Text',
        label: 'Label text',
        modelValue: '',
        placeholder: 'Placeholder',
      },
    });

    try {
      expect(wrapper.classes()).toContain('base-input-field--vertical');
      expect(wrapper.classes()).toContain('ds-field');
      expect(wrapper.classes()).toContain('ds-input-field');
      expect(wrapper.classes()).toContain('ds-field--vertical');
      expect(wrapper.text()).toContain('Label text');
      expect(wrapper.get('input').attributes('placeholder')).toBe('Placeholder');
    } finally {
      wrapper.unmount();
    }
  });

  it('renders the horizontal layout when requested', () => {
    const wrapper = mount(BaseInputField, {
      props: {
        label: 'Label text',
        layout: 'horizontal',
        modelValue: '',
      },
    });

    try {
      expect(wrapper.classes()).toContain('base-input-field--horizontal');
      expect(wrapper.classes()).toContain('ds-field--horizontal');
    } finally {
      wrapper.unmount();
    }
  });

  it('uses shared field shell wiring for label, helper message, and input accessibility', () => {
    const wrapper = mount(BaseInputField, {
      props: {
        hint: 'Helper Text',
        id: 'user-name',
        label: 'Label text',
        modelValue: '',
      },
    });

    try {
      const input = wrapper.get('input');

      expect(wrapper.get('.ds-field__label').attributes('for')).toBe('user-name');
      expect(wrapper.get('.ds-field__message').attributes('id')).toBe('user-name-message');
      expect(input.attributes('aria-labelledby')).toBe('user-name-label');
      expect(input.attributes('aria-describedby')).toBe('user-name-message');
    } finally {
      wrapper.unmount();
    }
  });

  it('emits model updates when the user types', async () => {
    const wrapper = mount(BaseInputField, {
      props: {
        modelValue: '',
      },
    });

    try {
      await wrapper.get('input').setValue('Alice');

      expect(wrapper.emitted('update:modelValue')).toEqual([['Alice']]);
    } finally {
      wrapper.unmount();
    }
  });

  it('uses error state when error text is provided', () => {
    const wrapper = mount(BaseInputField, {
      props: {
        errorMessage: 'Helper Text',
        hint: 'Neutral helper',
        modelValue: '',
      },
    });

    try {
      expect(wrapper.classes()).toContain('base-input-field--error');
      expect(wrapper.text()).toContain('Helper Text');
      expect(wrapper.text()).not.toContain('Neutral helper');
    } finally {
      wrapper.unmount();
    }
  });

  it('passes disabled state to the underlying input', () => {
    const wrapper = mount(BaseInputField, {
      props: {
        disabled: true,
        modelValue: '',
      },
    });

    try {
      expect(wrapper.classes()).toContain('base-input-field--disabled');
      expect(wrapper.get('input').attributes()).toHaveProperty('disabled');
    } finally {
      wrapper.unmount();
    }
  });

  it('renders password mode as a password input', () => {
    const wrapper = mount(BaseInputField, {
      props: {
        modelValue: '',
        type: 'password',
      },
    });

    try {
      expect(wrapper.get('input').attributes('type')).toBe('password');
    } finally {
      wrapper.unmount();
    }
  });

  it('renders a clear button when allowClear is enabled and the input has content', () => {
    const wrapper = mount(BaseInputField, {
      props: {
        allowClear: true,
        modelValue: 'Alice',
      },
    });

    try {
      expect(wrapper.find('.base-input-field__clear').exists()).toBe(true);
    } finally {
      wrapper.unmount();
    }
  });

  it('renders required marker and custom prefix icon', () => {
    const wrapper = mount(BaseInputField, {
      props: {
        label: 'Label text',
        modelValue: '',
        prefixIcon: PrefixIcon,
        required: true,
      },
    });

    try {
      expect(wrapper.find('.ds-field__required').text()).toBe('*');
      expect(wrapper.find('.test-prefix-icon').exists()).toBe(true);
    } finally {
      wrapper.unmount();
    }
  });

  it('uses focus state while the underlying input is focused', async () => {
    const wrapper = mount(BaseInputField, {
      props: {
        modelValue: '',
      },
    });

    try {
      await wrapper.get('input').trigger('focus');

      expect(wrapper.classes()).toContain('base-input-field--focus');
      expect(wrapper.attributes('data-state')).toBe('focus');
    } finally {
      wrapper.unmount();
    }
  });

  it('supports the Storybook editable args pattern without remounting the Ant input', async () => {
    const wrapper = mount({
      components: { BaseInputField },
      setup() {
        const value = ref('');
        const args = {
          hint: 'Helper Text',
          label: 'Label text',
          placeholder: 'Placeholder',
        };

        return { args, value };
      },
      template: '<BaseInputField v-bind="args" v-model="value" />',
    });

    try {
      await wrapper.get('input').setValue('Alice');
      await nextTick();
      await nextTick();

      expect(wrapper.get('input').element.value).toBe('Alice');
    } finally {
      wrapper.unmount();
    }
  });

  it('renders safely when a static story omits modelValue', () => {
    const wrapper = mount(BaseInputField, {
      props: {
        hint: 'Helper Text',
        label: 'Label text',
        placeholder: 'Placeholder',
      },
    });

    try {
      expect(wrapper.get('input').element.value).toBe('');
      expect(wrapper.attributes('data-state')).toBe('default');
    } finally {
      wrapper.unmount();
    }
  });
});
