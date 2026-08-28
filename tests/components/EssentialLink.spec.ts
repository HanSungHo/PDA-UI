import { mount } from '@vue/test-utils';
import EssentialLink from 'components/EssentialLink.vue';
import { describe, expect, it } from 'vitest';

describe('EssentialLink', () => {
  it('renders the provided external link content and icon', () => {
    const wrapper = mount(EssentialLink, {
      props: {
        caption: 'antdv.com',
        icon: 'book',
        label: 'Ant Design Vue',
        link: 'https://antdv.com',
      },
    });

    try {
      const anchor = wrapper.get('a');
      expect(anchor.attributes('href')).toBe('https://antdv.com');
      expect(anchor.attributes('target')).toBe('_blank');
      expect(wrapper.text()).toContain('Ant Design Vue');
      expect(wrapper.text()).toContain('antdv.com');
      expect(wrapper.get('.ant-avatar').text()).toBe('book');
    } finally {
      wrapper.unmount();
    }
  });

  it('uses safe defaults when optional props are omitted', () => {
    const wrapper = mount(EssentialLink, {
      props: { label: 'Fallback' },
    });

    try {
      expect(wrapper.get('a').attributes('href')).toBe('#');
      expect(wrapper.text()).toContain('Fallback');
      expect(wrapper.find('.ant-avatar').exists()).toBe(false);
    } finally {
      wrapper.unmount();
    }
  });
});
