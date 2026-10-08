import { mount } from '@vue/test-utils';
import { Quasar } from 'quasar';
import { describe, expect, it } from 'vitest';
import { h } from 'vue';

import type { BaseChipProps } from '~/components/base';
import BaseChip from '~/components/base/chip/BaseChip.vue';

/** Minimal icon component used to verify before/after icon slots. */
const IconStub = { render: () => h('svg', { 'data-test': 'icon' }) };

function factory(props: Partial<BaseChipProps> = {}) {
  return mount(BaseChip, {
    props: { label: 'Chip', ...props },
    // Quasar plugin is required, otherwise QChip does not render properly.
    global: { plugins: [Quasar] },
  });
}

describe('BaseChip', () => {
  describe('rendering', () => {
    it('renders the label even when modelValue is false (regression: QChip modelValue = visibility)', () => {
      const wrapper = factory({ modelValue: false });

      expect(wrapper.exists()).toBe(true);
      expect(wrapper.text()).toBe('Chip');
    });

    it('renders the label only once', () => {
      const wrapper = factory({ beforeIcon: IconStub, afterIcon: IconStub });

      expect(wrapper.findAll('.ds-chip__label')).toHaveLength(1);
      expect(wrapper.text()).toBe('Chip');
    });

    it('uses label as aria-label', () => {
      expect(factory({ label: 'Filter' }).attributes('aria-label')).toBe('Filter');
    });

    it('exposes role="button"', () => {
      expect(factory().attributes('role')).toBe('button');
    });
  });

  describe('size', () => {
    it('defaults to medium', () => {
      expect(factory().classes()).toContain('ds-chip--medium');
    });

    it.each(['small', 'medium'] as const)('applies the %s size class', (size) => {
      const classes = factory({ size }).classes();

      expect(classes).toContain('ds-chip');
      expect(classes).toContain(`ds-chip--${size}`);
    });
  });

  describe('selected state', () => {
    it('is not selected by default', () => {
      const wrapper = factory();

      expect(wrapper.classes()).not.toContain('ds-chip--selected');
      expect(wrapper.attributes('aria-pressed')).toBe('false');
    });

    it('is selected when modelValue is true', () => {
      const wrapper = factory({ modelValue: true });

      expect(wrapper.classes()).toContain('ds-chip--selected');
      expect(wrapper.attributes('aria-pressed')).toBe('true');
    });

    it('does not render the default Quasar tick icon when selected', () => {
      const wrapper = factory({ modelValue: true });

      expect(wrapper.find('.q-chip__icon').exists()).toBe(false);
    });

    it('updates when modelValue prop changes', async () => {
      const wrapper = factory({ modelValue: false });

      await wrapper.setProps({ modelValue: true });
      expect(wrapper.classes()).toContain('ds-chip--selected');

      await wrapper.setProps({ modelValue: false });
      expect(wrapper.classes()).not.toContain('ds-chip--selected');
    });
  });

  describe('interaction', () => {
    it('emits update:modelValue(true) and click when clicking an unselected chip', async () => {
      const wrapper = factory({ modelValue: false });

      await wrapper.trigger('click');

      expect(wrapper.emitted('update:modelValue')).toEqual([[true]]);
      expect(wrapper.emitted('click')).toHaveLength(1);
    });

    it('emits update:modelValue(false) when clicking a selected chip', async () => {
      const wrapper = factory({ modelValue: true });

      await wrapper.trigger('click');

      expect(wrapper.emitted('update:modelValue')).toEqual([[false]]);
    });

    it('toggles with the Enter key', async () => {
      const wrapper = factory({ modelValue: false });

      await wrapper.trigger('keyup.enter');

      expect(wrapper.emitted('update:modelValue')).toEqual([[true]]);
    });

    it('emits focus and blur', async () => {
      const wrapper = factory();

      await wrapper.trigger('focus');
      await wrapper.trigger('blur');

      expect(wrapper.emitted('focus')).toHaveLength(1);
      expect(wrapper.emitted('blur')).toHaveLength(1);
    });
  });

  describe('disabled state', () => {
    it('applies the disabled class and aria-disabled', () => {
      const wrapper = factory({ disabled: true });

      expect(wrapper.classes()).toContain('disabled');
      expect(wrapper.attributes('aria-disabled')).toBe('true');
    });

    it('is not disabled by default', () => {
      const wrapper = factory();

      expect(wrapper.classes()).not.toContain('disabled');
      expect(wrapper.attributes('aria-disabled')).toBe('false');
    });

    it('does not emit anything when clicked', async () => {
      const wrapper = factory({ disabled: true });

      await wrapper.trigger('click');

      expect(wrapper.emitted('update:modelValue')).toBeUndefined();
      expect(wrapper.emitted('click')).toBeUndefined();
    });

    it('keeps the selected class when disabled + selected', () => {
      const wrapper = factory({ disabled: true, modelValue: true });

      expect(wrapper.classes()).toEqual(expect.arrayContaining(['disabled', 'ds-chip--selected']));
    });
  });

  describe('icons', () => {
    it('renders no icon by default', () => {
      expect(factory().find('.ds-chip__icon').exists()).toBe(false);
    });

    it('renders the before icon before the label', () => {
      const wrapper = factory({ beforeIcon: IconStub });
      const icon = wrapper.find('.ds-chip__icon--before');

      expect(icon.exists()).toBe(true);
      expect(wrapper.find('.ds-chip__icon--after').exists()).toBe(false);

      const html = wrapper.html();
      expect(html.indexOf('ds-chip__icon--before')).toBeLessThan(html.indexOf('ds-chip__label'));
    });

    it('renders the after icon after the label', () => {
      const wrapper = factory({ afterIcon: IconStub });

      expect(wrapper.find('.ds-chip__icon--after').exists()).toBe(true);
      expect(wrapper.find('.ds-chip__icon--before').exists()).toBe(false);

      const html = wrapper.html();
      expect(html.indexOf('ds-chip__label')).toBeLessThan(html.indexOf('ds-chip__icon--after'));
    });

    it('renders both icons', () => {
      const wrapper = factory({ beforeIcon: IconStub, afterIcon: IconStub });

      expect(wrapper.findAll('.ds-chip__icon')).toHaveLength(2);
    });
  });
});
