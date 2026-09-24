import { enableAutoUnmount, mount } from '@vue/test-utils';
import { BaseLoading, baseLoadingDefaults } from 'src/components/base/loading';
import { afterEach, describe, expect, it } from 'vitest';

enableAutoUnmount(afterEach);

describe('BaseLoading', () => {
  it('renders with default medium size and accessible attributes', () => {
    const wrapper = mount(BaseLoading);

    expect(wrapper.element.tagName).toBe('SPAN');
    expect(wrapper.classes()).toContain('ds-loading');
    expect(wrapper.classes()).toContain('ds-loading--medium');
    expect(wrapper.attributes('role')).toBe('status');

    const svg = wrapper.find('svg.ds-loading__svg');
    expect(svg.exists()).toBe(true);
    expect(svg.attributes('viewBox')).toBe('0 0 32 32');
    expect(svg.attributes('aria-hidden')).toBe('true');

    expect(wrapper.find('circle.ds-loading__track').exists()).toBe(true);
    expect(wrapper.find('circle.ds-loading__indicator').exists()).toBe(true);
  });

  it.each([
    ['large', 'ds-loading--large'],
    ['medium', 'ds-loading--medium'],
    ['small', 'ds-loading--small'],
    ['xs', 'ds-loading--xs'],
  ] as const)('applies modifier class for size="%s"', (size, expectedClass) => {
    const wrapper = mount(BaseLoading, {
      props: { size },
    });

    expect(wrapper.classes()).toContain(expectedClass);
  });

  it('exports baseLoadingDefaults with medium size', () => {
    expect(baseLoadingDefaults).toEqual({
      size: 'medium',
    });
  });
});
