import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { mount } from '@vue/test-utils';
import { baseTextAreaFieldDefaults } from 'components/base/text-area-field';
import BaseTextAreaField from 'components/base/text-area-field/BaseTextAreaField.vue';
import { describe, expect, it } from 'vitest';
import { nextTick, ref } from 'vue';

describe('BaseTextAreaField', () => {
  it('exports documented defaults from the text-area-field module', () => {
    expect(baseTextAreaFieldDefaults).toMatchObject({
      disabled: false,
      errorMessage: '',
      hint: '',
      layout: 'vertical',
      modelValue: '',
      placeholder: '',
      required: false,
      showCount: false,
    });
  });

  it('renders the vertical layout by default with label, placeholder, and helper text', () => {
    const wrapper = mount(BaseTextAreaField, {
      props: {
        hint: 'Helper Text',
        label: 'Label text',
        modelValue: '',
        placeholder: 'Placeholder',
      },
    });

    try {
      expect(wrapper.classes()).toContain('base-text-area-field--vertical');
      expect(wrapper.classes()).toContain('ds-field');
      expect(wrapper.classes()).toContain('ds-text-area-field');
      expect(wrapper.classes()).toContain('ds-field--vertical');
      expect(wrapper.text()).toContain('Label text');
      expect(wrapper.text()).toContain('Helper Text');
      expect(wrapper.get('textarea').attributes('placeholder')).toBe('Placeholder');
    } finally {
      wrapper.unmount();
    }
  });

  it('renders the horizontal layout when requested', () => {
    const wrapper = mount(BaseTextAreaField, {
      props: {
        label: 'Label text',
        layout: 'horizontal',
        modelValue: '',
      },
    });

    try {
      expect(wrapper.classes()).toContain('base-text-area-field--horizontal');
      expect(wrapper.classes()).toContain('ds-field--horizontal');
    } finally {
      wrapper.unmount();
    }
  });

  it('keeps the horizontal label top-aligned with the textarea control', () => {
    const css = readFileSync(
      join(process.cwd(), 'src/components/base/text-area-field/base-text-area-field.css'),
      'utf8',
    );
    const horizontalHeaderRule = css.match(
      /\.ds-text-area-field\.ds-field--horizontal \.ds-field__header \{[^}]+\}/,
    )?.[0];

    expect(horizontalHeaderRule).toContain('align-items: flex-start');
    expect(horizontalHeaderRule).not.toContain('min-height');
  });

  it('uses only design-system tokens in component styles', () => {
    const css = readFileSync(
      join(process.cwd(), 'src/components/base/text-area-field/base-text-area-field.css'),
      'utf8',
    );

    expect(css).not.toContain('var(--figma-');
  });

  it('uses shared field shell wiring for label, helper message, and textarea accessibility', () => {
    const wrapper = mount(BaseTextAreaField, {
      props: {
        hint: 'Helper Text',
        id: 'description',
        label: 'Label text',
        modelValue: '',
      },
    });

    try {
      const textarea = wrapper.get('textarea');

      expect(wrapper.get('.ds-field__label').attributes('for')).toBe('description');
      expect(wrapper.get('.ds-field__message').attributes('id')).toBe('description-message');
      expect(textarea.attributes('aria-labelledby')).toBe('description-label');
      expect(textarea.attributes('aria-describedby')).toBe('description-message');
    } finally {
      wrapper.unmount();
    }
  });

  it('emits model updates when the user types', async () => {
    const wrapper = mount(BaseTextAreaField, {
      props: {
        modelValue: '',
      },
    });

    try {
      await wrapper.get('textarea').setValue('Long note');

      expect(wrapper.emitted('update:modelValue')).toEqual([['Long note']]);
    } finally {
      wrapper.unmount();
    }
  });

  it('uses error state when error text is provided', () => {
    const wrapper = mount(BaseTextAreaField, {
      props: {
        errorMessage: 'Helper Text',
        hint: 'Neutral helper',
        modelValue: '',
      },
    });

    try {
      expect(wrapper.classes()).toContain('base-text-area-field--error');
      expect(wrapper.text()).toContain('Helper Text');
      expect(wrapper.text()).not.toContain('Neutral helper');
    } finally {
      wrapper.unmount();
    }
  });

  it('passes disabled state to the underlying textarea', () => {
    const wrapper = mount(BaseTextAreaField, {
      props: {
        disabled: true,
        modelValue: '',
      },
    });

    try {
      expect(wrapper.classes()).toContain('base-text-area-field--disabled');
      expect(wrapper.get('textarea').attributes()).toHaveProperty('disabled');
    } finally {
      wrapper.unmount();
    }
  });

  it('uses focus state while the underlying textarea is focused', async () => {
    const wrapper = mount(BaseTextAreaField, {
      props: {
        modelValue: '',
      },
    });

    try {
      await wrapper.get('textarea').trigger('focus');

      expect(wrapper.classes()).toContain('base-text-area-field--focus');
      expect(wrapper.attributes('data-state')).toBe('focus');
    } finally {
      wrapper.unmount();
    }
  });

  it('supports the Storybook editable args pattern without remounting the textarea', async () => {
    const wrapper = mount({
      components: { BaseTextAreaField },
      setup() {
        const value = ref('');
        const args = {
          hint: 'Helper Text',
          label: 'Label text',
          placeholder: 'Placeholder',
        };

        return { args, value };
      },
      template: '<BaseTextAreaField v-bind="args" v-model="value" />',
    });

    try {
      await wrapper.get('textarea').setValue('Long note');
      await nextTick();
      await nextTick();

      expect(wrapper.get('textarea').element.value).toBe('Long note');
    } finally {
      wrapper.unmount();
    }
  });
});
