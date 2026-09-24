import { enableAutoUnmount, mount } from '@vue/test-utils';
import { Tooltip as ATooltip } from 'ant-design-vue';
import { BaseTooltip, baseTooltipDefaults } from 'src/components/base/tooltip';
import { afterEach, describe, expect, it } from 'vitest';
import { h } from 'vue';

enableAutoUnmount(afterEach);

describe('BaseTooltip', () => {
  it('renders wrapped trigger content via default slot with default props', () => {
    const wrapper = mount(BaseTooltip, {
      slots: {
        default: () => h('button', { class: 'trigger-btn' }, 'Hover me'),
      },
    });

    const btn = wrapper.find('.trigger-btn');
    expect(btn.exists()).toBe(true);
    expect(btn.text()).toBe('Hover me');

    const tooltip = wrapper.findComponent(ATooltip);
    expect(tooltip.exists()).toBe(true);
    expect(tooltip.props('placement')).toBe('top');
    expect(tooltip.props('trigger')).toBe('click');
    expect(tooltip.props('arrow')).toBe(true);
    expect(tooltip.props('overlayClassName')).toBe('ds-tooltip');
  });

  it('passes title prop to ATooltip', () => {
    const wrapper = mount(BaseTooltip, {
      props: {
        title: 'Helpful information',
      },
      slots: {
        default: () => h('span', 'Target'),
      },
    });

    const tooltip = wrapper.findComponent(ATooltip);
    expect(tooltip.props('title')).toBe('Helpful information');
  });

  it('passes custom title slot to ATooltip when provided', () => {
    const wrapper = mount(BaseTooltip, {
      slots: {
        default: () => h('span', 'Target'),
        title: () => h('strong', { class: 'custom-title' }, 'Custom title text'),
      },
    });

    const tooltip = wrapper.findComponent(ATooltip);
    expect(tooltip.exists()).toBe(true);
    expect(tooltip.vm.$slots.title).toBeDefined();
    const renderedSlot = tooltip.vm.$slots.title!();
    expect(renderedSlot).toBeDefined();
  });

  it.each([
    ['bottom', 'click', false],
    ['right', 'focus', true],
    ['left', 'contextmenu', false],
    ['topLeft', 'hover', true],
    ['bottomRight', 'click', true],
  ] as const)(
    'supports custom placement="%s", trigger="%s", and arrow=%s',
    (placement, trigger, arrow) => {
      const wrapper = mount(BaseTooltip, {
        props: {
          placement,
          trigger,
          arrow,
        },
        slots: {
          default: () => h('span', 'Item'),
        },
      });

      const tooltip = wrapper.findComponent(ATooltip);
      expect(tooltip.props('placement')).toBe(placement);
      expect(tooltip.props('trigger')).toBe(trigger);
      expect(tooltip.props('arrow')).toBe(arrow);
    },
  );

  it('supports array of triggers for mobile/touch interactions', () => {
    const wrapper = mount(BaseTooltip, {
      props: {
        trigger: ['click', 'focus'],
      },
      slots: {
        default: () => h('button', 'Touch trigger'),
      },
    });

    const tooltip = wrapper.findComponent(ATooltip);
    expect(tooltip.props('trigger')).toEqual(['click', 'focus']);
  });

  it('exports baseTooltipDefaults correctly', () => {
    expect(baseTooltipDefaults).toEqual({
      arrow: true,
      placement: 'top',
      trigger: 'click',
    });
  });
});
