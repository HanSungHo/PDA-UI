import { enableAutoUnmount, mount } from '@vue/test-utils';
import { BaseScreen } from 'src/components/base';
import { afterEach, describe, expect, it } from 'vitest';

enableAutoUnmount(afterEach);

describe('BaseScreen footer', () => {
  it('renders the footer by default', () => {
    const wrapper = mount(BaseScreen);

    expect(wrapper.find('.ds-screen__footer').exists()).toBe(true);
  });

  it('omits the footer when showFooter is false', () => {
    const wrapper = mount(BaseScreen, { props: { showFooter: false } });

    expect(wrapper.find('.ds-screen__footer').exists()).toBe(false);
    expect(wrapper.find('.ds-screen__content').exists()).toBe(true);
  });
});
