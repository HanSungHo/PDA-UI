import { enableAutoUnmount, mount } from '@vue/test-utils';
import { BaseBadge } from 'src/components/base';
import { afterEach, describe, expect, it } from 'vitest';
import { h } from 'vue';

enableAutoUnmount(afterEach);

describe('BaseBadge', () => {
  it('renders label only', () => {
    const wrapper = mount(BaseBadge, { props: { label: 'GET' } });

    expect(wrapper.classes()).toContain('ds-badge');
    expect(wrapper.classes()).toContain('ds-badge--blue');
    expect(wrapper.text()).toBe('GET');
  });

  it('lets the default slot override the label prop', () => {
    const wrapper = mount(BaseBadge, {
      props: { label: 'Ignored' },
      slots: { default: 'POST' },
    });

    expect(wrapper.get('.ds-badge__label').text()).toBe('POST');
  });

  it('renders the icon slot before the text', () => {
    const wrapper = mount(BaseBadge, {
      props: { label: 'PATCH', color: 'cyan' },
      slots: {
        icon: () => h('i', { class: 'lead' }),
      },
    });

    expect(wrapper.find('.ds-badge__icon').exists()).toBe(true);
    expect(wrapper.find('.lead').exists()).toBe(true);
    expect(wrapper.element.firstElementChild?.classList.contains('ds-badge__icon')).toBe(true);
  });

  it('renders the suffix slot after the text', () => {
    const wrapper = mount(BaseBadge, {
      props: { label: 'PATCH', color: 'cyan', ariaLabel: 'Patch method' },
      slots: {
        suffix: () => h('i', { class: 'trail' }),
      },
    });

    expect(wrapper.attributes('aria-label')).toBe('Patch method');
    expect(wrapper.find('.trail').exists()).toBe(true);
    expect(wrapper.element.lastElementChild?.classList.contains('ds-badge__icon')).toBe(true);
  });
});
