import { mount } from '@vue/test-utils';
import { BaseBreadcrumb } from 'src/components/base';
import { describe, expect, it } from 'vitest';
import { h } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';

const items = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Settings', to: '/settings' },
  { label: 'Profile' },
];

describe('BaseBreadcrumb', () => {
  const router = createRouter({ history: createMemoryHistory(), routes: [] });

  it('renders every item through Ant Design Breadcrumb', () => {
    const wrapper = mount(BaseBreadcrumb, { props: { items }, global: { plugins: [router] } });

    expect(wrapper.find('[aria-label="Breadcrumb"]').exists()).toBe(true);
    expect(wrapper.findAll('.ds-breadcrumb__label').map((item) => item.text())).toEqual([
      'Dashboard',
      'Settings',
      'Profile',
    ]);
    expect(wrapper.findAll('.ant-breadcrumb-separator')).toHaveLength(items.length + 1);
  });

  it('makes only the final item active and keeps previous links navigable', () => {
    const wrapper = mount(BaseBreadcrumb, { props: { items }, global: { plugins: [router] } });
    const links = wrapper.findAll('a');

    expect(links).toHaveLength(2);
    expect(links[0].attributes('href')).toBe('/dashboard');
    expect(links[1].attributes('href')).toBe('/settings');
    expect(wrapper.find('.ds-breadcrumb__item--current').text()).toContain('Profile');
    expect(wrapper.find('[aria-current="page"]').text()).toContain('Profile');
  });

  it('supports a custom separator and icon slot without hard-coded labels', () => {
    const wrapper = mount(BaseBreadcrumb, {
      props: { items: [{ label: 'Home' }, { label: 'Reports' }], separator: '>' },
      slots: { icon: ({ index }: { index: number }) => h('i', { class: `icon-${index}` }) },
    });

    expect(wrapper.findAll('.ant-breadcrumb-separator')).toHaveLength(3);
    expect(wrapper.find('.icon-0').exists()).toBe(true);
    expect(wrapper.find('.icon-1').exists()).toBe(true);
  });

  it('does not create a link for the active or disabled item', () => {
    const wrapper = mount(BaseBreadcrumb, {
      props: {
        items: [
          { label: 'Home', to: '/', disabled: true },
          { label: 'Current', to: '/current' },
        ],
      },
    });

    expect(wrapper.findAll('a')).toHaveLength(0);
    expect(wrapper.find('.ds-breadcrumb__item--disabled').exists()).toBe(true);
    expect(wrapper.find('[aria-disabled="true"]').exists()).toBe(true);
  });

  it('keeps only one current item when multiple items are marked active', () => {
    const wrapper = mount(BaseBreadcrumb, {
      props: {
        items: [
          { label: 'Home', active: true },
          { label: 'Reports', active: true },
        ],
      },
    });

    expect(wrapper.findAll('[aria-current="page"]')).toHaveLength(1);
    expect(wrapper.find('[aria-current="page"]').text()).toBe('Reports');
  });
});
