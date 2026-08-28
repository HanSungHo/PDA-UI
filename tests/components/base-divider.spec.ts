import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';

import { BaseDivider as ExportedBaseDivider } from '../../src/components/base/divider';
import BaseDivider from '../../src/components/base/divider/BaseDivider.vue';

const ADividerStub = defineComponent({
  name: 'ADivider',
  inheritAttrs: false,
  props: {
    type: { type: String, required: true },
    orientation: { type: String, required: true },
    dashed: { type: Boolean, required: true },
    variant: { type: String, required: true },
    plain: { type: Boolean, required: true },
    role: { type: String, required: true },
    ariaOrientation: { type: String, required: true },
  },
  setup(props, { attrs, slots }) {
    return () =>
      h(
        'div',
        {
          ...attrs,
          class: ['divider-stub', attrs.class],
          'data-type': props.type,
          'data-orientation': props.orientation,
          'data-dashed': String(props.dashed),
          'data-variant': props.variant,
          'data-plain': String(props.plain),
          role: props.role,
          'aria-orientation': props.ariaOrientation,
        },
        slots.default?.(),
      );
  },
});

function factory(props: Record<string, unknown> = {}, slots: Record<string, () => string> = {}) {
  return mount(BaseDivider, {
    props,
    slots,
    global: { stubs: { ADivider: ADividerStub } },
  });
}

describe('BaseDivider', () => {
  it('exports the component through the design-system barrel', () => {
    expect(ExportedBaseDivider).toBe(BaseDivider);
  });

  it('uses the documented horizontal defaults', () => {
    const wrapper = factory();
    const divider = wrapper.get('.divider-stub');

    expect(divider.attributes()).toMatchObject({
      'data-type': 'horizontal',
      'data-orientation': 'center',
      'data-dashed': 'false',
      'data-variant': 'solid',
      'data-plain': 'false',
      role: 'separator',
      'aria-orientation': 'horizontal',
    });
  });

  it('renders horizontal slot content and forwards presentation attributes', () => {
    const wrapper = factory(
      { id: 'section-divider', class: 'custom-divider', 'data-testid': 'divider' },
      { default: () => 'Section title' },
    );

    expect(wrapper.get('.divider-stub').text()).toBe('Section title');
    expect(wrapper.get('.divider-stub').attributes('id')).toBe('section-divider');
    expect(wrapper.get('.divider-stub').attributes('data-testid')).toBe('divider');
    expect(wrapper.get('.divider-stub').classes()).toContain('custom-divider');
  });

  it.each([
    ['left', 'left'],
    ['center', 'center'],
    ['right', 'right'],
  ] as const)('forwards orientation="%s"', (orientation, expected) => {
    expect(factory({ orientation }).get('.divider-stub').attributes('data-orientation')).toBe(
      expected,
    );
  });

  it('does not render slot content on a vertical divider', () => {
    const wrapper = factory({ type: 'vertical' }, { default: () => 'ignored' });
    const divider = wrapper.get('.divider-stub');

    expect(divider.attributes('data-type')).toBe('vertical');
    expect(divider.text()).toBe('');
    expect(divider.attributes('aria-orientation')).toBe('vertical');
  });

  it('maps dashed=true to the dashed variant', () => {
    const divider = factory({ dashed: true }).get('.divider-stub');

    expect(divider.attributes('data-dashed')).toBe('true');
    expect(divider.attributes('data-variant')).toBe('dashed');
  });

  it.each(['solid', 'dashed', 'dotted'] as const)('forwards explicit variant="%s"', (variant) => {
    const divider = factory({ variant }).get('.divider-stub');
    expect(divider.attributes('data-variant')).toBe(variant);
  });

  it('lets an explicit variant override dashed=true', () => {
    const divider = factory({ dashed: true, variant: 'dotted' }).get('.divider-stub');

    expect(divider.attributes('data-dashed')).toBe('false');
    expect(divider.attributes('data-variant')).toBe('dotted');
  });

  it('forwards plain to the Ant divider contract', () => {
    expect(factory({ plain: true }).get('.divider-stub').attributes('data-plain')).toBe('true');
  });
});
