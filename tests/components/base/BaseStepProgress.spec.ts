import { enableAutoUnmount, mount } from '@vue/test-utils';
import {
  type BaseStepItem,
  BaseStepProgress,
  baseStepProgressDefaults,
} from 'src/components/base/step-progress';
import { afterEach, describe, expect, it } from 'vitest';
import { h } from 'vue';

enableAutoUnmount(afterEach);

describe('BaseStepProgress', () => {
  const sampleItems: BaseStepItem[] = [
    { label: 'Step 1', status: 'success' },
    { label: 'Step 2', status: 'loading' },
    { label: 'Step 3', status: 'pending' },
  ];

  it('renders with horizontal direction and correct accessibility roles by default', () => {
    const wrapper = mount(BaseStepProgress, {
      props: { items: sampleItems },
    });

    expect(wrapper.classes()).toContain('ds-step-progress');
    expect(wrapper.classes()).toContain('ds-step-progress--horizontal');
    expect(wrapper.attributes('role')).toBe('list');

    const nodes = wrapper.findAll('.ds-step-progress__node');
    expect(nodes).toHaveLength(3);
    nodes.forEach((node) => {
      expect(node.attributes('role')).toBe('listitem');
    });
  });

  it('renders connectors only between steps in horizontal direction', () => {
    const wrapper = mount(BaseStepProgress, {
      props: { items: sampleItems, direction: 'horizontal' },
    });

    const connectors = wrapper.findAll('.ds-step-progress__connector');
    expect(connectors).toHaveLength(2);

    const firstConnector = connectors[0];
    expect(firstConnector.findAll('.ds-step-progress__joint')).toHaveLength(2);
    expect(firstConnector.findAll('.ds-step-progress__line')).toHaveLength(1);
  });

  it('does not render connectors in vertical direction', () => {
    const wrapper = mount(BaseStepProgress, {
      props: { items: sampleItems, direction: 'vertical' },
    });

    expect(wrapper.classes()).toContain('ds-step-progress--vertical');
    expect(wrapper.findAll('.ds-step-progress__connector')).toHaveLength(0);
  });

  it('renders status pending by default when status is omitted', () => {
    const wrapper = mount(BaseStepProgress, {
      props: {
        items: [{ label: 'Default Pending Step' }],
      },
    });

    const node = wrapper.find('.ds-step-progress__node');
    expect(node.classes()).toContain('ds-step-progress__node--pending');
    expect(wrapper.find('.ds-step-progress__dot').exists()).toBe(true);
    expect(wrapper.find('.ds-step-progress__label').text()).toBe('Default Pending Step');
  });

  it('renders loading spinner when status is loading', () => {
    const wrapper = mount(BaseStepProgress, {
      props: {
        items: [{ label: 'In progress', status: 'loading' }],
      },
    });

    const node = wrapper.find('.ds-step-progress__node');
    expect(node.classes()).toContain('ds-step-progress__node--loading');

    const spinner = wrapper.find('svg.ds-step-progress__spinner');
    expect(spinner.exists()).toBe(true);
    expect(spinner.find('circle.ds-step-progress__spinner-track').exists()).toBe(true);
    expect(spinner.find('circle.ds-step-progress__spinner-indicator').exists()).toBe(true);
  });

  it('renders success icon when status is success', () => {
    const wrapper = mount(BaseStepProgress, {
      props: {
        items: [{ label: 'Done', status: 'success' }],
      },
    });

    const node = wrapper.find('.ds-step-progress__node');
    expect(node.classes()).toContain('ds-step-progress__node--success');

    const icon = wrapper.find('svg.ds-step-progress__icon');
    expect(icon.exists()).toBe(true);
    expect(icon.find('polyline').exists()).toBe(true);
  });

  it('renders warning icon when status is warning', () => {
    const wrapper = mount(BaseStepProgress, {
      props: {
        items: [{ label: 'Check needed', status: 'warning' }],
      },
    });

    const node = wrapper.find('.ds-step-progress__node');
    expect(node.classes()).toContain('ds-step-progress__node--warning');

    const icon = wrapper.find('svg.ds-step-progress__icon');
    expect(icon.exists()).toBe(true);
    expect(icon.find('path').exists()).toBe(true);
  });

  it('renders error icon when status is error', () => {
    const wrapper = mount(BaseStepProgress, {
      props: {
        items: [{ label: 'Failed', status: 'error' }],
      },
    });

    const node = wrapper.find('.ds-step-progress__node');
    expect(node.classes()).toContain('ds-step-progress__node--error');

    const icon = wrapper.find('svg.ds-step-progress__icon');
    expect(icon.exists()).toBe(true);
    expect(icon.find('circle').exists()).toBe(true);
  });

  it('supports custom scoped icon slot', () => {
    const wrapper = mount(BaseStepProgress, {
      props: { items: [{ label: 'Custom Icon Step', status: 'pending' }] },
      slots: {
        icon: (slotProps: { item: BaseStepItem; index: number }) =>
          h('span', { class: 'custom-badge' }, `Step #${slotProps.index + 1}`),
      },
    });

    expect(wrapper.find('.custom-badge').exists()).toBe(true);
    expect(wrapper.find('.custom-badge').text()).toBe('Step #1');
    expect(wrapper.find('.ds-step-progress__dot').exists()).toBe(false);
  });

  it('supports custom scoped label slot', () => {
    const wrapper = mount(BaseStepProgress, {
      props: { items: [{ label: 'Original Label', status: 'pending' }] },
      slots: {
        label: (slotProps: { item: BaseStepItem; index: number }) =>
          h('strong', { class: 'custom-label' }, `Prefix: ${slotProps.item.label}`),
      },
    });

    expect(wrapper.find('.custom-label').exists()).toBe(true);
    expect(wrapper.find('.custom-label').text()).toBe('Prefix: Original Label');
  });

  it('handles empty items array gracefully', () => {
    const wrapper = mount(BaseStepProgress, {
      props: { items: [] },
    });

    expect(wrapper.findAll('.ds-step-progress__node')).toHaveLength(0);
    expect(wrapper.findAll('.ds-step-progress__connector')).toHaveLength(0);
  });

  it('exports baseStepProgressDefaults correctly', () => {
    expect(baseStepProgressDefaults).toEqual({
      direction: 'horizontal',
    });
  });
});
