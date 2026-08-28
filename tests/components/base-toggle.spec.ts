import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';

import { BaseToggle as ExportedBaseToggle } from '../../src/components/base/toggle';
import BaseToggle from '../../src/components/base/toggle/BaseToggle.vue';

const ASwitchStub = defineComponent({
  name: 'ASwitch',
  inheritAttrs: false,
  props: {
    checked: { type: Boolean, required: true },
    disabled: { type: Boolean, required: true },
    loading: { type: Boolean, required: true },
    size: { type: String, required: true },
    checkedValue: { type: [Boolean, String, Number], required: true },
    uncheckedValue: { type: [Boolean, String, Number], required: true },
  },
  emits: ['update:checked', 'change', 'focus', 'blur'],
  setup(props, { attrs, emit }) {
    return () =>
      h(
        'button',
        {
          ...attrs,
          class: 'switch-stub',
          disabled: props.disabled,
          'data-checked': String(props.checked),
          'data-loading': String(props.loading),
          'data-size': props.size,
          onClick: (event: MouseEvent) => {
            const value = props.checked ? props.uncheckedValue : props.checkedValue;
            emit('update:checked', value);
            emit('change', value, event);
          },
          onFocus: (event: FocusEvent) => emit('focus', event),
          onBlur: (event: FocusEvent) => emit('blur', event),
        },
        props.checked ? 'ON' : 'OFF',
      );
  },
});

function factory(props: Record<string, unknown> = {}) {
  return mount(BaseToggle, {
    props: { modelValue: false, ...props },
    global: { stubs: { ASwitch: ASwitchStub } },
  });
}

describe('BaseToggle', () => {
  it('exports the component through the design-system barrel', () => {
    expect(ExportedBaseToggle).toBe(BaseToggle);
  });

  describe('public API contract', () => {
    it('exposes exactly the documented BaseToggle props (no Ant leak)', () => {
      const wrapper = factory();

      expect(Object.keys(wrapper.props()).sort()).toEqual(
        [
          'ariaLabel',
          'block',
          'checkedText',
          'disabled',
          'error',
          'errorMessage',
          'hint',
          'id',
          'label',
          'labelPlacement',
          'loading',
          'modelValue',
          'checkedValue',
          'uncheckedValue',
          'variant',
          'readonly',
          'required',
          'size',
          'status',
          'uncheckedText',
        ].sort(),
      );
    });

    it('never re-emits the Ant-native "update:checked" event name', async () => {
      const wrapper = factory();
      await wrapper.get('.switch-stub').trigger('click');
      expect(Object.keys(wrapper.emitted())).not.toContain('update:checked');
    });

    it('applies every documented default value when optional props are omitted', () => {
      const wrapper = factory();
      expect(wrapper.props('size')).toBe('medium');
      expect(wrapper.props('variant')).toBe('text');
      expect(wrapper.props('checkedValue')).toBe(true);
      expect(wrapper.props('uncheckedValue')).toBe(false);
      expect(wrapper.props('status')).toBe('default');
      expect(wrapper.props('disabled')).toBe(false);
      expect(wrapper.props('readonly')).toBe(false);
      expect(wrapper.props('loading')).toBe(false);
      expect(wrapper.props('labelPlacement')).toBe('end');
    });
  });

  describe('rendering', () => {
    it('renders label to the right by default (labelPlacement="end")', () => {
      const wrapper = factory({ label: 'Auto Scan' });
      const row = wrapper.get('.ds-toggle__row');
      const children = row.element.children;
      expect(children[0].className).toContain('switch-stub');
      expect(wrapper.text()).toContain('Auto Scan');
    });

    it('renders label to the left when labelPlacement="start"', () => {
      const wrapper = factory({ label: 'Auto Scan', labelPlacement: 'start' });
      const row = wrapper.get('.ds-toggle__row');
      const children = row.element.children;
      expect(children[0].tagName).toBe('LABEL');
    });

    it('renders required marker', () => {
      const wrapper = factory({ label: 'Required Toggle', required: true });
      expect(wrapper.get('.ds-toggle__required').text()).toBe('*');
    });

    it('renders checked/unchecked display text reactively', async () => {
      const wrapper = factory({ checkedText: 'ACTIVE', uncheckedText: 'INACTIVE' });
      expect(wrapper.get('.ds-toggle__state').text()).toBe('INACTIVE');
      await wrapper.setProps({ modelValue: true });
      expect(wrapper.get('.ds-toggle__state').text()).toBe('ACTIVE');
    });

    it('does not render the state label when neither checkedText nor uncheckedText is set', () => {
      expect(factory().find('.ds-toggle__state').exists()).toBe(false);
    });

    it('renders the icon-only variant with two press options', () => {
      const wrapper = factory({ variant: 'icon', modelValue: true });

      expect(wrapper.get('.ds-toggle__icon').attributes('role')).toBe('group');
      expect(wrapper.findAll('.ds-toggle__icon-option')).toHaveLength(2);
      expect(wrapper.findAll('.ds-toggle__icon-option--selected')).toHaveLength(1);
    });

    it('updates the model from segmented and icon variants', async () => {
      const segmented = factory({ variant: 'segmented', modelValue: false });
      await segmented.findAll('.ds-toggle__segment')[0].trigger('click');
      expect(segmented.emitted('update:modelValue')).toEqual([[true]]);
      await segmented.setProps({ modelValue: true });
      await segmented.findAll('.ds-toggle__segment')[1].trigger('click');
      expect(segmented.emitted('update:modelValue')).toEqual([[true], [false]]);

      const icon = factory({ variant: 'icon', modelValue: false });
      await icon.findAll('.ds-toggle__icon-option')[0].trigger('click');
      expect(icon.emitted('update:modelValue')).toEqual([[true]]);
      await icon.setProps({ modelValue: true });
      await icon.findAll('.ds-toggle__icon-option')[1].trigger('click');
      expect(icon.emitted('update:modelValue')).toEqual([[true], [false]]);
    });

    it('renders segmented alt and icon-only segmented variants', () => {
      const alt = factory({ variant: 'segmented-alt', modelValue: false });
      expect(alt.get('.ds-toggle__segmented--alt')).toBeTruthy();
      expect(alt.text()).toContain('Published');
      expect(alt.text()).toContain('Unpublished');

      const icon = factory({ variant: 'segmented-icon', modelValue: true });
      expect(icon.get('.ds-toggle__segmented--icon')).toBeTruthy();
      expect(icon.findAll('.ds-toggle__segment-icon')).toHaveLength(2);
    });

    it('renders publish as one sliding control with both labels', async () => {
      const wrapper = factory({ variant: 'segmented', modelValue: false });
      const control = wrapper.get('.ds-toggle__segmented');

      expect(wrapper.findAll('.ds-toggle__segmented')).toHaveLength(1);
      expect(control.text()).toContain('Published');
      expect(control.text()).toContain('Unpublished');

      await control.findAll('.ds-toggle__segment')[0].trigger('click');
      expect(wrapper.emitted('update:modelValue')).toEqual([[true]]);
    });
  });

  describe('v-model and events', () => {
    it('emits update:modelValue with a normalized boolean', async () => {
      const wrapper = factory({ modelValue: false });
      await wrapper.get('.switch-stub').trigger('click');
      expect(wrapper.emitted('update:modelValue')).toEqual([[true]]);
    });

    it('normalizes custom Ant values and forwards both configured values', async () => {
      const wrapper = factory({ checkedValue: 'Y', uncheckedValue: 'N' });
      const control = wrapper.get('.switch-stub');
      const switchStub = wrapper.getComponent(ASwitchStub);

      expect(switchStub.props('checkedValue')).toBe('Y');
      expect(switchStub.props('uncheckedValue')).toBe('N');
      await control.trigger('click');
      expect(wrapper.emitted('update:modelValue')).toEqual([[true]]);
    });

    it('emits change with the normalized boolean and the original Event', async () => {
      const wrapper = factory();
      await wrapper.get('.switch-stub').trigger('click');
      expect(wrapper.emitted('change')?.[0]?.[0]).toBe(true);
      expect(wrapper.emitted('change')?.[0]?.[1]).toBeInstanceOf(Event);
    });

    it('forwards focus and blur', async () => {
      const wrapper = factory();
      const control = wrapper.get('.switch-stub');
      await control.trigger('focus');
      await control.trigger('blur');
      expect(wrapper.emitted('focus')).toHaveLength(1);
      expect(wrapper.emitted('blur')).toHaveLength(1);
    });
  });

  describe('interaction semantics: disabled vs readonly vs loading', () => {
    it('disabled: sets native Ant disabled and blocks update + change', async () => {
      const wrapper = factory({ disabled: true });
      const control = wrapper.get('.switch-stub');
      expect(control.attributes('disabled')).toBeDefined();
      await control.trigger('click');
      expect(wrapper.emitted('update:modelValue')).toBeUndefined();
      expect(wrapper.emitted('change')).toBeUndefined();
    });

    it('loading: sets native Ant disabled, aria-busy, and blocks update + change', async () => {
      const wrapper = factory({ loading: true });
      const control = wrapper.get('.switch-stub');
      expect(control.attributes('disabled')).toBeDefined();
      expect(control.attributes('aria-busy')).toBe('true');
      await control.trigger('click');
      expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    });

    it('readonly: keeps the Ant control natively enabled but still blocks update + change', async () => {
      const wrapper = factory({ readonly: true });
      const control = wrapper.get('.switch-stub');
      expect(control.attributes('disabled')).toBeUndefined();
      expect(control.attributes('aria-readonly')).toBe('true');
      expect(wrapper.classes()).toContain('ds-toggle--readonly');
      await control.trigger('click');
      expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    });
  });

  describe('size mapping', () => {
    it('maps size="small" to Ant size "small"', () => {
      expect(factory({ size: 'small' }).get('.switch-stub').attributes('data-size')).toBe('small');
    });

    it.each(['medium', 'large'] as const)('maps size="%s" to Ant size "default"', (size) => {
      expect(factory({ size }).get('.switch-stub').attributes('data-size')).toBe('default');
    });

    it.each(['small', 'medium', 'large'] as const)(
      'applies the ds-toggle--%s field class',
      (size) => {
        expect(factory({ size }).classes()).toContain(`ds-toggle--${size}`);
      },
    );
  });

  describe('validation, status and accessibility', () => {
    it('renders an error message with alert role and correct ARIA wiring', () => {
      const wrapper = factory({
        id: 'notification',
        label: 'Notification',
        errorMessage: 'Required',
      });
      const control = wrapper.get('.switch-stub');
      expect(wrapper.get('[role="alert"]').text()).toBe('Required');
      expect(wrapper.classes()).toContain('ds-field--error');
      expect(control.attributes('aria-labelledby')).toBe('notification-label');
      expect(control.attributes('aria-describedby')).toBe('notification-message');
      expect(control.attributes('aria-invalid')).toBe('true');
    });

    it('sets aria-required only when required is true', () => {
      expect(factory({ required: true }).get('.switch-stub').attributes('aria-required')).toBe(
        'true',
      );
      expect(
        factory({ required: false }).get('.switch-stub').attributes('aria-required'),
      ).toBeUndefined();
    });

    it('uses ariaLabel and omits aria-labelledby when no visible label is provided', () => {
      const wrapper = factory({ ariaLabel: 'Accessible toggle' });
      const control = wrapper.get('.switch-stub');
      expect(control.attributes('aria-label')).toBe('Accessible toggle');
      expect(control.attributes('aria-labelledby')).toBeUndefined();
    });

    it.each(['success', 'warning'] as const)('applies the ds-field--%s status class', (status) => {
      expect(factory({ status }).classes()).toContain(`ds-field--${status}`);
    });

    it('applies the block class when block is true', () => {
      expect(factory({ block: true }).classes()).toContain('ds-field--block');
    });
  });
});
