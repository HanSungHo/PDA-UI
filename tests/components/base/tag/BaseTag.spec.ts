import { UserOutlined } from '@ant-design/icons-vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import BaseTag from '~/components/base/tag/BaseTag.vue';

describe('BaseTag', () => {
  it('renders text correctly', () => {
    const wrapper = mount(BaseTag, {
      props: {
        text: 'Single',
        icon: UserOutlined,
      },
    });

    expect(wrapper.text()).toContain('Single');
  });

  it('renders icon', () => {
    const wrapper = mount(BaseTag, {
      props: {
        text: 'Single',
        icon: UserOutlined,
      },
    });

    expect(wrapper.findComponent(UserOutlined).exists()).toBe(true);
  });

  it('applies tag class', () => {
    const wrapper = mount(BaseTag, {
      props: {
        text: 'Single',
        icon: UserOutlined,
      },
    });

    expect(wrapper.find('.ds-tag').exists()).toBe(true);
  });
});
