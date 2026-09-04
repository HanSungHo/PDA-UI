import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import BaseAvatar from '../../src/components/base/avatar/BaseAvatar.vue';

describe('BaseAvatar', () => {
  it('renders image avatar', () => {
    const wrapper = mount(BaseAvatar, {
      props: {
        type: 'image',
        src: 'src/assets/boy.png',
        alt: 'Avatar',
      },
    });

    expect(wrapper.find('.ds-avatar__image').exists()).toBe(true);
  });

  it('render text avatar', () => {
    const wrapper = mount(BaseAvatar, {
      props: {
        type: 'text',
        text: 'NA',
      },
    });

    expect(wrapper.find('.ds-avatar__text-avatar ').exists()).toBe(true);
    expect(wrapper.text()).toContain('');
  });
});
