import { enableAutoUnmount, mount } from '@vue/test-utils';
import { BaseButton } from 'src/components/base';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { h } from 'vue';

enableAutoUnmount(afterEach);

describe('BaseButton', () => {
  describe('rendering and defaults', () => {
    it('renders a native button with the documented defaults', () => {
      const wrapper = mount(BaseButton, { props: { label: 'Save' } });

      expect(wrapper.element.tagName).toBe('BUTTON');
      expect(wrapper.attributes('type')).toBe('button');
      expect(wrapper.classes()).toContain('ds-btn--primary');
      expect(wrapper.classes()).toContain('ds-btn--medium');
      expect(wrapper.text()).toBe('Save');
    });

    it('lets the default slot win over the label prop', () => {
      const wrapper = mount(BaseButton, {
        props: { label: 'Ignored' },
        slots: { default: 'From slot' },
      });

      expect(wrapper.text()).toBe('From slot');
    });

    it('maps variant, size and layout props onto modifier classes', () => {
      const wrapper = mount(BaseButton, {
        props: { variant: 'neutro', size: 'xs', block: true, label: 'More' },
      });

      expect(wrapper.classes()).toEqual(
        expect.arrayContaining(['ds-btn--neutro', 'ds-btn--xs', 'ds-btn--block']),
      );
    });

    it('renders the icon and suffix slots around the label', () => {
      const wrapper = mount(BaseButton, {
        props: { label: 'Download' },
        slots: { icon: () => h('i', { class: 'lead' }), suffix: () => h('i', { class: 'trail' }) },
      });

      expect(wrapper.find('.ds-btn__icon .lead').exists()).toBe(true);
      expect(wrapper.find('.ds-btn__icon .trail').exists()).toBe(true);
      expect(wrapper.get('.ds-btn__label').text()).toBe('Download');
    });
  });

  describe('icon-only mode', () => {
    it('renders the default slot as the icon and drops the label element', () => {
      const wrapper = mount(BaseButton, {
        props: { iconOnly: true, ariaLabel: 'Edit' },
        slots: { default: () => h('i', { class: 'pencil' }) },
      });

      expect(wrapper.classes()).toContain('ds-btn--icon-only');
      expect(wrapper.find('.ds-btn__icon .pencil').exists()).toBe(true);
      expect(wrapper.find('.ds-btn__label').exists()).toBe(false);
      expect(wrapper.attributes('aria-label')).toBe('Edit');
    });

    it('omits the suffix slot, which has no room in a square control', () => {
      const wrapper = mount(BaseButton, {
        props: { iconOnly: true, ariaLabel: 'More' },
        slots: { default: () => h('i'), suffix: () => h('i', { class: 'trail' }) },
      });

      expect(wrapper.find('.trail').exists()).toBe(false);
    });
  });

  describe('anchor mode', () => {
    it('renders an anchor and adds rel only for a new tab', () => {
      const newTab = mount(BaseButton, {
        props: { href: 'https://example.com', target: '_blank', label: 'Docs' },
      });
      const sameTab = mount(BaseButton, { props: { href: '/docs', label: 'Docs' } });

      expect(newTab.element.tagName).toBe('A');
      expect(newTab.attributes('rel')).toBe('noopener noreferrer');
      expect(newTab.attributes('type')).toBeUndefined();
      expect(sameTab.attributes('rel')).toBeUndefined();
    });

    it('degrades a blocked link to a disabled button, since anchors cannot be disabled', () => {
      const wrapper = mount(BaseButton, {
        props: { href: 'https://example.com', disabled: true, label: 'Docs' },
      });

      expect(wrapper.element.tagName).toBe('BUTTON');
      expect(wrapper.attributes('disabled')).toBeDefined();
      expect(wrapper.attributes('href')).toBeUndefined();
    });
  });

  describe('blocked interaction', () => {
    it.each([
      ['disabled', { disabled: true }],
      ['loading', { loading: true }],
    ])('swallows clicks while %s', async (_state, props) => {
      const wrapper = mount(BaseButton, { props: { label: 'Save', ...props } });

      await wrapper.trigger('click');

      expect(wrapper.emitted('click')).toBeUndefined();
      expect(wrapper.classes()).toContain('ds-btn--disabled');
      expect(wrapper.attributes('disabled')).toBeDefined();
    });

    it('emits the native event while interactive', async () => {
      const wrapper = mount(BaseButton, { props: { label: 'Save' } });

      await wrapper.trigger('click');

      expect(wrapper.emitted('click')).toHaveLength(1);
    });

    it('replaces the icon with a spinner and marks the control busy while loading', () => {
      const wrapper = mount(BaseButton, {
        props: { label: 'Save', loading: true },
        slots: { icon: () => h('i', { class: 'lead' }) },
      });

      expect(wrapper.find('.ds-btn__spinner').exists()).toBe(true);
      expect(wrapper.find('.lead').exists()).toBe(false);
      expect(wrapper.attributes('aria-busy')).toBe('true');
    });
  });

  describe('keyboard and focus accessibility', () => {
    it.each([
      ['Enter', 'keydown'],
      ['Space', 'keyup'],
    ] as const)('preserves native %s activation', (key, eventType) => {
      const wrapper = mount(BaseButton, {
        attachTo: document.body,
        props: { label: 'Save' },
      });
      const keyboardEvent = new KeyboardEvent(eventType, {
        bubbles: true,
        cancelable: true,
        key: key === 'Space' ? ' ' : key,
      });

      expect(wrapper.element.dispatchEvent(keyboardEvent)).toBe(true);

      (wrapper.element as HTMLButtonElement).click();

      expect(wrapper.emitted('click')).toHaveLength(1);
    });

    it('supports native Tab focus and focus-visible behavior', () => {
      const onFocus = vi.fn();
      const wrapper = mount(BaseButton, {
        attachTo: document.body,
        attrs: { onFocus },
        props: { label: 'Save' },
      });
      const tabEvent = new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: 'Tab',
      });

      expect(wrapper.attributes('tabindex')).toBeUndefined();
      expect(wrapper.element.dispatchEvent(tabEvent)).toBe(true);

      (wrapper.element as HTMLElement).focus();

      expect(document.activeElement).toBe(wrapper.element);
      expect(onFocus).toHaveBeenCalledOnce();
      expect(wrapper.element.matches(':focus-visible')).toBe(true);
    });
  });
});
