import { mount } from '@vue/test-utils';
import { QIcon } from 'quasar';
import { describe, expect, it } from 'vitest';

import EssentialLink from 'components/EssentialLink.vue';

describe('EssentialLink', () => {
  it('renders the provided external link content and icon', () => {
    const wrapper = mount(EssentialLink, {
      props: {
        caption: 'quasar.dev',
        icon: 'school',
        label: 'Docs',
        link: 'https://quasar.dev',
      },
    });

    try {
      const anchor = wrapper.get('a');
      expect(anchor.attributes('href')).toBe('https://quasar.dev');
      expect(anchor.attributes('target')).toBe('_blank');
      expect(wrapper.text()).toContain('Docs');
      expect(wrapper.text()).toContain('quasar.dev');
      expect(wrapper.getComponent(QIcon).props('name')).toBe('school');
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
      expect(wrapper.findComponent(QIcon).exists()).toBe(false);
    } finally {
      wrapper.unmount();
    }
  });
});
