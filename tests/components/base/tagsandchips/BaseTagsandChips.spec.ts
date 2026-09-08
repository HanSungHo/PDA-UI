import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import BaseTagsandChips from '~/components/base/tagsandchips/BaseTagsandChips.vue';

describe('BaseTagsandChips', () => {
  it('renders single tag label', () => {
    const wrapper = mount(BaseTagsandChips, {
      props: {
        label: 'Tag Name',
      },
    });

    expect(wrapper.text()).toContain('Tag Name');
  });

  it('renders two-value tag', () => {
    const wrapper = mount(BaseTagsandChips, {
      props: {
        type: 'two-value',
        label: 'Status',
        value: 'Active',
      },
    });

    expect(wrapper.text()).toContain('Status');
    expect(wrapper.text()).toContain('Active');
  });

  it('applies size class', () => {
    const wrapper = mount(BaseTagsandChips, {
      props: {
        label: 'Tag',
        size: 'xs',
      },
    });

    expect(wrapper.find('.ds-tag--xs').exists()).toBe(true);
  });

  it('applies shape class', () => {
    const wrapper = mount(BaseTagsandChips, {
      props: {
        label: 'Tag',
        shape: 'rounded',
      },
    });

    expect(wrapper.find('.ds-tag--rounded').exists()).toBe(true);
  });

  it('applies color class', () => {
    const wrapper = mount(BaseTagsandChips, {
      props: {
        label: 'Tag',
        color: 'blue',
      },
    });

    expect(wrapper.props('color')).toBe('blue');
  });

  it('applies bordered class', () => {
    const wrapper = mount(BaseTagsandChips, {
      props: {
        label: 'Tag',
        bordered: true,
      },
    });

    expect(wrapper.props('bordered')).toBe(true);
  });

  it('renders closable tag', () => {
    const wrapper = mount(BaseTagsandChips, {
      props: {
        label: 'Tag',
        closable: true,
      },
    });

    expect(wrapper.props('closable')).toBe(true);
  });

  it('emits close event', async () => {
    const wrapper = mount(BaseTagsandChips, {
      props: {
        label: 'Tag',
        closable: true,
      },
    });

    await wrapper.find('.ant-tag-close-icon').trigger('click');

    expect(wrapper.emitted('close')).toBeTruthy();
  });
});
